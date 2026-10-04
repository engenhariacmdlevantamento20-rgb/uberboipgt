import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "UBER BOI PGT",
  description: "Logística rural: conecte produtores e transportadores de gado.",
  manifest: "/manifest.webmanifest",
  icons: { apple: "/icons/apple-touch-icon.png", icon: "/icons/icon-192.png" },
  appleWebApp: { capable: true, title: "UBER BOI PGT", statusBarStyle: "default" },
};
export const viewport: Viewport = { themeColor: "#1E3B2A", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
