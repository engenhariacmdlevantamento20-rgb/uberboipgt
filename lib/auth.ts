import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { pool } from "./db";

const COOKIE = "ubp_session";
const SESSION_DAYS = 30;

function scryptAsync(pw: string, salt: Buffer): Promise<Buffer> {
  return new Promise((res, rej) => scrypt(pw, salt, 64, (e, k) => (e ? rej(e) : res(k))));
}

export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  const key = await scryptAsync(pw, salt);
  return `s1$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(pw: string, stored: string) {
  const [v, saltHex, keyHex] = stored.split("$");
  if (v !== "s1" || !saltHex || !keyHex) return false;
  const key = await scryptAsync(pw, Buffer.from(saltHex, "hex"));
  const expected = Buffer.from(keyHex, "hex");
  return key.length === expected.length && timingSafeEqual(key, expected);
}

const sha = (t: string) => createHash("sha256").update(t).digest("hex");

export async function createSession(userId: string, userAgent: string | null) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await pool.query(
    "INSERT INTO sessions(user_id, token_hash, user_agent, expires_at) VALUES ($1,$2,$3,$4)",
    [userId, sha(token), userAgent?.slice(0, 300) ?? null, expires],
  );
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", expires,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await pool.query("DELETE FROM sessions WHERE token_hash=$1", [sha(token)]);
  jar.delete(COOKIE);
}

export type SessionUser = {
  id: string; name: string; email: string; phone: string; roles: string[];
  trialEndsAt: Date | null; subStatus: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.phone,
            COALESCE(ARRAY(SELECT role FROM user_roles r WHERE r.user_id=u.id), '{}') AS roles,
            (SELECT trial_ends_at FROM subscriptions s WHERE s.user_id=u.id ORDER BY created_at DESC LIMIT 1) AS trial_ends_at,
            (SELECT status FROM subscriptions s WHERE s.user_id=u.id ORDER BY created_at DESC LIMIT 1) AS sub_status
       FROM sessions se JOIN users u ON u.id=se.user_id
      WHERE se.token_hash=$1 AND se.expires_at>now() AND u.status='active'`,
    [sha(token)],
  );
  const r = rows[0];
  if (!r) return null;
  return { id: r.id, name: r.name, email: r.email, phone: r.phone, roles: r.roles,
           trialEndsAt: r.trial_ends_at, subStatus: r.sub_status };
}

export function clientIp(req: Request) {
  return req.headers.get("x-nf-client-connection-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

/** Normaliza telefone brasileiro para só dígitos com DDI 55. Retorna null se inválido. */
export function normalizePhone(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return /^55\d{10,11}$/.test(d) ? d : null;
}
