import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";
import { AREAS } from "@/lib/areas";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  // Só entram páginas com conteúdo real. Áreas em construção ficam de fora até ficarem disponíveis.
  const pages = ["", "/cadastro", "/entrar", "/suporte", "/privacidade", "/termos", "/cookies", "/planos"];
  const areas = AREAS.filter((a) => a.status === "disponivel").map((a) => `/${a.slug}`);
  return [...pages, ...areas].map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.6 }));
}
