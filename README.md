# Nexovate

Nexovate is a Next.js demo workspace for subscription billing, webinars, websites, email campaigns, and the AI agent. P4's standalone billing/marketing demo data uses SQLite at `.data/nexus.sqlite`, which is ignored by Git. P1's agent services use the Prisma/PostgreSQL database configured by `DATABASE_URL`; the two demo stores are separate.

## Run locally

1. Install Node.js 20.9 or newer.
2. In the repository folder, run `npm install`.
3. Copy `.env.example` to `.env.local`. Leave `EMAIL_DRIVER=console` for safe local email previews.
4. Create the P4 SQLite database and demo records with `npm run db:seed`.
5. To use P1's agent/PostgreSQL features, replace the example `DATABASE_URL` with your PostgreSQL connection string, then run `npx prisma generate` and `npx prisma migrate deploy`.
6. Start the app with `npm run dev`, then open <http://localhost:3000>.

The seed command is safe to rerun: it creates the schema and inserts the demo records only when the database has not yet been seeded. It includes three plans, an active subscription, usage, one historical invoice, two past campaigns, one demo site, two webinars, registrations, and attendance. Set `DATABASE_PATH` in `.env.local` to store the SQLite file elsewhere.

## API routes

All routes return JSON unless stated otherwise. These demo APIs currently have no authentication and are intended for local development.

| Method | Route | Purpose |
| --- | --- | --- |
| GET, POST | `/api/webinars` | List webinars or create one |
| GET, PATCH | `/api/webinars/:id` | Read a webinar (including registrations) or update it; `:id` may be its slug |
| GET, POST | `/api/registrations` | List registrations (optional `?webinarId=...`) or register an attendee |
| GET, POST | `/api/attendance` | List check-ins (optional `?webinarId=...`) or check in a registration |
| GET, POST | `/api/sites` | List sites or create a site |
| GET, PATCH | `/api/sites/:slug` | Read or update a site |
| GET, POST | `/api/billing` | Read billing state or close due billing periods / simulate payment |
| GET, POST | `/api/campaigns` | List campaigns or create a campaign draft |
| GET, PATCH | `/api/campaigns/:id` | Read or update a campaign |
| POST | `/api/campaigns/run` | Send due scheduled campaigns; optionally requires `Authorization: Bearer <SCHEDULER_SECRET>` |
| GET | `/api/track/open/:id` | Record an open and return a tracking pixel |
| GET | `/api/track/click?campaign=...&url=...` | Record a click and redirect |

Example: `POST /api/registrations` with JSON `{ "webinarId": "community-that-lasts", "name": "Ada Lovelace", "email": "ada@example.com" }`. Registration confirmations and attendance follow-ups use `sendEmail`; the default console driver logs the email without delivering it.

## Email and campaign delivery

The console driver prints messages locally. For sandbox SMTP delivery, set `EMAIL_DRIVER=smtp` and fill `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` in `.env.local` using credentials from a service such as Mailtrap. Set `EMAIL_FROM` to the sender address. Never expose these settings in browser code.

Set `GEMINI_API_KEY` to draft campaign copy with Gemini. Without it, the app creates an editable starter draft. Campaign scheduling stores the requested send time; call `POST /api/campaigns/run` from a scheduler to send campaigns that are due. Set `NEXT_PUBLIC_APP_URL` to the public base URL when using tracking links. Open counts are approximate because some email clients block tracking pixels.

The P3 agent uses hardcoded mock P2/P4 tool clients by default (`USE_MOCKS=true`) so its approval flow can run without the other services. Its planner falls back to the rehearsed prompts if no LLM key is configured. Set `USE_MOCKS=false` only after the P2/P4 request and response contracts are connected.

## Billing demo rules

Money is stored as integer cents; periods are invoiced in arrears; billing helpers accept an explicit `now` for demos. Billing changes are saved in the local database transactionally and invoice idempotency keys are unique. Payments are simulated and invoices are marked paid.

## Project commands

- `npm run dev` — start the development server
- `npm run db:seed` — create the SQLite schema and seed the local demo data
- `npm run lint` — run ESLint
- `npm run build` — create a production build
