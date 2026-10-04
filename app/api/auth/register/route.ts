import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { hashPassword, createSession, clientIp, normalizePhone } from "@/lib/auth";

const TERMS_VERSION = "2026-10-draft"; // troque ao publicar os termos reais

export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Dados inválidos." }, { status: 400 }); }

  const name = String(b.name ?? "").trim();
  const email = String(b.email ?? "").trim().toLowerCase();
  const phone = normalizePhone(String(b.phone ?? ""));
  const password = String(b.password ?? "");
  const role = b.role === "transporter" ? "transporter" : b.role === "producer" ? "producer" : null;

  if (name.length < 3) return NextResponse.json({ error: "Informe seu nome completo." }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
  if (!phone) return NextResponse.json({ error: "Informe o WhatsApp com DDD." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "A senha precisa ter pelo menos 8 caracteres." }, { status: 400 });
  if (!role) return NextResponse.json({ error: "Escolha se você é produtor ou transportador." }, { status: 400 });
  if (b.consent !== true) return NextResponse.json({ error: "É preciso aceitar os termos e a política de privacidade." }, { status: 400 });

  const ip = clientIp(req);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const dup = await client.query("SELECT 1 FROM users WHERE email=$1", [email]);
    if (dup.rowCount) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Este e-mail já tem cadastro. Use Entrar." }, { status: 409 }); }

    const hash = await hashPassword(password);
    const u = await client.query("INSERT INTO users(name,email,phone,password_hash) VALUES ($1,$2,$3,$4) RETURNING id", [name, email, phone, hash]);
    const userId: string = u.rows[0].id;
    await client.query("INSERT INTO user_roles(user_id, role) VALUES ($1,$2)", [userId, role]);
    await client.query("INSERT INTO consents(user_id,type,version,ip) VALUES ($1,'terms',$2,$3),($1,'privacy',$2,$3)", [userId, TERMS_VERSION, ip]);

    // Período gratuito: dias vêm de system_settings (configurável pelo admin)
    const s = await client.query("SELECT value FROM system_settings WHERE key='trial_days'");
    const days = Number(s.rows[0]?.value ?? 30);
    await client.query(
      "INSERT INTO subscriptions(user_id, status, trial_ends_at) VALUES ($1,'trial', now() + ($2 || ' days')::interval)",
      [userId, String(days)],
    );
    await client.query("INSERT INTO audit_logs(user_id, action, ip, meta) VALUES ($1,'register',$2,$3)", [userId, ip, JSON.stringify({ role })]);
    await client.query("COMMIT");
    await createSession(userId, req.headers.get("user-agent"));
    return NextResponse.json({ ok: true });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("register error", e);
    return NextResponse.json({ error: "Não foi possível criar a conta agora. Tente de novo." }, { status: 500 });
  } finally { client.release(); }
}
