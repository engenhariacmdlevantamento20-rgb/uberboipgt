"use client";
import { useEffect, useState } from "react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type Modo = "carregando" | "instalado" | "navegador-interno" | "ios" | "android" | "outro";

export default function InstallButton() {
  const [modo, setModo] = useState<Modo>("carregando");
  const [evento, setEvento] = useState<BIPEvent | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
    const interno = /Instagram|FBAN|FBAV|FB_IAB|WhatsApp|Line\/|TikTok|musical_ly/i.test(ua);
    const ios = /iPhone|iPad|iPod/i.test(ua);
    const android = /Android/i.test(ua);
    setModo(standalone ? "instalado" : interno ? "navegador-interno" : ios ? "ios" : android ? "android" : "outro");

    const antes = (e: Event) => { e.preventDefault(); setEvento(e as BIPEvent); };
    const depois = () => setModo("instalado");
    window.addEventListener("beforeinstallprompt", antes);
    window.addEventListener("appinstalled", depois);
    return () => { window.removeEventListener("beforeinstallprompt", antes); window.removeEventListener("appinstalled", depois); };
  }, []);

  async function instalar() {
    if (!evento) return;
    await evento.prompt();
    await evento.userChoice;
    setEvento(null);
  }

  if (modo === "carregando") return null;
  if (modo === "instalado") return <a className="btn" href="/painel">Abrir o UBER BOI PGT</a>;

  if (modo === "navegador-interno") {
    return (
      <div className="aviso">
        <b>Abra no navegador para instalar.</b>
        <p style={{ margin: "6px 0 0" }}>Toque nos 3 pontinhos (ou no ícone de compartilhar) e escolha <b>Abrir no navegador</b> (Chrome ou Safari).</p>
      </div>
    );
  }

  if (modo === "ios") {
    return (
      <div>
        <h2>Instalar no iPhone</h2>
        <ol className="passos">
          <li>Abra esta página no <b>Safari</b>.</li>
          <li>Toque no ícone de compartilhar (quadrado com seta).</li>
          <li>Toque em <b>Adicionar à Tela de Início</b>.</li>
          <li>Toque em <b>Adicionar</b>.</li>
        </ol>
      </div>
    );
  }

  if (modo === "android") {
    return evento ? (
      <button className="btn sol" onClick={instalar}>Instalar no meu celular</button>
    ) : (
      <div className="aviso">
        Para instalar: abra o menu do Chrome (3 pontinhos) e toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.
      </div>
    );
  }
  return <p className="pequeno">No computador, use o botão de instalar na barra de endereço do navegador, ou entre direto pelo site.</p>;
}
