import { pool } from "@/lib/db";
import { route, requireUser } from "@/lib/api";

export const GET = route(async () => {
  await requireUser("admin");
  const q = async (sql: string) => Number((await pool.query(sql)).rows[0].n);
  const settings = (await pool.query("SELECT key, value FROM system_settings ORDER BY key")).rows;
  return {
    users: await q("SELECT count(*)::int n FROM users"),
    producers: await q("SELECT count(*)::int n FROM user_roles WHERE role='producer'"),
    transporters: await q("SELECT count(*)::int n FROM user_roles WHERE role='transporter'"),
    trucks: await q("SELECT count(*)::int n FROM trucks WHERE active"),
    farms: await q("SELECT count(*)::int n FROM farms"),
    requests_open: await q("SELECT count(*)::int n FROM transport_requests WHERE status='published'"),
    transports_active: await q("SELECT count(*)::int n FROM transports WHERE status NOT IN ('completed','cancelled')"),
    transports_done: await q("SELECT count(*)::int n FROM transports WHERE status='completed'"),
    transports_cancelled: await q("SELECT count(*)::int n FROM transports WHERE status='cancelled'"),
    ratings: await q("SELECT count(*)::int n FROM ratings"),
    in_trial: await q("SELECT count(*)::int n FROM subscriptions WHERE status='trial' AND trial_ends_at > now()"),
    settings,
  };
});
