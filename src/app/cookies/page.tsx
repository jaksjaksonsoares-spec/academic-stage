import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Política de Cookies", alternates: { canonical: "/cookies" } };

export default function CookiesPage() {
  return (
    <LegalPage title="Política de Cookies" updated="2026-10">
      <p>
        Hoje usamos somente tecnologias essenciais ao funcionamento do site. Por isso não exibimos banner de consentimento. Se
        algum dia adotarmos cookies não essenciais (como medição de audiência), eles só serão ativados com a sua permissão.
      </p>
      <h2>O que guardamos no seu navegador</h2>
      <ul>
        <li><strong>Cookies de sessão do Supabase (sb-…)</strong> — mantêm você conectado com segurança. Essenciais. Expiram ao sair ou após o período de inatividade.</li>
        <li><strong>Preferência de tema (localStorage “theme”)</strong> — lembra se você escolheu o tema claro ou escuro. Fica só no seu navegador.</li>
      </ul>
      <h2>Como remover</h2>
      <p>Você pode apagar cookies e dados de sites nas configurações do navegador. Ao fazer isso, será desconectado.</p>
    </LegalPage>
  );
}
