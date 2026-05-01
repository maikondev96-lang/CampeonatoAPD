# PROJECT — Plataforma Oficial Digital de Campeonatos APD

## What This Is

Uma plataforma web profissional para gestão, exibição, histórico e valorização institucional de campeonatos esportivos amadores. Não é um simples gerador de tabelas — é um **portal oficial digital** com identidade visual, histórico permanente multi-temporada e experiência semelhante a grandes portais esportivos (Flashscore, SofaScore).

## Core Value

**Memória institucional + Engajamento.** Enquanto plataformas simples apenas organizam partidas, esta solução cria um acervo permanente que:
- Valoriza jogadores (artilharia, assists, perfil)
- Engaja torcida e familiares (resultados, classificação, histórico)
- Profissionaliza a organização (multi-torneio, multi-temporada)
- Cresce sem refatoração estrutural (arquitetura escalável)

## Target Users

| Perfil | Acessa para |
|--------|------------|
| **Jogador** | Consultar artilharia, acompanhar classificação, comparar desempenho, compartilhar resultados |
| **Torcida/Familiares** | Consultar tabela, acompanhar rodadas, ver resultados |
| **Presidente/Gestor** | Acessar link mágico, gerenciar elenco, aprovar inscrição e fotos |
| **Organização (Admin)** | Lançar partidas, controlar estatísticas, criar torneios, gerenciar acessos e inscrições |

## Context

### Estado Atual (v3 — Multi-Tournament Platform)
- React 19 + Vite 8 + TypeScript 6
- Supabase (PostgreSQL + Auth) como backend
- 10 tabelas totalmente migradas e dinâmicas (competitions, seasons, stages, etc)
- Zero hardcode de fases e chaves geradas por automação (automation.ts)
- Context API gerencia o `SeasonContext`

### Alvo (v4 — Plataforma de Gestão Profissional)
A nova arquitetura adiciona o fluxo de gestão externa:
```
Torneio → Links Mágicos → Submissão Externa (Presidentes) → Aprovação Interna (Admin) → Perfil Público
```

## Tech Stack

- **Frontend**: React 19, Vite 8, TypeScript 6
- **Styling**: Vanilla CSS (design system com variáveis, Light/Dark mode)
- **Routing**: React Router Dom 7
- **Animations**: Framer Motion 12
- **Icons**: Lucide React
- **Backend**: Supabase (PostgreSQL 17, Auth, RLS)
- **Deploy**: Vercel

## Requirements

### Validated (Existentes no código atual)
- ✓ Autenticação admin via Supabase Auth — existente
- ✓ CRUD de times com logos — existente
- ✓ CRUD de jogadores com posições e fotos — existente
- ✓ Lançamento de partidas e eventos (gols, cartões, assists) — existente
- ✓ Cálculo automático de classificação via trigger — existente
- ✓ Visualização pública de jogos, classificação e artilharia — existente
- ✓ Light/Dark mode — existente
- ✓ Layout responsivo mobile-first — existente
- ✓ Propagação automática de mata-mata (semi→final) — existente

### Active (A construir na v4)
- [ ] Tabela `team_managers` (Presidentes)
- [ ] Tabela `registration_links` (Links mágicos por temporada)
- [ ] Tabela `registration_submissions` (Submissões de inscrição pendentes)
- [ ] Herança de configurações em `competitions`/`seasons`
- [ ] Módulo `/admin` com UI premium e fluxo de aprovação
- [ ] Área pública para links de inscrição (wizard multi-passo)
- [ ] Perfis públicos avançados (elenco completo de equipe)
- [ ] Melhorias pesadas de CSS no painel administrativo (Cards, Drawers, Modais)

### Out of Scope (V1-MVP)
- WebSocket / Live Score — escopo de V5/V6
- Concorrência multi-admin — carga prevista é baixa
- Cards automáticos para redes sociais — escopo de V4
- App mobile nativo — foco em web responsiva

## Key Decisions

| Decisão | Racional | Resultado |
|---------|----------|-----------|
| Migração incremental do banco | Preservar dados existentes da Copa APD 2026 enquanto evolui schema | Pendente |
| Manter stack React+Vite+Supabase | Já funcional, sem necessidade de troca | Confirmado |
| Fases 100% dinâmicas | PRD exige zero hardcode de fases | Pendente |
| Vanilla CSS (sem Tailwind) | Padrão já estabelecido no projeto | Confirmado |
| Formatos múltiplos de torneio | Liga, mata-mata, grupos+mata-mata, relâmpago | Pendente |

## Commercial Model
- Produto vendido como **Plataforma Oficial Digital do Campeonato**
- Modelos: por edição ou setup + manutenção

## Evolution

Este documento evolui nas transições de fase e fronteiras de marco.

---
*Last updated: 2026-04-30 após análise completa do PRD Master 3.0*
