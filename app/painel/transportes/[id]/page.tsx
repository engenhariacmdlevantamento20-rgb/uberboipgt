"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useRef, useState, use } from "react";
import dynamic from "next/dynamic";
import { api, post, put, brl, km, hm, zap, dataBr } from "@/lib/client";
import { FLOW, STATUS_LABEL, CATEGORIES } from "@/lib/flow";
const MapView = dynamic(() => import("@/components/Map"), { ssr: false });

const CRITERIOS: Record<string, Record<string, string>> = {
  producer: { pontualidade: "Pontualidade", comunicacao: "Comunicação", veiculo: "Veículo", cuidado: "Cuidado com os animais", combinado: "Cumpriu o combinado" },
  transporter: { organizacao: "Organização", acesso: "Acesso à propriedade", embarque: "Condição do embarque", pontualidade: "Pontualidade", comunicacao: "Comunicação", combinado: "Cumpriu o combinado" },
};
const DOC_STATUS: Record<string, string> = { pending: "Pendente", sent: "Enviado", in_review: "Em análise", approved: "Aprovado", rejected: "Rejeitado", expired: "Expirado" };

export default function Transporte({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [t, setT] = useState<any>(null);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const wake = useRef<any>(null);

  const load = useCallback(async () => { const r = await api(`/api/transports/${id}`); if (r.ok) setT(r.data); else setErro(r.error ?? "Erro"); }, [id]);
  useEffect(() => { load(); }, [load]);

  // Produtor acompanha: atualiza a posição a cada 20 s enquanto o rastreamento está ativo
  useEffect(() => {
    if (!t || t.my_role !== "producer" || !t.tracking_active) return;
    const i = setInterval(load, 20000); return () => clearInterval(i);
  }, [t?.my_role, t?.tracking_active, load]); // eslint-disable-line react-hooks/exhaustive-deps

  // Transportador: envia a posição no intervalo configurado, só com rastreamento ativo e tela aberta
  useEffect(() => {
    if (!t || t.my_role !== "transporter" || !t.tracking_active) return;
    const send = () => navigator.geolocation.getCurrentPosition(
      (p) => post("/api/tracking/position", { transport_id: id, lat: p.coords.latitude, lng: p.coords.longitude, speed_kmh: p.coords.speed != null ? p.coords.speed * 3.6 : null }),
      () => setAviso("Não consegui pegar o GPS. Confira a permissão de localização."), { enableHighAccuracy: true, timeout: 20000 });
    send(); timer.current = setInterval(send, Math.max(15, t.tracking_interval) * 1000);
    (navigator as any).wakeLock?.request("screen").then((w: any) => (wake.current = w)).catch(() => {});
    return () => { if (timer.current) clearInterval(timer.current); wake.current?.release?.(); };
  }, [t?.my_role, t?.tracking_active, t?.tracking_interval, id]); // eslint-disable-line react-hooks/exhaustive-deps

  const pts = useMemo(() => !t ? [] : [
    { lat: t.o_lat, lng: t.o_lng, color: "#2F6B3F" }, { lat: t.d_lat, lng: t.d_lng, color: "#A32A1B" },
    ...(t.last_position ? [{ lat: t.last_position.lat, lng: t.last_position.lng, color: "#1E6FD9", title: "Caminhão" }] : []),
  ], [t]);

  if (!t) return <main>{erro ? <div className="aviso erro">{erro}</div> : <p>Carregando...</p>}</main>;

  const step = FLOW[t.status];
  const canStep = step && (step.who === "both" || t.my_role === "transporter");
  const ativo = !["completed", "cancelled"].includes(t.status);

  async function avancar(to: string) { setErro(""); const r = await put(`/api/transports/${id}/status`, { status: to }); if (!r.ok) setErro(r.error ?? "Erro"); load(); }
  async function cancelar() { const reason = prompt("Motivo do cancelamento (opcional):"); if (reason === null) return; await put(`/api/transports/${id}/status`, { status: "cancelled", reason }); load(); }
  async function rastrear(on: boolean) {
    setAviso("");
    if (on) {
      if (!confirm("Compartilhar sua localização com o produtor enquanto este transporte estiver ativo?")) return;
      // pede a permissão de GPS agora, com um toque do usuário
      await new Promise<void>((res) => navigator.geolocation.getCurrentPosition(() => res(), () => { setAviso("Sem permissão de localização."); res(); }));
    }
    const r = await post(`/api/tracking/${on ? "start" : "stop"}`, { transport_id: id }); if (!r.ok) setErro(r.error ?? "Erro"); load();
  }
  async function enviarDoc(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErro("");
    const f = new FormData(e.currentTarget); f.set("transport_id", id);
    const r = await api("/api/documents", { method: "POST", body: f });
    if (!r.ok) return setErro(r.error ?? "Erro ao enviar."); (e.target as HTMLFormElement).reset(); load();
  }
  async function statusDoc(did: string, status: string) { await put(`/api/documents/${did}`, { status }); load(); }
  async function avaliar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    const scores: Record<string, number> = {}; Object.keys(CRITERIOS[t.my_role]).forEach((k) => (scores[k] = Number(f.get(k))));
    const r = await post("/api/ratings", { transport_id: id, overall: Number(f.get("overall")), scores, comment: f.get("comment") });
    if (!r.ok) setErro(r.error ?? "Erro"); load();
  }

  const nota = (name: string) => <select name={name} defaultValue="5">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}</select>;

  return (
    <main className="larga">
      <h1>{t.origin_name} → {t.dest_name}</h1>
      <p><span className="tag sol">{STATUS_LABEL[t.status]}</span>{t.tracking_active && <span className="tag">Rastreamento ligado</span>}</p>
      <p>{t.animals.map((a: any) => `${a.quantity} ${CATEGORIES[a.category]}`).join(", ")} · {dataBr(t.pickup_date)} · {brl(t.price_cents)}</p>
      <MapView points={pts} line={t.coordinates} height={300} />
      <div className="resumo"><div><b>{km(t.distance_m)}</b>total</div><div><b>{hm(t.duration_s)}</b>estimado</div><div><b>{km(t.unpaved_m)}</b>de terra</div></div>
      {t.last_position && <p className="pequeno">Última posição: {new Date(t.last_position.recorded_at).toLocaleTimeString("pt-BR")}</p>}
      {erro && <div className="aviso erro" role="alert">{erro}</div>}{aviso && <div className="aviso">{aviso}</div>}

      {ativo && canStep && <button className="btn sol" onClick={() => avancar(step.to)}>{step.label}</button>}
      {ativo && t.my_role === "transporter" && (t.tracking_active
        ? <button className="btn sec" onClick={() => rastrear(false)}>Parar rastreamento</button>
        : <button className="btn sec" onClick={() => rastrear(true)}>Iniciar rastreamento</button>)}
      {t.my_role === "transporter" && t.tracking_active && <p className="pequeno">Mantenha o app aberto e a tela ligada. No iPhone, o envio pode parar com a tela bloqueada.</p>}

      <h2>{t.my_role === "producer" ? "Transportador" : "Produtor"}</h2>
      <div className="item"><b>{t.other.name}</b>{t.plate && t.my_role === "producer" && <span className="pequeno">{t.truck_type} {t.model} · {t.plate}</span>}
        {t.other.phone && <p><a className="btn sec peq" href={zap(t.other.phone)}>Chamar no WhatsApp</a></p>}</div>

      <h2>Documentos</h2>
      {t.documents.map((d: any) => (
        <div key={d.id} className="item"><b>{d.kind} {d.number}</b><span className="tag">{DOC_STATUS[d.status]}</span><span className="pequeno">{d.valid_until ? `válido até ${dataBr(d.valid_until)}` : ""}</span>
          <p><a className="btn sec peq" href={`/api/documents/${d.id}`} target="_blank" rel="noreferrer">Abrir</a>
            {d.uploader_id !== t.my_id && ["sent", "in_review"].includes(d.status) && <><button className="btn peq" onClick={() => statusDoc(d.id, "approved")}>Aprovar</button><button className="btn sec peq" onClick={() => statusDoc(d.id, "rejected")}>Rejeitar</button></>}</p></div>
      ))}
      {t.documents.length === 0 && <p className="pequeno">Nenhum documento enviado.</p>}
      {ativo && (
        <form onSubmit={enviarDoc}>
          <label>Tipo (GTA, Nota Fiscal, documento do veículo...)</label><input name="kind" required />
          <div className="linha2"><div><label>Número</label><input name="number" /></div><div><label>Validade</label><input name="valid_until" type="date" /></div></div>
          <label>Arquivo (PDF, JPG ou PNG, até 5 MB)</label><input name="file" type="file" accept="application/pdf,image/jpeg,image/png" capture="environment" required />
          <button className="btn" type="submit" style={{ marginTop: 14 }}>Enviar documento</button>
        </form>
      )}

      <h2>Andamento</h2>
      {t.events.map((e: any, i: number) => <p key={i} className="pequeno">{new Date(e.created_at).toLocaleString("pt-BR")} — {STATUS_LABEL[e.status]}</p>)}
      {ativo && <button className="btn sec" onClick={cancelar}>Cancelar transporte</button>}

      {t.status === "completed" && (
        <>
          <h2>Avaliação</h2>
          {t.my_rating ? <p>Você avaliou com {t.my_rating.overall} ★.</p> : (
            <form onSubmit={avaliar}>
              {Object.entries(CRITERIOS[t.my_role]).map(([k, n]) => <div key={k} className="linha2" style={{ marginBottom: 8 }}><span>{n}</span>{nota(k)}</div>)}
              <div className="linha2"><b>Nota geral</b>{nota("overall")}</div>
              <label>Comentário</label><textarea name="comment" />
              <button className="btn sol" type="submit" style={{ marginTop: 14 }}>Enviar avaliação</button>
            </form>
          )}
          {t.other_rating && <p className="pequeno">A outra parte avaliou você com {t.other_rating.overall} ★.</p>}
        </>
      )}
    </main>
  );
}
