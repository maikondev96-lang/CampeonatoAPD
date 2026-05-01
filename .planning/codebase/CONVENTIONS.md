# Conventions

## Coding Standards
- **Component Style**: Functional components with React Hooks.
- **Naming**:
  - Components: PascalCase (e.g., `AdminJogos.tsx`).
  - Files: PascalCase for components, camelCase for logic (e.g., `supabaseClient.ts`).
  - Types: PascalCase (e.g., `Team`, `Match`).
  - Fields: snake_case for fields mapped to database (e.g., `home_team_id`).
- **Typing**: Strict TypeScript interfaces for all major entities.
- **Enums**: Literal string unions for status and type fields.

## UI/UX
- **Icons**: Lucide React for consistent visual language.
- **Transitions**: Framer Motion for smooth UI transitions.
- **Styling**: BEM-like naming in CSS, though not strictly enforced.

## Data Fetching
- Direct use of `supabase-js` client within components/pages (mostly).
- Environment variables for sensitive configuration.
