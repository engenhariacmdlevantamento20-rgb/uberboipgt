"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { api, put } from "@/lib/client";

const L: Record<string, string> = {
  users: "Usuários", producers: "Produtores", transporters: "Transportadores", trucks: "Caminhões", farms: "Fazendas",
  requests_open: "Solicitações abertas", transports_active: "Transportes ativos", transports_done: "Concluídos",
  transports_cancelled: "Cancelados", ratings: "Avaliações", in_trial: "Em período grátis",
};
const SET: Record<string, string> = { trial_days: "Dias de teste grátis", tracking_interval_seconds: "Intervalo do rastreamento (segundos)" };

export default function Admin() {
  const [s, setS] = useState<any>(null);
  const [erro, setErro] = useState("");
  const load = () => api("/api/admin/stats").then((r) => (r.ok ? setS(r.data) : setErro(r.error ?? "Sem permissão.")));
  useEffect(() => { load(); }, []);
  async function salvar(e: React.FormEvent<HTMLFormElement>, key: string) {
    e.preventDefault(); const v = new FormData(e.currentTarget).get("v");
    const r = await put("/api/admin/settings", { key, value: Number(v) }); if (!r.ok) setErro(r.error ?? "Erro"); else load();
  }
  if (!s) return <main>{erro ? <div className="aviso erro">{erro}</div> : <p>Carregando...</p>}</main>;
  return (
    <main className="larga">
      <h1>Administração</h1>
      <div className="grade">{Object.keys(L).map((k) => <div key={k} className="tile"><span><b style={{ fontSize: "1.6rem" }}>{s[k]}</b><small>{L[k]}</small></span></div>)}</div>
      <h2>Configurações</h2>
      {erro && <div className="aviso erro">{erro}</div>}
      {s.settings.filter((x: any) => SET[x.key]).map((x: any) => (
        <form key={x.key} onSubmit={(e) => salvar(e, x.key)}>
          <label>{SET[x.key]}</label><div className="linha2"><input name="v" type="number" defaultValue={Number(x.value)} /><button className="btn" type="submit">Salvar</button></div>
        </form>
      ))}
      <p className="pequeno">Planos, preços e regras de documentos serão editáveis aqui na Fase 3.</p>
    </main>
  );
}
