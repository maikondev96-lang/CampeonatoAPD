# ROADMAP — Copa APD v4.0 (Portal Institucional)

## Milestone 2: Portal Institucional & Admin Multi-Campeonato
**Goal:** Transformar o sistema em um portal profissional (tipo GE) com gestão isolada de múltiplos campeonatos e temporadas.

### Phase 1: Arquitetura Institucional e Global (COMPLETED ✅)
- **Status:** Entregue.
- **Entregas:**
  - Tabela `organizations` e vínculo com `competitions`.
  - `OrganizationContext` para gerenciar a identidade da APD.
  - Home Institucional (`/`) com visão geral da associação.
  - Roteamento dinâmico baseado em `slug` para competições públicas.

### Phase 2: Admin Hub e Isolamento Contextual (COMPLETED ✅)
- **Status:** Entregue.
- **Entregas:**
  - `/admin`: Hub Seletor de Campeonatos.
  - `AdminContext`: Trava o administrador no contexto de um campeonato/temporada.
  - `AdminLayout`: Sidebar e Header contextuais.
  - Refatoração de **Times** e **Jogos** para o modelo contextual.

### Phase 3: Configurações e Identidade Visual (COMPLETED ✅)
- **Goal:** Permitir que cada campeonato tenha sua própria "cara" (cores, regras, logo).
- **Entregas:**
  - [x] Módulo `/admin/:slug/:year/settings` completo.
  - [x] Injeção dinâmica de CSS (Primary Color) via banco de dados.
  - [x] Suporte a Logo e Banner customizados por campeonato.
  - [x] Gestão de patrocinadores (via configurações).

### Phase 4: Fluxo de Inscrição Profissional (COMPLETED ✅)
- **Goal:** Link mágico para times se inscreverem sozinhos.
- **Entregas:**
  - [x] Rota `/register/:token`.
  - [x] Form de inscrição multi-etapa (Dados do Time -> Elenco).
  - [x] Painel de Aprovação no Admin.
  - [x] Gestão de Magic Links no Admin.

### Phase 5: Mata-Mata & Conteúdo Institucional "Max" (COMPLETED ✅)
- **Goal:** Wow factor no site público e suporte total a fases eliminatórias.
- **Entregas:**
  - [x] Gerador de Chaveamento (Bracket) automático (Ligas e Grupos).
  - [x] Lógica de desempate por pênaltis integrada e visual.
  - [x] Página de Histórico da APD e Galeria de Campeões (Hall da Fama).
  - [x] Banner de Celebração de Campeão dinâmico.
  - [x] Feed de Notícias (Blog institucional) - Já implementado.

### Phase 6: Refinamento UX, Responsividade e CRUD Admin (COMPLETED ✅)
- **Status:** Entregue.
- **Entregas:**
  - Layout 100% responsivo (mobile-first, sem scroll horizontal indesejado).
  - ScrollToTop integrado (reset de scroll em mudanças de rota).
  - Validação de imagem via URL e Upload com feedback de erro (utilitário centralizado).
  - Schema de jogadores simplificado e unificado (Zod).
  - CRUD completo de jogadores no Admin (Editar/Excluir funcional).
  - Refatoração mobile da Home, Jogos e Detalhes da Partida.

### Phase 7: Sistema de Performance e Cache Inteligente (COMPLETED ✅)
- **Goal:** Implementar cache local com versionamento e invalidação via Admin para eliminar carregamentos desnecessários.
- **Entregas:**
  - [x] Tabela `app_metadata` no Supabase para controle de versões.
  - [x] Utilitário `smartCache.ts` com função `getSmartData`.
  - [x] Middleware/Helper de atualização de versão no Admin para cada escrita.
  - [x] Integração do cache nas páginas principais (Elencos, Jogadores, Notícias).
  - [x] Mecanismo SWR (Stale-While-Revalidate).

---

## Summary Status

| Phase | Descrição | Status |
|-------|-----------|--------|
| 1 | Arquitetura Institucional | COMPLETED ✅ |
| 2 | Admin Hub e Contexto | COMPLETED ✅ |
| 3 | Configurações e Identidade | COMPLETED ✅ |
| 4 | Fluxo de Inscrição | COMPLETED ✅ |
| 5 | Mata-Mata & Institucional | COMPLETED ✅ |
| 6 | Refinamento UX e CRUD Admin | COMPLETED ✅ |
| 7 | Performance e Cache Inteligente | COMPLETED ✅ |
