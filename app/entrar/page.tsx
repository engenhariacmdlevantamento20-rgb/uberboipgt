"use client";
import { useState } from "react";

export default function Entrar() {
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    const f = new FormData(e.currentTarget);
    setEnviando(true);
    const r = await fetch("/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: f.get("email"), password: f.get("password") }),
    });
    const j = await r.json().catch(() => ({}));
    setEnviando(false);
    if (r.ok) window.location.href = "/painel"; else setErro(j.error ?? "Erro ao entrar.");
  }

  return (
    <main>
      <span className="marca">UBER BOI PGT</span>
      <h1>Entrar</h1>
      <form onSubmit={enviar}>
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <label htmlFor="password">Senha</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
        {erro && <div className="aviso erro" role="alert" style={{ marginTop: 16 }}>{erro}</div>}
        <button className="btn sol" type="submit" disabled={enviando} style={{ marginTop: 20 }}>{enviando ? "Entrando..." : "Entrar"}</button>
      </form>
      <a href="/cadastro">Criar conta</a>
    </main>
  );
}
