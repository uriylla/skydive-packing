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
   - Retired or `out_of_service` parachutes are blocked. Parachutes `in maintenance` can still be packed (confirm with the client).
   - Deactivated packers are hidden and rejected server-side.
   - Numbers match without leading zeros ("23" finds "023"). An exact match wins, and an ambiguous number is rejected.
3. **Resilient submit:** every pack goes through a `localStorage` queue with a device-generated `client_id`. If the network drops, it's retried every 15 s and when the connection returns, with a visible "pending" badge. Retries are idempotent (unique `client_id`), and the pack keeps the device's time if it's plausible (up to 48 h old). This is not full offline mode, but no pack is silently lost.

### Supervisor area (`/admin/*`, supervisor login)
4. `/admin/parachutes`: list with search (number, model, serial, owner), status filter and a "dados de baja" view, with pack count and last pack. Create/edit with validation; a number that only differs by leading zeros from an existing one ("23" vs "023") is rejected. Retire/reactivate. The detail page shows the latest 50 packs.
5. `/admin/packers`: active/deactivated lists of packers and supervisors with pack counts. Create/edit (supervisors get a username and password; a blank password on edit keeps the current one; demoting clears the login), deactivate/reactivate, and set/change/remove a PIN. Guards: you can't deactivate or demote yourself, and at least one active supervisor must remain. The detail page shows the latest 50 packs.
6. `/admin/days`: jornadas newest first (30 per page) with packs, packers, parachutes and first/last pack time. The day page (`/admin/days/YYYY-MM-DD`) shows the total, per-packer counts and every pack, voided ones struck through.
7. `/admin/history`: all packs, 50 per page, filterable by jornada date range (one day = a jornada), local time range, packer and parachute (including deactivated/retired ones), with an "Incluir anulados" toggle and a "Hoy" shortcut. Filters live in the URL so views can be shared or bookmarked.
8. **Void/correct a pack** (`/admin/packs/:id`, from any pack table):
   - **Anular** needs a reason. The pack stops counting everywhere but stays visible, with who voided it and when. It can be undone.
   - **Corregir** changes the packer and/or parachute. It voids the original and records a corrected copy with the same time, jornada and device, linked both ways (`correction_of_id`). Corrections may name retired or out-of-service parachutes, because they fix the past.

---

## 4. Identification and access

Because the URL is public, the packing screen can't be open to anyone.

- **Station (device) unlock:** a supervisor logs in and opens `/station/setup` on the device (or uses "Dispositivos → Autorizar este dispositivo"). That creates a `stations` row and sets a signed, httpOnly cookie valid for 90 days. `/admin/stations` lists devices with their last use and lets a supervisor **revoke** one. A revoked device is locked out on its next request, and its queued packs stay on the device until it's re-authorized. Each pack records the `station_id` it came from.
- **Packers:** on an unlocked device, tap your name. **No PIN by default.** With `REQUIRE_PACKER_PIN=true`, tapping a name asks for a 4–8 digit PIN. A correct PIN returns a signed packer token (72 h) that's stored on the device and sent with every pack, and the server rejects packs whose token doesn't match the packer. PINs are checked only from unlocked devices. Supervisors set PINs in M4.
- **Supervisors:** `/login` with username and password (bcrypt), giving a 12 h httpOnly session cookie. Deactivating or demoting a user takes effect immediately, because every request re-checks the DB.
- **Layers:** `src/proxy.ts` only redirects visitors with no session cookie away from `/admin/*` and `/station/setup`. The real checks live in `src/lib/auth.ts` (`getSupervisor`, `requireSupervisor`, `getStation`) and run in every gated page and Server Action.
- **Secrets:** `SESSION_SECRET` (32+ chars) is required in production, and the app refuses to sign sessions without it. In development a built-in fallback is used.
- **Rate limiting:** supervisor login allows 5 failures per username and 20 per IP in 15 min; packer PINs allow 5 per packer and 20 per device. Failures are stored in `auth_failures`, so this works on serverless.

---

## 5. Milestones

| # | Milestone | Content | Est. | Status |
|---|---|---|---|---|
| 0 | Setup | Next.js, TS, Tailwind, ESLint, Vitest, Drizzle, env, docker-compose | 0.5 d | ✅ |
| 1 | Data model | Schema, first migration, seed script, time-zone helpers + tests | 1 d | ✅ |
| 2 | Register-pack screen | Packer grid, parachute input, Server Action, checks, toast, today list, retry queue | 2 d | ✅ |
| 3 | Identification | Sessions (`jose`), station unlock, packer PIN toggle, supervisor login, `proxy.ts` | 1.5 d | ✅ |
| 4 | Parachutes & packers | CRUD pages by hand (forms + zod), detail pages with history | 2.5 d | ✅ |
| 5 | Jornadas + History | Day list/detail, filterable history, void/correct | 2 d | ✅ |
| 5b | Parachute types + external packs | Tándem/Normal type on parachutes and packs, type splits everywhere, unregistered (customer) parachutes from the packing screen | 2 d | ✅ |
| 6 | Hardening + deploy | Login/PIN rate limiting, Playwright tests + GitHub Actions CI, Vercel + Neon setup, user guide | 1.5 d | ✅ (deploy itself: see DEPLOY.md) |
| 7 | Languages | Spanish, English and Catalan UI; language in the URL, picker in the nav, remembered per device | 1.5 d | ✅ |

**Total: about 13 working days.** All milestones are done; deploying needs your Vercel/Neon accounts (DEPLOY.md).

---

### 5b. Parachute types and external packs (added after the proposal)

Packers are paid differently for tandem and normal parachutes, and some of the normal parachutes are customers' own rigs that aren't in the system.

- **Type:** every parachute is *Tándem* or *Normal* (a Postgres enum, `parachute_kind`). The type is required in the parachute form and shown/filterable in the list. Existing parachutes become *Normal* in the migration; mark the tandems once.
- **Packs snapshot the type** (`packs.kind`) when registered, so reclassifying a parachute later never changes past counts. Corrections can change it.
- **External packs:** on the packing screen, "Paracaídas externo" asks for the type and a short description (e.g. "Pedro – Javelin azul"). The pack has no `parachute_id`, only `kind` and `external_label` (a DB check enforces exactly one of the two). Any packer can register one, and status checks don't apply.
- **Type splits everywhere counts appear:** the packing screen's "Hoy" panel ("Carlos — 12 · 8 T · 4 N"), jornada list and day pages, and history (type column, type filter, "Externos" filter). Pack tables show an "Externo" tag with the description.
- **Corrections** can switch a pack between a registered parachute and an external one, and change an external pack's type or description.
- **Deferred:** a pay summary per packer by type and period (with optional rates), and an ownership field. The "Propietario" text covers ownership for now.

### 7. Languages (added after the proposal)

The UI is available in **Spanish (default), English and Catalan**.

- **Language in the URL:** every page lives under `/es`, `/en` or `/ca` (`src/app/[lang]/`), the approach the Next.js 16 docs recommend. Pages stay statically prerendered per language.
- **Choosing it:** a picker (ES · EN · CA) in the nav keeps the current page and filters. A URL without a language (old bookmarks, `/admin/days`) is redirected by `src/proxy.ts` to the device's last language (a `locale` cookie), else the browser's language, else Spanish. Each device keeps its own language, so the packing PC can stay in Spanish while a supervisor uses English on their phone.
- **Dictionaries:** `src/i18n/dictionaries/{es,en,ca}.ts`. Spanish is the source. TypeScript and a unit test check that English and Catalan have the same keys and placeholders.
- **Data layer stays language-neutral:** `src/lib` returns message keys (`msg("parachuteRetired", { number })`); Server Actions translate them using the page's language, which the proxy passes in an `x-locale` header (route params aren't available in actions).
- **Not translated:** data people type (names, notes, void reasons, external descriptions). Dates stay numeric (`25/11/2026 14:37`) in every language. The Spanish user guide (docs/GUIA.md) isn't translated yet.
- **Adding a language:** add it to `LOCALES` in `src/i18n/config.ts`, copy `en.ts`, translate it and register it in `src/i18n/dictionaries/index.ts`.

## 6. Open questions for the client

1. Identification: should packers enter a PIN, or is tapping their name on an unlocked device enough?
2. Is a jornada simply a calendar date, or can one operating day cross midnight, or need explicit open/close?
3. How reliable is the internet at the packing area? This decides whether full offline mode (optional) is really needed.
4. Are parachute numbers unique and stable?
5. Can packers void their own mistakes (for example within 5 minutes), or only supervisors?
6. ~~Language: Spanish UI only?~~ Spanish, English and Catalan (M7).

---

## 7. Designed to extend later
- **Dashboard (jornada actual):** aggregates over `packs` for today, auto-refreshing.
- **QR codes:** encode the parachute number, scanned with the phone camera or a USB scanner (scanners type into the existing input).
- **More error checks:** add a "packed in the last N minutes" warning.
- **Audit log:** an `audit_events` table written from the Server Actions.
- **Export CSV/Excel/PDF:** a Route Handler over the same history filters.
- **Full offline mode:** a PWA with a service worker, building on the M2 retry queue.
