import { pool } from "@/lib/db";
import { route, requireUser, body, HttpError, num, audit } from "@/lib/api";

const EDITABLE = ["trial_days", "tracking_interval_seconds"];

export const PUT = route(async (req: Request) => {
  const u = await requireUser("admin");
  const b = await body(req);
  if (!EDITABLE.includes(b.key)) throw new HttpError(400, "Configuração não editável.");
  const v = num(b.value, 1, 3650, "Valor inválido.");
  await pool.query("UPDATE system_settings SET value=$2::jsonb, updated_at=now() WHERE key=$1", [b.key, JSON.stringify(v)]);
  await audit(u.id, "setting_changed", { key: b.key, value: v });
  return { ok: true };
});
