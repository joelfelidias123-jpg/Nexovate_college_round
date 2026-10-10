# Nexovate

Nexovate is a Next.js demo workspace for subscription billing, webinars, websites, email campaigns, and the AI agent. P1's application data and P4's billing, marketing, site, webinar, registration, and attendance demo state use the PostgreSQL database configured by `DATABASE_URL`. P4's prototype modules currently share one demo workspace state document; they do not yet provide tenant isolation or user authentication.

## Run locally

1. Install Node.js 20.9 or newer, then run `npm install` in this repository.
2. Copy `.env.example` to `.env.local` and set `DATABASE_URL` to a PostgreSQL connection string. Keep `.env.local` private; it is ignored by Git.
3. Keep `EMAIL_DRIVER=console` for safe local email previews. For real delivery, use a verified SMTP provider and set its credentials in the deployment environment.
4. Apply database migrations and seed demo data:

   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

   The seed is safe to rerun and leaves existing P4 data unchanged. If the P4 store row is absent, the app initializes demo data on first access.
5. Run `npm run dev` and open <http://localhost:3000>.

## Deploy

Deploy the Next.js app to a Node-compatible host and configure `DATABASE_URL`, email settings, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BASE_URL`, and any AI/scheduler settings in that host's environment variables. `NEXT_PUBLIC_BASE_URL` is used by published site pages to fetch their saved content. Run `npm run db:generate`, `npm run db:migrate`, and `npm run db:seed` as part of the release workflow before serving traffic. `npm run build` checks the production bundle; `npm run start` starts it.

Campaign sending is scheduled work: configure a hosted scheduler to call `POST /api/campaigns/run` at the desired interval and set `SCHEDULER_SECRET`. Use SMTP credentials from a real provider to deliver mail; the console driver only logs messages. Webinar join/replay links must point to a configured webinar provider. Billing payments remain simulated and invoices are marked paid by the demo flow.

The P4 API routes are currently demo APIs without authentication or tenant authorization. Do not expose them to public production users until P1's authentication and workspace authorization are connected and applied to these routes. Deployment also requires correct provider credentials and platform configuration; this repository change does not deploy the site.

## API routes

| Method | Route | Purpose |
| --- | --- | --- |
| GET, POST | `/api/webinars` | List webinars or create one |
| GET, PATCH | `/api/webinars/:id` | Read a webinar (including registrations) or update it; `:id` may be its slug |
| GET, POST | `/api/registrations` | List registrations (optional `?webinarId=...`) or register an attendee |
| GET, POST | `/api/attendance` | List check-ins (optional `?webinarId=...`) or check in a registration |
| GET, POST | `/api/sites` | List/create P4 sites; supports P2 builder `siteId`/`slug` reads and save/publish writes with the existing response shapes |
| GET, PATCH | `/api/sites/:slug` | Read or update a site |
| GET, POST | `/api/billing` | Read billing state or close due billing periods / simulate payment |
| GET, POST | `/api/campaigns` | List campaigns or create a campaign draft |
| GET, PATCH | `/api/campaigns/:id` | Read or update a campaign |
| POST | `/api/campaigns/run` | Send due scheduled campaigns; optionally requires `Authorization: Bearer <SCHEDULER_SECRET>` |
| GET | `/api/track/open/:id` | Record an open and return a tracking pixel |
| GET | `/api/track/click?campaign=...&url=...` | Record a click and redirect |

Registration confirmations and attendance follow-ups use `sendEmail`; the default console driver logs messages without delivering them. Set `NEXT_PUBLIC_APP_URL` to the deployed origin for campaign tracking links. Open counts are approximate because some email clients block tracking pixels.

## Billing rules

Money is stored as integer cents; periods are invoiced in arrears; billing helpers accept an explicit `now` for demos. Billing updates and the database-level unique invoice idempotency keys are saved transactionally in PostgreSQL. Payments are simulated.

## Project commands

- `npm run dev` — start the development server
- `npm run db:generate` — generate the Prisma client
- `npm run db:migrate` — apply checked-in PostgreSQL migrations
- `npm run db:seed` — seed the P4 demo state once
- `npm run lint` — run ESLint
- `npm run build` — create a production build
