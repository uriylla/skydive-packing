# Packing Saltamos: MVP development plan

Scope: the **basic features** from the proposal: parachute management, packer management, pack registration, operating days (jornadas), history, and user identification. The optional features (QR, stats, dashboard, exports, full offline, audit log) are left out, but the design leaves room for them.

The app is **hosted online**, so any device (the packing-area PC, tablets, phones) can use it.

---

## 1. Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16** (App Router, Server Components, Server Actions) | `cacheComponents` is on: put DB reads inside `<Suspense>` or use `"use cache"`. Request APIs (`cookies()`, `params`…) are async. Middleware is now `proxy.ts`. |
| Language | TypeScript (strict) | |
| DB | **Postgres**: Neon in production, Docker or local in dev | Accessed with **Drizzle ORM** and the `postgres` driver, with SQL migrations in `drizzle/`. |
| Auth | Custom: bcrypt hashes and signed session cookies (`jose`) | Small enough that Auth.js isn't worth it. See §4. |
| Validation | `zod` | All Server Action inputs. |
| UI | Tailwind CSS 4 (shadcn/ui components added as needed) | Big, touch-friendly targets on the packing screen. |
| Tests | Vitest (unit); Playwright for critical flows later | |
| Hosting | **Vercel + Neon** (free tiers should be enough) | Backups come from Neon's point-in-time restore. |

---

## 2. Data model (`src/db/schema.ts`)

```
users            -- packers and supervisors in one table
  id, name, role: packer | supervisor,
  pin_hash?      -- optional 4-digit PIN for the packing screen
  username?, password_hash?   -- supervisor login
  active, created_at

parachutes
  id, number (unique, "023"), model, serial_number, owner,
  status: active | maintenance | out_of_service,
  notes, retired (soft delete), created_at

operating_days   -- jornada
  id, date (unique, calendar date in APP_TIMEZONE), notes, created_at
  -- created automatically on the day's first pack

packs
  id, packer_id → users, parachute_id → parachutes, day_id → operating_days,
  packed_at, voided, voided_reason, voided_by_id → users, voided_at, created_at
```

Rules:
- Nothing is hard-deleted. Users are deactivated, parachutes retired, and packs voided with a reason.
- The jornada date is computed in `APP_TIMEZONE` (default `Europe/Madrid`), never UTC (`src/lib/time.ts`).
- Packers and supervisors share one table because a supervisor can also pack.

---

## 3. Screens and routes

### Packing station (`/`)
1. **Register pack**, in 3 taps or fewer:
   - Tap your name (grid of active packers). Enter a PIN if one is required.
   - Type or search the parachute number (autofocus, numeric keypad, Enter submits).
   - **Confirm**. A toast shows "14:37 — Carlos — 023". The packer stays selected.
   - "Today" list below shows the last ~10 packs with the day's total.
2. Built-in checks:
   - Retired or `out_of_service` parachutes are blocked.
   - Deactivated packers are hidden.
3. **Resilient submit:** if the network drops, the pack is queued in `localStorage` and retried, with a visible "pending" badge. This is not full offline mode, but no pack is silently lost.

### Supervisor area (`/admin/*`, supervisor login)
4. `/admin/parachutes`: list, filter by status, create/edit, retire. The detail page shows the pack history.
5. `/admin/packers`: list, create/edit, deactivate, set/reset PIN. The detail page shows activity.
6. `/admin/days`: list of jornadas with totals. The detail page has a Time / Packer / Parachute table and per-packer counts.
7. `/admin/history`: all packs, filterable by date range, jornada, packer, parachute and time range, with pagination. Filters live in URL `searchParams` so views can be shared.
8. **Void/correct a pack**, with a reason. Available from the history and day pages.

---

## 4. Identification and access

Because the URL is public, the packing screen can't be open to anyone.

- **Station login (device):** a supervisor "unlocks" a device once (`/station/setup`). That sets a long-lived signed cookie, valid for about 90 days and revocable. Only unlocked devices can open `/`.
- **Packers:** on an unlocked device, tap your name. The PIN is optional per installation (`REQUIRE_PACKER_PIN`) and decided by the client. The selected packer stays active until they switch or a few hours pass with no activity.
- **Supervisors:** username and password, giving a session cookie (about 12 h) for `/admin/*`.
- `src/proxy.ts` does optimistic redirects. The real authorization check is repeated in every Server Action and page (`requireStation()`, `requireSupervisor()`).

---

## 5. Milestones

| # | Milestone | Content | Est. | Status |
|---|---|---|---|---|
| 0 | Setup | Next.js, TS, Tailwind, ESLint, Vitest, Drizzle, env, docker-compose | 0.5 d | ✅ |
| 1 | Data model | Schema, first migration, seed script, time-zone helpers + tests | 1 d | ✅ |
| 2 | Register-pack screen | Packer grid, parachute input, Server Action, checks, toast, today list, retry queue | 2 d | |
| 3 | Identification | Sessions (`jose`), station unlock, packer PIN toggle, supervisor login, `proxy.ts` | 1.5 d | |
| 4 | Parachutes & packers | CRUD pages by hand (forms + zod), detail pages with history | 2.5 d | |
| 5 | Jornadas + History | Day list/detail, filterable history, void/correct | 2 d | |
| 6 | Hardening + deploy | Playwright tests for critical flows, Vercel + Neon setup, user guide | 1.5 d | |

**Total: about 11 working days.** Milestones 0 and 1 are done.

---

## 6. Open questions for the client

1. Identification: should packers enter a PIN, or is tapping their name on an unlocked device enough?
2. Is a jornada simply a calendar date, or can one operating day cross midnight, or need explicit open/close?
3. How reliable is the internet at the packing area? This decides whether full offline mode (optional) is really needed.
4. Are parachute numbers unique and stable?
5. Can packers void their own mistakes (for example within 5 minutes), or only supervisors?
6. Language: Spanish UI only?

---

## 7. Designed to extend later
- **Dashboard (jornada actual):** aggregates over `packs` for today, auto-refreshing.
- **QR codes:** encode the parachute number, scanned with the phone camera or a USB scanner (scanners type into the existing input).
- **More error checks:** add a "packed in the last N minutes" warning.
- **Audit log:** an `audit_events` table written from the Server Actions.
- **Export CSV/Excel/PDF:** a Route Handler over the same history filters.
- **Full offline mode:** a PWA with a service worker, building on the M2 retry queue.
