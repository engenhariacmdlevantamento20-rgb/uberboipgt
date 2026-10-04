"use client";
export default function SairButton() {
  return (
    <button className="btn sec" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/"; }}>
      Sair
    </button>
  );
}
