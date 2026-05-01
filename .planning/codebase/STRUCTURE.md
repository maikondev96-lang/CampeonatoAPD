# Structure

## Directory Map
- `public/`: Static assets.
- `src/`: Source code.
  - `assets/`: Images and static files.
  - `components/`: UI components (AdminRoute, etc.).
  - `pages/`: Route-specific components.
    - `Admin.tsx`: Main admin dashboard.
    - `Home.tsx`: Public home page.
    - ... (Total 13 pages)
  - `types/`: TypeScript interfaces and types.
  - `utils/`: Helper functions.
  - `App.tsx`: Root component and routing.
  - `main.tsx`: Entry point.
  - `supabaseClient.ts`: Supabase initialization.
  - `index.css`: Global styles (large file, ~30KB).
- `dist/`: Build output (ignored by git).
- `node_modules/`: Dependencies (ignored by git).

## Key Files
- `package.json`: Dependency manifest.
- `vite.config.ts`: Vite configuration.
- `vercel.json`: Vercel deployment config.
- `.env`: Environment variables.
