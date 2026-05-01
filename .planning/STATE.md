# STATE — Copa APD Platform

## Current Position
- **Milestone:** 2 — Painel Administrativo Avançado & Inscrições
- **Status:** PLANNING

## Completed Phases
*(Milestone 1 — Plataforma Multi-Torneio MVP — Finalizado)*
- DDL e Banco de Dados escalável.
- Camada de Dados, Contextos e Rotas.
- Refatoração total do Painel Admin (Fases Dinâmicas e Automação de Chaveamento).

*(Milestone 2 — Painel Administrativo Avançado & Inscrições)*
- **Fase 1: Banco de Dados:** Criadas tabelas `registration_links`, `registration_submissions`, `team_managers`, `approval_logs` e colunas de herança em `seasons` e `competitions`. Typescript Types atualizados.
- **Fase 2: Painel Super Admin:** Criada rota `/admin/competitions` com Wizard de 5 etapas para criar competições. O wizard suporta a herança de formato entre temporadas e gera um Link Mágico automático inserido na nova tabela `registration_links`. Atualizado o `Admin.tsx` com novos cards de navegação.
- **Fase 3: Fluxo do Presidente:** Criada rota pública `/register/:token` com o formulário Wizard de 3 etapas para os presidentes de clubes se inscreverem. O formulário obedece as obrigatoriedades dinâmicas configuradas no campeonato e envia os dados para `registration_submissions` com o status 'pending'.
- **Fase 4: Aprovação Administrativa:** Criada rota `/admin/approvals` com Kanban visual (Pendentes, Aprovados, Rejeitados). O Admin pode revisar a ficha da equipe. Ao clicar em "Aprovar", os times e os jogadores são injetados automaticamente e oficialmente no Banco de Dados nas tabelas originais da plataforma.
- **Fase 5: Perfis Públicos:** Criada rota `/time/:id` exibindo o perfil institucional completo da equipe, escudo e elenco oficial. Vinculado o nome dos times na Tabela de Classificação para acesso direto do torcedor.

## What's Next
**Milestone 2 Finalizado.** O sistema agora é uma plataforma profissional de gestão esportiva completa. Próximo passo sugerido: Implementação de Dashboard de Estatísticas Avançadas (Artilharia, Assists, Defesa) com gráficos e filtros por temporada.

---
*Last updated: 2026-04-30 — Milestone 2 Started*
