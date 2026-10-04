// Executa as migrações em db/migrations em ordem, uma vez cada.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) { console.error("Defina DATABASE_URL (veja .env.example)."); process.exit(1); }
const client = new pg.Client({ connectionString: url });
await client.connect();
await client.query("CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
const dir = path.join(process.cwd(), "db", "migrations");
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
  const done = await client.query("SELECT 1 FROM _migrations WHERE name=$1", [f]);
  if (done.rowCount) { console.log("já aplicada:", f); continue; }
  await client.query("BEGIN");
  try {
    await client.query(fs.readFileSync(path.join(dir, f), "utf8"));
    await client.query("INSERT INTO _migrations(name) VALUES ($1)", [f]);
    await client.query("COMMIT");
    console.log("aplicada:", f);
  } catch (e) { await client.query("ROLLBACK"); console.error("erro em", f, e.message); process.exit(1); }
}
await client.end();
