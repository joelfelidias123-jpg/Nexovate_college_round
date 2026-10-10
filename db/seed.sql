INSERT OR IGNORE INTO plans (id, name, description, price_cents, interval) VALUES
  ('launch', 'Launch', 'For small, growing teams', 1900, 'month'),
  ('growth', 'Growth', 'More room for your community', 4900, 'month'),
  ('scale', 'Scale', 'More volume, more momentum', 9900, 'month');

INSERT OR IGNORE INTO subscriptions (id, plan_id, status, anchor, current_period_start, current_period_end)
VALUES ('sub_nexus_demo', 'growth', 'active',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-8 days'),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-8 days'),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+22 days'));

INSERT OR IGNORE INTO usage_records (id, subscription_id, description, quantity, unit_amount_cents, recorded_at) VALUES
  ('usage_webinar_seed', 'sub_nexus_demo', 'Webinar registrations', 14, 15, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 days')),
  ('usage_email_seed', 'sub_nexus_demo', 'Email sends', 120, 2, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'));

INSERT OR IGNORE INTO invoices (id, subscription_id, period_start, period_end, lines_json, subtotal_cents, total_cents, status, idempotency_key, payment_reference, created_at)
VALUES ('seed-invoice-old', 'sub_nexus_demo',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now', 'start of month', '-1 month'),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now', 'start of month'),
  '[{"description":"Growth subscription","quantity":1,"unitAmountCents":4900,"amountCents":4900}]',
  4900, 4900, 'paid', 'sub_nexus_demo:seed-old-period', 'sim_seed_invoice_old',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now', 'start of month'));

INSERT OR IGNORE INTO campaigns (id, name, subject, preview, body_text, status, audience, recipients_json, created_at, sent_at, opens, clicks, generated_by) VALUES
  ('camp_welcome', 'Welcome to the community', 'A little something to get you started', 'Your next chapter starts here.', 'Thanks for joining us. We are glad you are here.', 'sent', 'All subscribers', '["alex@example.test","sam@example.test","lee@example.test"]', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-32 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-32 days'), 42, 17, 'starter'),
  ('camp_summit', 'Summit early access', 'Your early access invite is here', 'Save your seat for the summit.', 'Get early access to our upcoming summit.', 'sent', 'All subscribers', '["alex@example.test","sam@example.test","lee@example.test"]', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-61 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-61 days'), 31, 9, 'starter');

INSERT OR IGNORE INTO sites (id, slug, title, status, template_id, content_json, created_at, updated_at, published_at)
VALUES ('site_nexus_demo', 'nexus-studio', 'Nexus Studio', 'published', 'community',
  '{"headline":"Make what’s next","subheading":"A community for curious people building better ideas.","buttonText":"Join the next session"}',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-45 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days'));

INSERT OR IGNORE INTO webinars (id, site_id, title, slug, description, status, starts_at, ends_at, join_url, created_at) VALUES
  ('webinar_design_past', 'site_nexus_demo', 'Designing for what’s next', 'designing-for-whats-next', 'A conversation about turning early ideas into useful products.', 'completed', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days', '+1 hour'), 'https://example.com/replay/design', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-45 days')),
  ('webinar_community_upcoming', 'site_nexus_demo', 'Building a community that lasts', 'community-that-lasts', 'Practical ways to help a community grow with care.', 'published', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+5 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+5 days', '+1 hour'), 'https://example.com/join/community', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days'));

INSERT OR IGNORE INTO registrations (id, webinar_id, name, email, status, registered_at) VALUES
  ('reg_past_alex', 'webinar_design_past', 'Alex Morgan', 'alex@example.test', 'attended', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-40 days')),
  ('reg_past_sam', 'webinar_design_past', 'Sam Taylor', 'sam@example.test', 'attended', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-39 days')),
  ('reg_past_lee', 'webinar_design_past', 'Lee Jordan', 'lee@example.test', 'registered', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-38 days')),
  ('reg_upcoming_ada', 'webinar_community_upcoming', 'Ada Lovelace', 'ada@example.test', 'registered', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day')),
  ('reg_upcoming_grace', 'webinar_community_upcoming', 'Grace Hopper', 'grace@example.test', 'registered', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

INSERT OR IGNORE INTO attendance (id, webinar_id, registration_id, checked_in_at, source) VALUES
  ('att_past_alex', 'webinar_design_past', 'reg_past_alex', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days'), 'seed'),
  ('att_past_sam', 'webinar_design_past', 'reg_past_sam', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days'), 'seed');
