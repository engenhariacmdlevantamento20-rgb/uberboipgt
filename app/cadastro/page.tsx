"use client";
import { useState } from "react";

export default function Cadastro() {
  const [role, setRole] = useState<"producer" | "transporter" | null>(null);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    const f = new FormData(e.currentTarget);
    setEnviando(true);
    const r = await fetch("/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.get("name"), email: f.get("email"), phone: f.get("phone"),
        password: f.get("password"), role, consent: f.get("consent") === "on",
      }),
    });
    const j = await r.json().catch(() => ({}));
    setEnviando(false);
    if (r.ok) window.location.href = "/painel"; else setErro(j.error ?? "Erro ao cadastrar.");
  }

  return (
    <main>
      <span className="marca">UBER BOI PGT</span>
      <h1>Criar conta</h1>
      <form onSubmit={enviar}>
        <label>Você é</label>
        <div className="papeis">
          <button type="button" className="papel" aria-pressed={role === "producer"} onClick={() => setRole("producer")}>Produtor</button>
          <button type="button" className="papel" aria-pressed={role === "transporter"} onClick={() => setRole("transporter")}>Transportador</button>
        </div>
        <label htmlFor="name">Nome completo</label>
        <input id="name" name="name" autoComplete="name" required />
        <label htmlFor="phone">WhatsApp (com DDD)</label>
        <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(62) 99999-9999" required />
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <label htmlFor="password">Senha (mínimo 8 caracteres)</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        <label className="check">
          <input type="checkbox" name="consent" required />
          <span>Li e aceito os Termos de Uso e a Política de Privacidade (LGPD).</span>
        </label>
        {erro && <div className="aviso erro" role="alert">{erro}</div>}
        <button className="btn sol" type="submit" disabled={enviando || !role}>{enviando ? "Criando..." : "Criar conta e começar"}</button>
      </form>
      <a href="/entrar">Já tenho conta</a>
    </main>
  );
}
