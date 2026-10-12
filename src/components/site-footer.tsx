import Link from "next/link";
import { AREAS } from "@/lib/areas";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="stage mt-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="max-w-sm space-y-4">
          <Logo inverted />
          <p className="text-[#a3afcc]">
            Oportunidades, ferramentas pedagógicas e desenvolvimento profissional para quem trabalha com educação no Brasil.
          </p>
        </div>

        <nav aria-label="Ferramentas">
          <h2 className="mb-3 font-bold text-white">Ferramentas</h2>
          <ul className="space-y-2 text-[#a3afcc]">
            {AREAS.slice(0, 6).map((a) => (
              <li key={a.slug}>
                <Link href={`/${a.slug}`} className="hover:text-white">{a.short}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Recursos">
          <h2 className="mb-3 font-bold text-white">Recursos</h2>
          <ul className="space-y-2 text-[#a3afcc]">
            {AREAS.slice(6).map((a) => (
              <li key={a.slug}>
                <Link href={`/${a.slug}`} className="hover:text-white">{a.short}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Institucional">
          <h2 className="mb-3 font-bold text-white">Institucional</h2>
          <ul className="space-y-2 text-[#a3afcc]">
            <li><Link href="/suporte" className="hover:text-white">Suporte</Link></li>
            <li><Link href="/privacidade" className="hover:text-white">Política de Privacidade</Link></li>
            <li><Link href="/termos" className="hover:text-white">Termos de Uso</Link></li>
            <li><Link href="/cookies" className="hover:text-white">Política de Cookies</Link></li>
            <li><Link href="/painel/conta" className="hover:text-white">Seus dados (LGPD)</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-6 text-sm text-[#a3afcc] sm:px-6">
          © {new Date().getFullYear()} AcademiC Stage. Informações sobre concursos sempre com link para a fonte oficial.
        </p>
      </div>
    </footer>
  );
}
