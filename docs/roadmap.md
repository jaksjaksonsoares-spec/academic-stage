# Roteiro e manutenção

Cada fase termina com a aplicação funcionando e o CI verde. Áreas futuras aparecem no site como "em construção", nunca como botões sem função. Para liberar uma área, troque `status` para `"disponivel"` em `src/lib/areas.ts` — ela passa a aparecer como disponível na navegação, na busca e no sitemap.

## Fase 2 — Ferramentas essenciais (concluída)
- **Concursos**: tabelas `concursos`, `concurso_cargos`, `concurso_verificacoes`; cadastro manual por editores; publicação exige verificação; situação calculada pelo banco (`situacao_concurso`) e busca em `buscar_concursos`.
- **Links úteis**: `links_uteis` + rota `/api/cron/verificar-links` agendada no `vercel.json`; um link só sai da lista após 3 falhas seguidas.
- **Planejamento, atividades e avaliações**: `turmas` e `documentos` (conteúdo em JSON validado por Zod); PDF por página de impressão, Word gerado no servidor.

## Fase 3 — Inteligência e personalização
- Assistente de IA via rota no servidor (chave em variável de ambiente), com marcação de conteúdo gerado e fontes.
- Leitura de editais em PDF com referência às páginas, revisão manual e "Transformar em plano de estudos".
- Cronogramas, revisões espaçadas, flashcards e histórico de desempenho.
- Tabela oficial das habilidades da BNCC (código e texto), importada do documento do MEC, para buscar e inserir habilidades sem copiar e colar.
- Imagens e tabelas em questões, com armazenamento privado no Supabase Storage.

## Fase 4 — Atendimento e administração
- Formulário de suporte com protocolo, anexos verificados (tipo e tamanho, bucket privado), e-mail ao admin e confirmação ao usuário via Resend — só exibe "enviado" com confirmação do provedor.
- Painel administrativo com MFA obrigatório, trilha de auditoria e confirmação de ações destrutivas.
- Monitoramento de erros (Sentry) e disponibilidade.

## Fase 5 — Expansão
- Biblioteca colaborativa com licença por item, formação continuada, núcleo de inclusão, planos profissional e institucional com provedor de pagamento.

## Rotina de manutenção
- **Semanal**: revisar o resultado do `npm audit` no CI; aplicar atualizações de segurança do Next.js e do Supabase.
- **Mensal**: conferir backups do Supabase (o plano gratuito não tem backup diário — avaliar o plano pago antes de abrir ao público); rodar `select public.purge_old_security_events();` ou agendá-lo com `pg_cron`.
- **A cada mudança de política**: subir a versão em `TERMS_VERSION` (`src/lib/form-state.ts`) e avisar os usuários.
- **Antes de publicar**: preencher os campos entre colchetes nas páginas legais e submetê-las a revisão jurídica.
