# EA Forests repository baseline

Treat this as orientation, not immutable truth. Verify all details against the current branch before acting.

## Repository

- GitHub: `JasonOyugi/EA_Forests`
- Default branch observed: `main`
- Primary frontend: `vite-version/`
- Backend: `backend/`
- Documentation: `docs/`

## Frontend baseline observed

- React 19, TypeScript 5.9, Vite 7.
- Tailwind CSS 4 with shadcn/Radix primitives.
- React Router 7.
- GSAP and `@gsap/react` for advanced motion.
- Recharts for charts, Zustand for state, React Hook Form and Zod for forms.
- Theme tokens and substantial global styles in `vite-version/src/index.css`.
- Theme configuration in `vite-version/src/config/theme-data.ts` and related theme utilities.
- Application routing in `vite-version/src/components/router/app-router.tsx` and route configuration in `vite-version/src/config/routes.tsx`.
- Shared UI primitives in `vite-version/src/components/ui/`.
- Landing page in `vite-version/src/app/landing/`, with section components in `vite-version/src/app/landing/components/`.
- Product and analytical surfaces under `vite-version/src/app/`, including dashboard, maps, models, shop, pricing, and settings.
- Public assets under `vite-version/public/`.

## Working rules

1. Run frontend commands from `vite-version/` unless the current package configuration proves otherwise.
2. Inspect both `vite-version/package.json` and the repository root before selecting a package manager or command.
3. Prefer existing Radix/shadcn primitives, tokens, fonts, route patterns, and GSAP setup.
4. Keep forestry calculations, maps, analytics, forms, routing, and backend contracts intact during visual work.
5. Check light and dark themes when the edited surface supports both.
6. Verify desktop and mobile; many EA Forests surfaces contain dense analytical content that cannot simply be scaled down.
7. Avoid expanding `index.css` with one-off rules when a component-scoped utility or reusable token is clearer.
8. Do not modify large GeoJSON or generated data assets for a design-only task.

## Default validation discovery

Inspect the current scripts, then run the supported equivalents of:

- formatting or formatting check;
- TypeScript build/typecheck;
- ESLint;
- tests when present;
- production Vite build;
- preview and visual comparison at 1440 × 900, 1024 × 768, 390 × 844, and 360 × 800.

Do not claim that visual fidelity passed unless the rendered target was actually compared with the reference.

