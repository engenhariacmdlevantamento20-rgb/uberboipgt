import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/entrar");
  return (
    <>
      <nav className="topo"><Link href="/painel">UBER BOI PGT · Início</Link></nav>
      {children}
    </>
  );
}
