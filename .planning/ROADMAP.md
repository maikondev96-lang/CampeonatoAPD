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

### Phase 3: Configurações e Identidade Visual (IN PROGRESS 🏗️)
- **Goal:** Permitir que cada campeonato tenha sua própria "cara" (cores, regras, logo).
- **Requirements:**
  - [ ] Módulo `/admin/:slug/:year/settings` completo.
  - [ ] Customização de cores primárias via banco de dados (injetar CSS dinâmico).
  - [ ] Gestão de patrocinadores/anúncios do campeonato.

### Phase 4: Fluxo de Inscrição Profissional (PENDING ⏳)
- **Goal:** Link mágico para times se inscreverem sozinhos.
- **Requirements:**
  - [ ] Rota `/register/:token`.
  - [ ] Form de inscrição multi-etapa (Dados do Time -> Elenco).
  - [ ] Painel de Aprovação no Admin.

### Phase 5: Conteúdo Institucional "Max" (PENDING ⏳)
- **Goal:** Wow factor no site público.
- **Requirements:**
  - [ ] Página de Histórico da APD.
  - [ ] Galeria de Campeões histórica.
  - [ ] Listagem de todos os times filiados.
  - [ ] Feed de Notícias (Blog institucional).

---

## Summary Status

| Phase | Descrição | Status |
|-------|-----------|--------|
| 1 | Arquitetura Institucional | COMPLETED ✅ |
| 2 | Admin Hub e Contexto | COMPLETED ✅ |
| 3 | Configurações e Identidade | IN PROGRESS 🏗️ |
| 4 | Fluxo de Inscrição | PENDING ⏳ |
| 5 | Conteúdo Institucional | PENDING ⏳ |
