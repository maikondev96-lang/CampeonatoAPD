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

### Estado Atual (v4.5 — Production Ready Architecture)
- **Data Layer Engine**: Migração total para `QueryEngine` e `AdminEngine`.
- **Performance**: Implementação de TanStack Query em 100% das páginas críticas (Admin e Público).
- **Escrita Segura**: Camada `safeMutation` eliminou chamadas diretas ao Supabase no Admin, garantindo atomicidade e sincronia de cache.
- **UI/UX Refined**: Componente `QueryView` padronizou estados de loading/erro em todo o sistema.

### Requirements

#### Validated (Firmeza Arquitetural)
- ✓ Governança de Escrita (AdminEngine) — implementado
- ✓ Gerenciamento de Estado Global (TanStack Query) — implementado
- ✓ Sincronização Atômica de Cache — implementado
- ✓ Fallbacks de UI padronizados (QueryView) — implementado
- ✓ Wizard de Campeonato com automação de fases — implementado
- ✓ Súmula Digital com cálculo dinâmico e rollback — implementado
- ✓ Gestão de Elencos e Notícias via Engine Segura — implementado

### Active (Fase Final de Polimento)
- [ ] Otimização de Imagens (Cloudinary/Vercel Blob) — Próximo Passo
- [ ] Monitoramento de Erros (Sentry) — Pendente
- [ ] Testes de Carga na Automação de Mata-Mata — Pendente
- [ ] Finalização de Perfis Públicos de Times (Squad Views) — Em Progresso

---
*Last updated: 2026-05-02 após migração completa para a Arquitetura de Motores (Query/Admin Engine)*
