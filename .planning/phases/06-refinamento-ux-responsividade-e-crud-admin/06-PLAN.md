# Phase 06: Refinamento UX, Responsividade e CRUD Admin - Plan

## Wave 1: Foundation, Scroll & Global Styles

### Task 1.1: Unified Validation Schemas
- **Action**: Create `src/utils/schemas.ts` and define `playerSchema` using Zod.
- **Read First**: `src/types/index.ts`
- **Acceptance Criteria**:
  - `src/utils/schemas.ts` exists.
  - `playerSchema` includes `name` (min 2), `shirt_number` (number), `team_id` (string/uuid), `photo_url` (url).
  - `position` is also included as optional/enum if needed.

### Task 1.2: Scroll To Top Component
- **Action**: Create `src/components/ScrollToTop.tsx` and integrate it into `src/App.tsx`.
- **Read First**: `src/App.tsx`
- **Acceptance Criteria**:
  - `src/components/ScrollToTop.tsx` uses `useLocation` and `window.scrollTo(0, 0)`.
  - `src/App.tsx` imports and renders `<ScrollToTop />` inside `<Router>`.

### Task 1.3: Global Responsiveness Foundation
- **Action**: Update `src/index.css` with mobile-first containers and overflow fixes.
- **Read First**: `src/index.css`
- **Acceptance Criteria**:
  - `html, body` have `overflow-x: hidden`.
  - `.container` uses `max-width: 1280px` and `mx-auto`.
  - Fixed widths (like `1024px`) are replaced by `max-width: 100%`.

## Wave 2: Player Management Simplification

### Task 2.1: Update Types & Database Model
- **Action**: Remove `age`, `nickname`, and `phone` from `Player` and `PlayerRegistration` types.
- **Read First**: `src/types/index.ts`
- **Acceptance Criteria**:
  - `src/types/index.ts` no longer contains `age`, `nickname`, or `phone` in player-related types.

### Task 2.2: Refactor Admin Player Form
- **Action**: Update `src/pages/AdminJogadores.tsx` to remove `age` and use the new Zod schema. Ensure Edit/Delete are fully functional.
- **Read First**: `src/pages/AdminJogadores.tsx`
- **Acceptance Criteria**:
  - Form no longer has "Idade" or "Apelido" fields.
  - "Apelido" label is changed to "Nome Completo".
  - Edit and Delete buttons work correctly with Supabase.

### Task 2.3: Refactor Public Registration Form
- **Action**: Update `src/pages/PublicRegistration.tsx` and `src/pages/PlayerRegistration.tsx` to remove simplified fields.
- **Read First**: `src/pages/PublicRegistration.tsx`, `src/pages/PlayerRegistration.tsx`
- **Acceptance Criteria**:
  - Redundant fields removed from wizard steps.
  - Validation uses the new unified schema.

## Wave 3: Image Validation & Feedback

### Task 3.1: Image URL Validation Logic
- **Action**: Implement a utility function to validate image URLs via `HEAD` request.
- **Read First**: `src/pages/AdminJogadores.tsx`
- **Acceptance Criteria**:
  - Validation checks `Content-Type: image/*`.
  - Error messages are explicit for UI consumption.

### Task 3.2: Error Feedback UI
- **Action**: Add visual feedback (toasts or inline alerts) for upload errors in Admin and Public forms.
- **Read First**: `src/pages/AdminJogadores.tsx`
- **Acceptance Criteria**:
  - No silent failures.
  - "Imagem não encontrada" or "Formato inválido" displayed when validation fails.

## Wave 4: Final Mobile Polish

### Task 4.1: Responsive Grids & Images
- **Action**: Review all grid layouts (Home, Jogos, Artilharia) and ensure they collapse correctly on mobile.
- **Read First**: `src/pages/Home.tsx`, `src/pages/Jogos.tsx`
- **Acceptance Criteria**:
  - No horizontal scroll on iPhone 12/13/14 widths (390px-430px).
  - Images use `object-cover` and don't break aspect ratio.

---

## Verification Criteria

- [ ] Mobile navigation is smooth without horizontal scroll.
- [ ] Changing routes resets scroll to top.
- [ ] Invalid image URLs are blocked with clear error messages.
- [ ] Player forms are simplified (No whatsapp, age, or nickname).
- [ ] Admin can Edit and Delete players successfully.
- [ ] Zod validation is active on both Admin and Public registration.
