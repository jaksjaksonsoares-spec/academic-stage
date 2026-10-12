# Roteiro e manutenção

Cada fase termina com a aplicação funcionando e o CI verde. Áreas futuras aparecem no site como "em construção", nunca como botões sem função. Para liberar uma área, troque `status` para `"disponivel"` em `src/lib/areas.ts` — ela passa a aparecer como disponível na navegação, na busca e no sitemap.

## Fase 2 — Ferramentas essenciais (concluída)
- **Concursos**: tabelas `concursos`, `concurso_cargos`, `concurso_verificacoes`; cadastro manual por editores; publicação exige verificação; situação calculada pelo banco (`situacao_concurso`) e busca em `buscar_concursos`.
- **Links úteis**: `links_uteis` + rota `/api/cron/verificar-links` agendada no `vercel.json`; um link só sai da lista após 3 falhas seguidas.
- **Planejamento, atividades e avaliações**: `turmas` e `documentos` (conteúdo em JSON validado por Zod); PDF por página de impressão, Word gerado no servidor.

## Fase 3 — Inteligência e personalização (concluída)
- Central de editais (`editais_analises`, bucket temporário `editais`), análise por palavras-chave e com IA com citações de página.
- Estudos (`planos_estudo`, `sessoes_estudo`), flashcards (`flashcards`), cotas de IA (`ia_uso`).
- Assistente via `/api/assistente` com streaming; documentos do tipo `texto`.

## Pendências levadas adiante
- Tabela oficial das habilidades da BNCC (código e texto) importada do documento do MEC.
- Imagens e tabelas em questões (Supabase Storage).
- Banco de questões com licença para simulados.

## Fase 4 — Atendimento e administração (concluída)
- `suporte_solicitacoes` + bucket privado `suporte`; envio via Resend com status real de cada e-mail.
- MFA (aal2) exigido no banco para `is_editor()` e `is_admin()`; `auditoria`, `erros_app`, `config_plataforma`, `notificacoes`.
- Rotinas: `/api/cron/verificar-links` e `/api/cron/notificacoes`; monitoramento em `/api/saude`.

## Fase 5 — Expansão (concluída)
- Organizações (`organizacoes`, `org_membros`, `org_convites`), `plano_efetivo()`, `interesse_planos`, limites em `config_plataforma` (`limites_ia`, `limites_planos`).
- Biblioteca (`recursos`, `recurso_denuncias`, `colecoes`, `colecao_itens`) com moderação garantida por gatilho no banco.
- Formação (`cursos`, publicação exige verificação). Inclusão sem tabela própria: modelos viram documentos do usuário.

## Próximos passos sugeridos
- Integrar um provedor de pagamento (webhook → plano do perfil ou da organização) quando houver preços e empresa constituída.
- Envio de arquivos na biblioteca (bucket privado + verificação de tipo e de direitos).
- Testes ponta a ponta com Playwright e auditoria de acessibilidade (axe) no CI.
- Importar a tabela oficial da BNCC; banco de questões licenciado para simulados.

## Rotina de manutenção
- **Diário**: olhar /admin (atendimentos abertos, concursos a verificar, links fora do ar, falhas) e /editor/biblioteca (materiais em revisão e denúncias).
- **Semanal**: revisar o resultado do `npm audit` no CI; aplicar atualizações de segurança do Next.js e do Supabase.
- **Mensal**: revisar cursos com inscrição encerrada em /editor/cursos; conferir backups do Supabase (o plano gratuito não tem backup diário — avaliar o plano pago antes de abrir ao público); rodar `select public.purge_old_security_events();` (falhas técnicas são limpas pela rotina de notificações) ou agendar com `pg_cron`.
- **A cada mudança de política**: subir a versão em `TERMS_VERSION` (`src/lib/form-state.ts`) e avisar os usuários.
- **Antes de publicar**: preencher os campos entre colchetes nas páginas legais e submetê-las a revisão jurídica.
