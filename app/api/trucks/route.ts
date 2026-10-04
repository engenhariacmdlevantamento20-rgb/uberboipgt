/* eslint-disable @typescript-eslint/no-explicit-any */
import { pool } from "@/lib/db";
import { route, requireUser, body, HttpError, num } from "@/lib/api";

export const GET = route(async () => {
  const u = await requireUser();
  const { rows } = await pool.query(
    "SELECT id, plate, brand, model, year, type, body_type, capacity_heads, compartments, notes FROM trucks WHERE owner_id=$1 AND active ORDER BY plate", [u.id]);
  return rows;
});

export const POST = route(async (req: Request) => {
  const u = await requireUser("transporter");
  const b = await body(req);
  const plate = String(b.plate ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (plate.length < 7) throw new HttpError(400, "Placa inválida.");
  const cap = num(b.capacity_heads, 1, 500, "Informe a capacidade em cabeças.");
  try {
    const r = await pool.query(
      `INSERT INTO trucks(owner_id,plate,brand,model,year,type,body_type,capacity_heads,compartments,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [u.id, plate, b.brand || null, b.model || null, b.year ? num(b.year, 1960, 2100, "Ano inválido.") : null,
       String(b.type || "truck"), b.body_type || null, cap, b.compartments ? num(b.compartments, 1, 10, "Compartimentos inválido.") : null, b.notes || null]);
    return { id: r.rows[0].id };
  } catch (e: any) {
    if (e.code === "23505") throw new HttpError(409, "Esta placa já está cadastrada.");
    throw e;
  }
});
