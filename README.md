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
pnpm dev                      # http://localhost:3000
```

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` / `build` / `start` | Next.js |
| `pnpm lint` / `typecheck` / `test` | ESLint / tsc / Vitest |
| `pnpm db:generate` | Create a migration from changes in `src/db/schema.ts` |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:studio` | Browse the database |
| `pnpm db:seed` | Seed data (`--no-sample` for the supervisor only) |

## Layout

```
src/app/            routes (/ = packing station, /admin/* = supervisor area)
src/components/     shared UI
src/db/schema.ts    Drizzle schema (source of truth for the DB)
src/db/index.ts     DB client (server only)
src/lib/            helpers (time zone / jornada date, …)
drizzle/            generated SQL migrations (commit them)
scripts/seed.ts     seed data
```

## Notes
- Next.js 16 with `cacheComponents` enabled: wrap DB reads in `<Suspense>` (or `"use cache"`).
- The jornada date uses `APP_TIMEZONE` (default `Europe/Madrid`).
