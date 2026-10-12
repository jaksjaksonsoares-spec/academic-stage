import type { Metadata } from "next";
import { requireAdmin } from "@/lib/session";
import { AdminNav } from "./nav";

export const metadata: Metadata = { title: "Administração", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[220px_1fr] lg:py-14">
      <AdminNav />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
