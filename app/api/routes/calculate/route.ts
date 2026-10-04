import { route, requireUser, body, HttpError, lat, lng } from "@/lib/api";

// OpenRouteService: perfis driving-hgv/driving-car, extra_info "surface" (códigos documentados pela ORS).
const PAVED = new Set([1, 3, 4, 5, 6, 7, 14]);
const UNKNOWN = new Set([0]);

function hav(a: number[], b: number[]) {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (b[1] - a[1]) * r, dLng = (b[0] - a[0]) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

async function ors(profile: string, coords: number[][], key: string) {
  return fetch(`https://api.openrouteservice.org/v2/directions/${profile}/geojson`, {
    method: "POST",
    headers: { Authorization: key, "Content-Type": "application/json" },
    body: JSON.stringify({ coordinates: coords, extra_info: ["surface"], instructions: false, radiuses: coords.map(() => -1) }),
  });
}

export const POST = route(async (req: Request) => {
  await requireUser();
  const key = process.env.ORS_API_KEY;
  if (!key) throw new HttpError(503, "Cálculo de rota não configurado (falta ORS_API_KEY).");
  const b = await body(req);
  const pts: number[][] = (Array.isArray(b.points) ? b.points : []).map((p: number[]) => [lng(p[0]), lat(p[1])]);
  if (pts.length < 2 || pts.length > 20) throw new HttpError(400, "Informe origem, destino e até 18 pontos intermediários.");

  let profile = "driving-hgv";
  let res = await ors(profile, pts, key);
  if (!res.ok) { profile = "driving-car"; res = await ors(profile, pts, key); }
  if (!res.ok) throw new HttpError(502, "Não foi possível calcular a rota. Tente mover os pontos para perto de uma estrada.");

  const data = await res.json();
  const f = data.features?.[0];
  const coords: number[][] = f?.geometry?.coordinates ?? [];
  if (!coords.length) throw new HttpError(502, "Rota não encontrada.");
  const cum = [0];
  for (let i = 1; i < coords.length; i++) cum.push(cum[i - 1] + hav(coords[i - 1], coords[i]));

  let paved = 0, unpaved = 0, unknown = 0;
  const vals: number[][] = f.properties?.extras?.surface?.values ?? [];
  for (const [from, to, code] of vals) {
    const d = cum[Math.min(to, coords.length - 1)] - cum[from];
    if (PAVED.has(code)) paved += d; else if (UNKNOWN.has(code)) unknown += d; else unpaved += d;
  }
  const sum = f.properties.summary;
  return {
    distance_m: Math.round(sum.distance), duration_s: Math.round(sum.duration),
    paved_m: Math.round(paved), unpaved_m: Math.round(unpaved), unknown_m: vals.length ? Math.round(unknown) : Math.round(sum.distance),
    coordinates: coords.map((c) => [c[0], c[1]]), waypoints: pts, is_custom: pts.length > 2, profile,
  };
});
