PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  interval TEXT NOT NULL CHECK (interval IN ('month', 'year'))
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL CHECK (status IN ('trialing', 'active', 'canceled')),
  anchor TEXT NOT NULL,
  current_period_start TEXT,
  current_period_end TEXT,
  canceled_at TEXT
);

CREATE TABLE IF NOT EXISTS usage_records (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id),
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_amount_cents INTEGER NOT NULL CHECK (unit_amount_cents >= 0),
  recorded_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id),
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  lines_json TEXT NOT NULL,
  subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  status TEXT NOT NULL CHECK (status IN ('paid')),
  idempotency_key TEXT NOT NULL UNIQUE,
  payment_reference TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview TEXT NOT NULL,
  body_text TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  audience TEXT NOT NULL,
  recipients_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  scheduled_at TEXT,
  sent_at TEXT,
  opens INTEGER NOT NULL DEFAULT 0 CHECK (opens >= 0),
  clicks INTEGER NOT NULL DEFAULT 0 CHECK (clicks >= 0),
  send_error TEXT,
  generated_by TEXT CHECK (generated_by IS NULL OR generated_by IN ('gemini', 'starter'))
);

CREATE TABLE IF NOT EXISTS campaign_events (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('open', 'click')),
  target_url TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  template_id TEXT NOT NULL,
  content_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS webinars (
  id TEXT PRIMARY KEY,
  site_id TEXT REFERENCES sites(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'completed', 'canceled')),
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  join_url TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  webinar_id TEXT NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('registered', 'attended', 'canceled')),
  registered_at TEXT NOT NULL,
  UNIQUE (webinar_id, email)
);

CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  webinar_id TEXT NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
  registration_id TEXT NOT NULL UNIQUE REFERENCES registrations(id) ON DELETE CASCADE,
  checked_in_at TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual'
);

CREATE INDEX IF NOT EXISTS idx_usage_subscription_period ON usage_records(subscription_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_invoice_subscription_period ON invoices(subscription_id, period_start);
CREATE INDEX IF NOT EXISTS idx_campaigns_status_schedule ON campaigns(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_webinars_status_start ON webinars(status, starts_at);
CREATE INDEX IF NOT EXISTS idx_registrations_webinar ON registrations(webinar_id, registered_at);
CREATE INDEX IF NOT EXISTS idx_attendance_webinar ON attendance(webinar_id, checked_in_at);
