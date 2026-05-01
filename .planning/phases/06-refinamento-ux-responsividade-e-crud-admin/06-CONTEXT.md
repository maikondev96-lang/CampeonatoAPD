# Phase 06: Refinamento UX, Responsividade e CRUD Admin - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning
**Source:** PRD Express Path (User Request)

<domain>
## Phase Boundary

Esta fase visa consolidar a experiência do usuário, garantindo que o aplicativo seja totalmente funcional e visualmente atraente em dispositivos móveis, além de simplificar a gestão de dados e completar o ciclo de gerenciamento de jogadores no painel administrativo.

### Entregas principais:
1. **Responsividade Mobile**: Layout fluido, alinhado e sem scroll lateral.
2. **Navegação Inteligente**: Reset de scroll automático ao mudar de página.
3. **Segurança no Upload**: Validação robusta de links de imagem.
4. **Simplificação de Dados**: Remoção de campos redundantes (`whatsapp`, `apelido`, `idade`) em jogadores.
5. **CRUD Completo Admin**: Edição e Exclusão de jogadores funcional no painel.
6. **Padronização**: Uso de Zod para validação unificada entre Admin e Público.

</domain>

<decisions>
## Implementation Decisions

### 1. Responsividade (Mobile-First)
- **Breakpoints**: Adotar `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`.
- **Containers**: Padronizar com `.container { width: 100%; max-width: 1280px; margin: 0 auto; padding: 0 1rem; }`.
- **Overflow**: Aplicar `overflow-x: hidden` globalmente no `html` e `body`.
- **Grids**: Transição de `grid-cols-1` (mobile) para `grid-cols-2/3` (desktop).
- **Imagens**: Garantir `w-full h-auto object-cover` em todos os contextos de exibição.

### 2. Scroll Control
- **Componente**: Criar `src/components/ScrollToTop.tsx`.
- **Lógica**: Utilizar `useEffect` com `useLocation` e `window.scrollTo(0, 0)`.
- **Integração**: Inserir dentro do `Router` no `App.tsx`.

### 3. Validação de Imagem
- **Método**: `fetch(url, { method: 'HEAD' })` para verificar existência e `Content-Type`.
- **Restrição**: Bloquear qualquer arquivo que não seja `image/*`.
- **Feedback**: Mensagens claras: "Imagem não encontrada", "Formato inválido", "Acesso bloqueado por CORS".

### 4. Estrutura de Jogador
- **Campos Mantidos**: `name` (única fonte de verdade), `shirt_number`, `team_id`, `photo_url`, `position`.
- **Campos Removidos**: `whatsapp`, `apelido`, `age`.
- **Migração**: Atualizar `types/index.ts`, formulários de cadastro e exibições.

### 5. CRUD Admin
- **Edição**: Modal ou formulário pré-carregado em `AdminJogadores.tsx`.
- **Exclusão**: Botão com `confirm()` obrigatório.
- **Integração**: Operações `update` e `delete` diretas no Supabase.

### 6. Validação (Zod)
- **Schema Unificado**: Criar `src/utils/schemas.ts`.
- **Regras**: `name` (min 2 chars), `number` (numérico obrigatório), `photo_url` (URL válida), `team_id` (obrigatório).

### the agent's Discretion
- **Design de Modais**: Usar os padrões visuais já estabelecidos no projeto (vidro, sombras suaves).
- **Posição do Jogador**: Embora o PRD peça "manter apenas 4 campos", manterei `position` internamente pois é essencial para o motor de estatísticas, mas removerei da visualização de cadastro simplificada se for redundante. *Decisão: Manter `position` como select obrigatório.*

</decisions>

<canonical_refs>
## Canonical References

### Core
- `src/index.css` — Design system e variáveis.
- `src/App.tsx` — Roteamento e layout global.
- `src/pages/AdminJogadores.tsx` — CRUD de jogadores.
- `src/pages/PublicRegistration.tsx` — Formulário de inscrição público.
- `src/types/index.ts` — Definições de tipos.

</canonical_refs>

<specifics>
## Specific Ideas
- Substituir larguras fixas (ex: `width: 1024px`) por `max-width: 100%`.
- Garantir que o `SeasonContext` esteja sempre disponível no Admin.

</specifics>

<deferred>
## Deferred Ideas
- WebSocket para atualizações em tempo real (fora do escopo atual).
- Histórico detalhado de edições (logs de auditoria avançados).

</deferred>

---

*Phase: 06-refinamento-ux-responsividade-e-crud-admin*
*Context gathered: 2026-05-01 via PRD Express Path*
