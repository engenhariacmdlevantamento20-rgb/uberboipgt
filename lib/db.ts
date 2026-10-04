import { Pool } from "pg";

const g = globalThis as unknown as { pgPool?: Pool };

export const pool =
  g.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    ssl: process.env.DATABASE_URL?.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
  });

if (process.env.NODE_ENV !== "production") g.pgPool = pool;
