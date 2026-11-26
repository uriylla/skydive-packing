# Deploying (Vercel + Neon)

The app runs on **Vercel** (Next.js) with a **Neon** Postgres database. Both free tiers should be enough for one dropzone. Check their current limits before you rely on them.

## 1. Database (Neon)

The simplest route is the **Neon integration from the Vercel Marketplace** (Vercel project → Storage → Neon). It creates the database and adds these environment variables to the project:

| Variable | Used for |
|---|---|
| `DATABASE_URL` | The app (pooled connection) |
| `DATABASE_URL_UNPOOLED` | Migrations (`drizzle.config.ts` prefers it) |

- **Region:** pick one close to Spain, e.g. Frankfurt (`aws-eu-central-1`), and set the Vercel functions region to match (Project → Settings → Functions → Region, e.g. `fra1`). Every request talks to the database, so keeping both together matters.
- **Preview deployments:** enable "create a database branch for each preview deployment" in the integration. Migrations run on every deploy (see below), and this keeps preview builds away from the production database.

If you create the Neon project yourself instead, copy its pooled and direct connection strings into those two variables.

## 2. Vercel project

1. Vercel → Add New → Project → import `uriylla/skydive-packing`. The framework preset is Next.js.
2. Leave the build command as is. Vercel runs the `vercel-build` script, which **applies pending migrations, then builds**:

   ```
   drizzle-kit migrate && next build
   ```

3. Set environment variables (Production, and Preview if you use it):

   | Variable | Value |
   |---|---|
   | `SESSION_SECRET` | A random string of 32+ characters: `openssl rand -base64 32`. Required; login refuses to work without it. Changing it logs everyone out and locks all packing devices (they must be re-authorized). |
   | `APP_TIMEZONE` | `Europe/Madrid` (defines which day a pack belongs to) |
   | `REQUIRE_PACKER_PIN` | `false` (or `true` to make packers enter a PIN) |
   | `DEFAULT_LOCALE` | `es`, `en` or `ca`: the language for devices that haven't picked one and whose browser language isn't one of those three. English if unset. |
   | `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | Set by the Neon integration |

4. Deploy.

## 3. First supervisor

The database starts empty. Create the first supervisor from your machine, using the **direct** connection string from Neon:

```bash
DATABASE_URL="<DATABASE_URL_UNPOOLED from Neon>" \
SEED_ADMIN_USERNAME=admin \
SEED_ADMIN_PASSWORD="<a strong password>" \
pnpm db:seed --no-sample
```

`--no-sample` skips the demo packers and parachutes. Never use `--demo-packs` against production.

Then open the site:
1. Log in at `/login`.
2. Go to **Plegadores** and add the real packers and supervisors. To change your own password, use Plegadores → your name → Editar.
3. Go to **Paracaídas** and add the parachutes with their type (Tándem/Normal).
4. On each packing device (the PC in the packing area, tablets…), open the site, log in, and choose **Autorizar este dispositivo**. Log out afterwards so packers don't have supervisor access.

## 4. Day to day

- **Backups:** Neon keeps a point-in-time restore window; check how long it is on your plan. For a longer history, schedule a dump, for example a weekly `pg_dump "$DATABASE_URL_UNPOOLED" > backup.sql` from any machine.
- **Schema changes:** add a migration with `pnpm db:generate`, commit it, and the next deploy applies it.
- **CI:** `.github/workflows/ci.yml` runs lint, typecheck, unit/DB tests, a build and the Playwright end-to-end tests on every push to `main` and on pull requests.
- **Lost or stolen device:** revoke it in **Dispositivos**. It's locked out on its next request.

## 5. Security notes

- Supervisor logins are limited to 5 failures per username and 20 per IP in 15 minutes. Packer PINs are limited to 5 failures per packer and 20 per device.
- Sessions are signed, httpOnly cookies: 12 h for supervisors, 90 days for packing devices.
- Security headers are set in `next.config.ts` (no framing, no sniffing, strict referrer).
