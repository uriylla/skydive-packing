# Packing Saltamos

Web app to record parachute packs: who packed which parachute, and when. See [PLAN.md](./PLAN.md) for scope and roadmap.

## Requirements
- Node 22+, pnpm 10+
- Postgres 16 (Docker or local)

## Getting started

```bash
pnpm install
cp .env.example .env          # adjust values
docker compose up -d          # local Postgres on :5432
pnpm db:migrate               # apply migrations
pnpm db:seed                  # supervisor + sample packers/parachutes
docker compose exec db createdb -U packing packing_test   # once, for `pnpm test`
docker compose exec db createdb -U packing packing_e2e    # once, for `pnpm e2e`
pnpm dev                      # http://localhost:3000
```

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` / `build` / `start` | Next.js |
| `pnpm lint` / `typecheck` / `test` | ESLint / tsc / Vitest (DB tests use `DATABASE_URL_TEST`; skipped if unset) |
| `pnpm e2e` | Playwright end-to-end tests against a production build (run `pnpm build` first; uses `DATABASE_URL_E2E`, default `localhost:5433/packing_e2e`, which it wipes) |
| `pnpm db:generate` | Create a migration from changes in `src/db/schema.ts` |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:studio` | Browse the database |
| `pnpm db:seed` | Seed data (`--no-sample` for the supervisor only, `--demo-packs` adds two weeks of random packs for trying things out) |

## Layout

```
src/app/            routes (/ = packing station, /admin/* = supervisor area)
src/components/     shared UI
src/db/schema.ts    Drizzle schema (source of truth for the DB)
src/db/index.ts     DB client (server only)
src/lib/            domain logic (packs.ts) and helpers (time zone / jornada date)
src/app/_station/   packing-station client UI (queue, packer grid)
src/app/actions.ts  Server Actions
drizzle/            generated SQL migrations (commit them)
scripts/seed.ts     seed data
```

## Access
- **Supervisors** log in at `/login` (seeded user: `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD`).
- **Packing devices** must be authorized once by a supervisor at `/station/setup`. Manage or revoke them in `/admin/stations`.
- **Packer PINs** are off by default. Set `REQUIRE_PACKER_PIN=true` to require them.
- `pnpm start` (production mode) refuses to run auth without a real `SESSION_SECRET` (`openssl rand -base64 32`).

## Docs
- [PLAN.md](./PLAN.md): scope, data model, milestones
- [DEPLOY.md](./DEPLOY.md): deploying to Vercel + Neon, first supervisor, backups
- [docs/GUIA.md](./docs/GUIA.md): user guide (Spanish) for packers and supervisors

## Notes
- Next.js 16 with `cacheComponents` enabled: wrap DB reads in `<Suspense>` (or `"use cache"`).
- The jornada date uses `APP_TIMEZONE` (default `Europe/Madrid`).
