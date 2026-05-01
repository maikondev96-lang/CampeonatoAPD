# Architecture

## Pattern: Client-Side Rendering (CSR)
The application is a Single Page Application (SPA) built with React and Vite.

## Data Flow
1. **Supabase** acts as the backend and database.
2. **React Router** manages client-side navigation.
3. **Protected Routes**: `AdminRoute.tsx` wraps administrative pages, checking for authentication via Supabase.

## Component Strategy
- **Pages**: Top-level route components located in `src/pages`.
- **Components**: Reusable UI elements in `src/components`.
- **Utils**: Shared logic and helper functions in `src/utils`.
- **Types**: Centralized TypeScript definitions in `src/types`.

## Theme Management
- Uses a global `data-theme` attribute on the `html` element.
- Synced via custom events and localStorage.
