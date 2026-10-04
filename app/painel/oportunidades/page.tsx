"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { api, post, brl, km, hm, zap, dataBr, gps } from "@/lib/client";
import { CATEGORIES } from "@/lib/flow";

export default function Oportunidades() {
  const [list, setList] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [raio, setRaio] = useState("");
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");

  async function load(q = "") { const r = await api(`/api/requests${q}`); if (r.ok) setList(r.data); }
  useEffect(() => { load(); api("/api/trucks").then((r) => r.ok && setTrucks(r.data)); }, []);

  async function filtrar() {
    setErro("");
    if (!raio) return load();
    try { const g = await gps(); load(`?lat=${g.lat}&lng=${g.lng}&km=${raio}`); } catch (e: any) { setErro(e.message); }
  }
  async function enviar(e: React.FormEvent<HTMLFormElement>, rid: string) {
    e.preventDefault(); setErro(""); setMsg("");
    const f = new FormData(e.currentTarget);
    const r = await post("/api/quotes", { request_id: rid, truck_id: f.get("truck") || null, price: Number(String(f.get("price")).replace(",", ".")), eta_note: f.get("eta"), note: f.get("note") });
    if (!r.ok) return setErro(r.error ?? "Erro ao enviar.");
    setMsg("Proposta enviada."); setOpen(null); load();
  }

  return (
    <main className="larga">
      <h1>Oportunidades</h1>
      <div className="linha2">
        <select aria-label="Distância da minha posição" value={raio} onChange={(e) => setRaio(e.target.value)}>
          <option value="">Todas as regiões</option><option value="50">Até 50 km de mim</option><option value="100">Até 100 km de mim</option><option value="200">Até 200 km de mim</option>
        </select>
        <button className="btn sec" onClick={filtrar}>Filtrar</button>
      </div>
      {msg && <div className="aviso">{msg}</div>}{erro && <div className="aviso erro" role="alert">{erro}</div>}
      {list.length === 0 && <p>Nenhuma carga publicada no momento.</p>}
      {list.map((r) => (
        <div key={r.id} className="item">
          <b>{r.origin_name} → {r.dest_name}</b>
          {r.urgent && <span className="tag sol">Urgente</span>}<span className="tag">{dataBr(r.pickup_date)}</span>
          <p style={{ margin: "8px 0" }}>{(r.animals ?? []).map((a: any) => `${a.quantity} ${CATEGORIES[a.category]}`).join(", ")}</p>
          {r.distance_m && <p className="pequeno">{km(r.distance_m)} ({km(r.paved_m)} asfalto, {km(r.unpaved_m)} terra) · {hm(r.duration_s)}</p>}
          <p className="pequeno">{r.producer_name}{r.producer_rating ? ` · ★ ${r.producer_rating}` : ""}</p>
          {r.notes && <p className="pequeno">{r.notes}</p>}
          {r.producer_phone && <a className="btn sec peq" href={zap(r.producer_phone, "Olá! Vi sua carga no UBER BOI PGT.")}>WhatsApp</a>}
          <button className="btn peq" onClick={() => setOpen(open === r.id ? null : r.id)}>{r.my_quote_cents ? `Minha proposta: ${brl(r.my_quote_cents)}` : "Enviar proposta"}</button>
          {open === r.id && (
            <form onSubmit={(e) => enviar(e, r.id)}>
              <label>Valor do frete (R$)</label><input name="price" inputMode="decimal" required />
              <label>Caminhão</label>
              <select name="truck"><option value="">Escolher depois</option>{trucks.map((t) => <option key={t.id} value={t.id}>{t.plate} · {t.capacity_heads} cabeças</option>)}</select>
              <label>Quando posso ir</label><input name="eta" placeholder="ex.: sexta de manhã" />
              <label>Observação</label><input name="note" />
              <button className="btn sol" type="submit" style={{ marginTop: 14 }}>Enviar proposta</button>
            </form>
          )}
        </div>
      ))}
    </main>
  );
}
