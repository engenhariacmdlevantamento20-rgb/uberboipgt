import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { verifyPassword, createSession, clientIp } from "@/lib/auth";

export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Dados inválidos." }, { status: 400 }); }
  const email = String(b.email ?? "").trim().toLowerCase();
  const password = String(b.password ?? "");
  const ip = clientIp(req);

  // Limite simples contra tentativa em massa: 8 falhas em 15 min por e-mail ou IP
  const f = await pool.query(
    `SELECT count(*)::int AS n FROM audit_logs
      WHERE action='login_failed' AND created_at > now() - interval '15 minutes'
        AND (meta->>'email'=$1 OR ip=$2)`, [email, ip]);
  if (f.rows[0].n >= 8) return NextResponse.json({ error: "Muitas tentativas. Aguarde 15 minutos." }, { status: 429 });

  const { rows } = await pool.query("SELECT id, password_hash, status FROM users WHERE email=$1", [email]);
  const u = rows[0];
  const ok = u && u.status === "active" && (await verifyPassword(password, u.password_hash));
  if (!ok) {
    await pool.query("INSERT INTO audit_logs(action, ip, meta) VALUES ('login_failed',$1,$2)", [ip, JSON.stringify({ email })]);
    return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
  }
  await createSession(u.id, req.headers.get("user-agent"));
  await pool.query("INSERT INTO audit_logs(user_id, action, ip) VALUES ($1,'login',$2)", [u.id, ip]);
  return NextResponse.json({ ok: true });
}
