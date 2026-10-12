import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { TERMS_VERSION } from "@/lib/form-state";

export const metadata: Metadata = { title: "Termos de Uso", alternates: { canonical: "/termos" } };

export default function TermosPage() {
  return (
    <LegalPage title="Termos de Uso" updated={TERMS_VERSION}>
      <h2>1. O serviço</h2>
      <p>
        O AcademiC Stage, mantido por [NOME/RAZÃO SOCIAL], oferece ferramentas e informações para profissionais da educação. Algumas
        áreas ainda estão em construção e são identificadas como tal no site.
      </p>

      <h2>2. Conta</h2>
      <ul>
        <li>Você é responsável por manter sua senha em sigilo e pelas ações feitas na sua conta.</li>
        <li>As informações do cadastro devem ser verdadeiras.</li>
        <li>Você pode excluir sua conta a qualquer momento em <Link href="/painel/conta">Conta e privacidade</Link>.</li>
      </ul>

      <h2>3. Informações sobre concursos e cursos</h2>
      <p>
        Reunimos informações de fontes oficiais e indicamos a fonte e a data da última verificação. O edital oficial e a
        instituição responsável prevalecem sempre. Confira prazos e requisitos na fonte antes de tomar decisões — não nos
        responsabilizamos por alterações feitas pelo órgão após a nossa verificação.
      </p>

      <h2>4. Conteúdo gerado por inteligência artificial</h2>
      <p>
        Quando disponível, o conteúdo gerado por IA será identificado. Ele é uma sugestão de apoio ao trabalho docente, pode conter
        erros e deve ser revisado por você. Não constitui aconselhamento jurídico, nem substitui profissionais especializados.
      </p>

      <h2>5. Uso adequado</h2>
      <ul>
        <li>Não envie dados pessoais identificáveis de estudantes, especialmente de crianças e adolescentes.</li>
        <li>Não tente acessar áreas ou dados de outros usuários, nem sobrecarregar o serviço.</li>
        <li>Não publique material protegido por direitos autorais sem autorização.</li>
      </ul>

      <h2>6. Planos</h2>
      <p>
        No momento, o uso é gratuito. Se planos pagos forem criados, preços, limites e condições de cancelamento serão informados
        antes de qualquer cobrança, e nada será cobrado sem a sua contratação expressa.
      </p>

      <h2>7. Alterações e contato</h2>
      <p>
        Estes termos podem mudar; avisaremos antes de mudanças relevantes. Dúvidas: <Link href="/suporte">suporte</Link>. Foro:
        [COMARCA], respeitado o direito do consumidor de litigar em seu domicílio.
      </p>
    </LegalPage>
  );
}
