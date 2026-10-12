import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Política de Privacidade", alternates: { canonical: "/privacidade" } };

export default function PrivacidadePage() {
  return (
    <LegalPage title="Política de Privacidade" updated="2026-10">
      <p>
        Esta política explica quais dados pessoais o AcademiC Stage trata, por quê, com base em qual fundamento da Lei nº 13.709/2018
        (LGPD) e como você exerce seus direitos.
      </p>

      <h2>Quem é o controlador</h2>
      <p>
        [NOME COMPLETO OU RAZÃO SOCIAL], [CPF/CNPJ], [ENDEREÇO]. Encarregado pelo tratamento de dados (DPO): [NOME], contato pelo
        canal de <Link href="/suporte">suporte</Link>, categoria “Privacidade e proteção de dados”.
      </p>

      <h2>Quais dados tratamos e por quê</h2>
      <ul>
        <li><strong>E-mail e senha</strong> — para criar e proteger sua conta. A senha é guardada apenas como hash pelo provedor de autenticação. Base legal: execução de contrato (art. 7º, V).</li>
        <li><strong>Nome de exibição</strong> — para personalizar a interface. Base legal: execução de contrato.</li>
        <li><strong>Perfil opcional</strong> (etapas de ensino, componentes, estado, municípios, objetivos e interesses) — para priorizar conteúdos relevantes para você. Você pode deixar em branco ou apagar a qualquer momento. Base legal: execução de contrato, a seu pedido.</li>
        <li><strong>Preferências de notificação</strong> — para enviar só o que você escolheu. Base legal: execução de contrato.</li>
        <li><strong>Registros de segurança</strong> (tipo de evento e horário, como “entrada na conta”) — para prevenir fraudes e mostrar a você a atividade da conta. Não registramos endereço IP nesses registros. Base legal: legítimo interesse em segurança (art. 7º, IX) e cumprimento do Marco Civil da Internet quanto a registros de acesso, quando aplicável.</li>
        <li><strong>Registro de aceite dos Termos</strong> (versão e data) — para comprovar a aceitação. Base legal: exercício regular de direitos (art. 7º, VI).</li>
      </ul>

      <h2>O que não fazemos</h2>
      <ul>
        <li>Não vendemos dados pessoais.</li>
        <li>Não usamos seu perfil para publicidade, nem dados sensíveis para personalização.</li>
        <li>Não pedimos dados de estudantes. Ferramentas de inclusão trabalham com barreiras observadas e recursos disponíveis, não com diagnósticos ou identificação de crianças.</li>
      </ul>

      <h2>Com quem compartilhamos</h2>
      <p>
        Com operadores que viabilizam o serviço: [Supabase — banco de dados e autenticação, região [REGIÃO]] e [Vercel — hospedagem].
        Esses fornecedores podem tratar dados fora do Brasil, com as salvaguardas do art. 33 da LGPD. Quando o envio de e-mails e o
        assistente de IA forem ativados, esta lista será atualizada antes de qualquer dado ser compartilhado com eles.
      </p>

      <h2>Por quanto tempo guardamos</h2>
      <ul>
        <li>Dados da conta: enquanto ela existir. Ao excluir a conta, os dados são apagados imediatamente do banco principal; cópias de segurança são sobrescritas em até [PRAZO DE BACKUP] dias.</li>
        <li>Registros de segurança: até 180 dias.</li>
      </ul>

      <h2>Seus direitos</h2>
      <p>
        Você pode, a qualquer momento: confirmar e acessar seus dados, corrigi-los (em <Link href="/painel/perfil">Perfil</Link>),
        baixá-los em formato portável e excluir a conta (em <Link href="/painel/conta">Conta e privacidade</Link>). Para outros
        pedidos — como informação sobre compartilhamento ou revisão de decisões automatizadas — use o canal de suporte. Você também
        pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
      </p>

      <h2>Cookies</h2>
      <p>Usamos apenas cookies essenciais. Detalhes na <Link href="/cookies">Política de Cookies</Link>.</p>

      <h2>Segurança</h2>
      <p>
        Conexão sempre criptografada (HTTPS), controle de acesso por usuário no próprio banco de dados, limitação de tentativas de
        login e cabeçalhos de segurança no navegador. Em caso de incidente com risco relevante, comunicaremos você e a ANPD.
      </p>

      <h2>Mudanças nesta política</h2>
      <p>Alterações relevantes serão avisadas no painel e por e-mail, se você tiver habilitado, antes de entrarem em vigor.</p>
    </LegalPage>
  );
}
