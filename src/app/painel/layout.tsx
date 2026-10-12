import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { PainelNav } from "./nav";

export const metadata: Metadata = { title: "Meu painel", robots: { index: false, follow: false } };

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="painel-grid mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[220px_1fr] lg:py-14">
      <PainelNav />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
