import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import SairButton from "./SairButton";
import AddRole from "./AddRole";

export const dynamic = "force-dynamic";

const PRODUTOR: [string, string][] = [
  ["Novo transporte", "/painel/transportes/novo"], ["Meus transportes", "/painel/transportes"],
  ["Minhas fazendas", "/painel/fazendas"], ["Histórico e documentos", "/painel/transportes"],
];
const TRANSPORTADOR: [string, string][] = [
  ["Oportunidades", "/painel/oportunidades"], ["Meus transportes", "/painel/transportes"],
  ["Meus caminhões", "/painel/caminhoes"], ["Rastrear e documentos", "/painel/transportes"],
];

export default async function Painel() {
  const user = (await getSessionUser())!;
  const isP = user.roles.includes("producer"), isT = user.roles.includes("transporter");
  let faixa = "";
  if (user.subStatus === "trial" && user.trialEndsAt) {
    const dias = Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / 86400_000);
    faixa = dias > 0 ? `Seu teste grátis termina em ${dias} ${dias === 1 ? "dia" : "dias"}.` : "Seu teste grátis terminou.";
  }
  const grade = (t: [string, string][]) => (
    <div className="grade">{t.map(([n, h]) => <Link key={n} href={h} className="tile">{n}</Link>)}</div>
  );
  return (
    <main>
      <h1>Olá, {user.name.split(" ")[0]}</h1>
      {faixa && <div className="faixa"><b>{faixa}</b></div>}
      {isP && <><h2>Produtor</h2>{grade(PRODUTOR)}</>}
      {isT && <><h2>Transportador</h2>{grade(TRANSPORTADOR)}</>}
      {user.roles.includes("admin") && <><h2>Administração</h2>{grade([["Painel admin", "/painel/admin"]])}</>}
      <h2>Conta</h2>
      <p className="pequeno">{user.email}</p>
      {(!isP || !isT) && <AddRole role={isP ? "transporter" : "producer"} />}
      <SairButton />
    </main>
  );
}
