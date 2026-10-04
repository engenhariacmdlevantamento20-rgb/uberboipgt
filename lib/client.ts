/* eslint-disable @typescript-eslint/no-explicit-any */
export async function api<T = any>(url: string, init?: RequestInit): Promise<{ ok: boolean; data: T; error?: string }> {
  try {
    const r = await fetch(url, init);
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, data: data as T, error: (data as any)?.error };
  } catch {
    return { ok: false, data: {} as T, error: "Sem conexão. Verifique a internet e tente de novo." };
  }
}
export const post = (url: string, body: unknown) => api(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
export const put = (url: string, body: unknown) => api(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
export const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const km = (m: number) => `${Math.round(m / 1000)} km`;
export const hm = (s: number) => `${Math.floor(s / 3600)}h${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}`;
export const zap = (phone: string, text = "") => `https://wa.me/${phone}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
export const dataBr = (d?: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—");
export function gps(): Promise<{ lat: number; lng: number }> {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error("Seu aparelho não tem GPS."));
    navigator.geolocation.getCurrentPosition((p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }), () => rej(new Error("Permita o acesso à localização para usar o GPS.")), { enableHighAccuracy: true, timeout: 20000 });
  });
}
