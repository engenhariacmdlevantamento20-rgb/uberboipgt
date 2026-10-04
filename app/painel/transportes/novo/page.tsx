"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { api, post, gps, km, hm } from "@/lib/client";
import { CATEGORIES } from "@/lib/flow";
const MapView = dynamic(() => import("@/components/Map"), { ssr: false });

type P = { lat: number; lng: number };
type Mode = "origin" | "dest" | "via" | null;

export default function NovoTransporte() {
  const [farms, setFarms] = useState<any[]>([]);
  const [origin, setOrigin] = useState<(P & { name: string; farm_id?: string }) | null>(null);
  const [dest, setDest] = useState<(P & { name: string; kind: string }) | null>(null);
  const [destName, setDestName] = useState(""); const [destKind, setDestKind] = useState("frigorifico");
  const [vias, setVias] = useState<P[]>([]);
  const [mode, setMode] = useState<Mode>(null);
  const [rota, setRota] = useState<any>(null);
  const [calc, setCalc] = useState(false);
  const [animals, setAnimals] = useState([{ category: "boi", quantity: 10, weight: "" }]);
  const [erro, setErro] = useState("");

  useEffect(() => { api("/api/farms").then((r) => r.ok && setFarms(r.data)); }, []);

  const opcoes = useMemo(() => farms.flatMap((f) => [
    { label: `${f.name} — sede`, name: f.name, lat: f.lat, lng: f.lng, farm_id: f.id },
    ...f.points.map((p: any) => ({ label: `${f.name} — ${p.name}`, name: `${f.name} (${p.name})`, lat: p.lat, lng: p.lng, farm_id: f.id })),
  ]), [farms]);

  const itens = useMemo(() => {
    const l: { key: string; i?: number; p: P; color: string }[] = [];
    if (origin) l.push({ key: "origin", p: origin, color: "#2F6B3F" });
    vias.forEach((v, i) => l.push({ key: "via", i, p: v, color: "#E07B00" }));
    if (dest) l.push({ key: "dest", p: dest, color: "#A32A1B" });
    return l;
  }, [origin, vias, dest]);
  const mapPts = useMemo(() => itens.map((x) => ({ ...x.p, color: x.color, draggable: true })), [itens]);

  const invalida = () => setRota(null);
  function onClick(lng: number, lat: number) {
    invalida();
    if (mode === "origin") setOrigin({ lat, lng, name: "Local marcado no mapa" });
    else if (mode === "dest") setDest({ lat, lng, name: destName || "Destino", kind: destKind });
    else if (mode === "via") setVias((v) => [...v, { lat, lng }]);
    setMode(null);
  }
  function onDrag(idx: number, lng: number, lat: number) {
    invalida();
    const it = itens[idx];
    if (it.key === "origin") setOrigin((o) => o && { ...o, lat, lng });
    else if (it.key === "dest") setDest((d) => d && { ...d, lat, lng });
    else setVias((v) => v.map((x, j) => (j === it.i ? { lat, lng } : x)));
  }

  async function calcular() {
    setErro("");
    if (!origin || !dest) return setErro("Escolha a origem e o destino.");
    setCalc(true);
    const r = await post("/api/routes/calculate", { points: [origin, ...vias, dest].map((p) => [p.lng, p.lat]) });
    setCalc(false);
    if (!r.ok) return setErro(r.error ?? "Erro ao calcular a rota.");
    setRota(r.data);
  }

  async function publicar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErro("");
    if (!origin || !dest || !rota) return setErro("Calcule a rota antes de publicar.");
    const f = new FormData(e.currentTarget);
    const r = await post("/api/requests", {
      origin, dest: { ...dest, name: destName || dest.name, kind: destKind }, route: rota,
      animals: animals.map((a) => ({ category: a.category, quantity: Number(a.quantity), weight: a.weight ? Number(a.weight) : null })),
      date: f.get("date") || null, time: f.get("time") || null, urgent: f.get("urgent") === "on", flexible: f.get("flexible") === "on", notes: f.get("notes"),
    });
    if (!r.ok) return setErro(r.error ?? "Erro ao publicar.");
    window.location.href = `/painel/solicitacoes/${r.data.id}`;
  }

  return (
    <main className="larga">
      <h1>Novo transporte</h1>
      <h2>1. Origem</h2>
      <select aria-label="Origem" onChange={(e) => { invalida(); const o = opcoes[Number(e.target.value)]; if (o) setOrigin(o); }} defaultValue="">
        <option value="" disabled>Escolher fazenda ou ponto de embarque</option>
        {opcoes.map((o, i) => <option key={i} value={i}>{o.label}</option>)}
      </select>
      <div style={{ marginTop: 10 }}>
        <button type="button" className="btn sec peq" onClick={() => setMode("origin")}>Marcar no mapa</button>
        <button type="button" className="btn sec peq" onClick={async () => { try { const g = await gps(); invalida(); setOrigin({ ...g, name: "Minha posição" }); } catch (e: any) { setErro(e.message); } }}>Minha posição</button>
      </div>
      {origin && <p className="pequeno">Origem: {origin.name}</p>}

      <h2>2. Destino</h2>
      <div className="linha2">
        <div><label htmlFor="dn">Nome do destino</label><input id="dn" value={destName} onChange={(e) => setDestName(e.target.value)} placeholder="ex.: Frigorífico X" /></div>
        <div><label htmlFor="dk">Tipo</label><select id="dk" value={destKind} onChange={(e) => setDestKind(e.target.value)}><option value="frigorifico">Frigorífico</option><option value="leilao">Leilão</option><option value="fazenda">Fazenda</option><option value="outro">Outro</option></select></div>
      </div>
      <button type="button" className="btn sec peq" style={{ marginTop: 10 }} onClick={() => setMode("dest")}>Marcar destino no mapa</button>

      <h2>3. Rota</h2>
      <p className="pequeno">{mode ? `Toque no mapa para marcar: ${mode === "origin" ? "origem" : mode === "dest" ? "destino" : "ponto intermediário"}.` : "Arraste os pontos para ajustar. Adicione pontos intermediários para forçar a rota por outra estrada."}</p>
      <MapView points={mapPts} line={rota?.coordinates} onMapClick={onClick} onDrag={onDrag} height={380} />
      <div style={{ marginTop: 10 }}>
        <button type="button" className="btn sec peq" onClick={() => setMode("via")}>+ Ponto intermediário</button>
        {vias.length > 0 && <button type="button" className="btn sec peq" onClick={() => { setVias([]); invalida(); }}>Limpar pontos</button>}
        <button type="button" className="btn peq" disabled={calc} onClick={calcular}>{calc ? "Calculando..." : rota ? "Recalcular rota" : "Calcular rota"}</button>
      </div>
      {rota && (
        <>
          <div className="resumo"><div><b>{km(rota.distance_m)}</b>total</div><div><b>{hm(rota.duration_s)}</b>tempo estimado</div><div><b>{rota.is_custom ? "Ajustada" : "Sugerida"}</b>rota</div></div>
          <div className="resumo"><div><b>{km(rota.paved_m)}</b>asfalto</div><div><b>{km(rota.unpaved_m)}</b>terra</div><div><b>{km(rota.unknown_m)}</b>sem informação</div></div>
          <p className="pequeno">Asfalto e terra vêm dos dados do OpenStreetMap, que no interior podem estar incompletos. “Sem informação” é o trecho sem dado de pavimento. Confira com quem conhece a estrada.</p>
        </>
      )}

      <form onSubmit={publicar}>
        <h2>4. Animais</h2>
        {animals.map((a, i) => (
          <div key={i} className="linha2" style={{ marginBottom: 10 }}>
            <select aria-label="Categoria" value={a.category} onChange={(e) => setAnimals(animals.map((x, j) => (j === i ? { ...x, category: e.target.value } : x)))}>
              {Object.entries(CATEGORIES).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
            </select>
            <input aria-label="Quantidade" type="number" inputMode="numeric" min={1} value={a.quantity} onChange={(e) => setAnimals(animals.map((x, j) => (j === i ? { ...x, quantity: Number(e.target.value) } : x)))} />
          </div>
        ))}
        <button type="button" className="btn sec peq" onClick={() => setAnimals([...animals, { category: "vaca", quantity: 1, weight: "" }])}>+ Outra categoria</button>
        {animals.length > 1 && <button type="button" className="btn sec peq" onClick={() => setAnimals(animals.slice(0, -1))}>Remover última</button>}

        <h2>5. Data</h2>
        <div className="linha2"><div><label htmlFor="date">Data</label><input id="date" name="date" type="date" /></div><div><label htmlFor="time">Horário</label><input id="time" name="time" type="time" /></div></div>
        <label className="check"><input type="checkbox" name="urgent" /><span>É urgente</span></label>
        <label className="check"><input type="checkbox" name="flexible" /><span>Posso mudar a data se precisar</span></label>
        <label htmlFor="notes">Observações (curral, acesso, porteira...)</label><textarea id="notes" name="notes" />
        {erro && <div className="aviso erro" role="alert" style={{ marginTop: 14 }}>{erro}</div>}
        <button className="btn sol" type="submit" disabled={!rota} style={{ marginTop: 16 }}>Publicar transporte</button>
      </form>
    </main>
  );
}
