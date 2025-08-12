# Supabase Migration Overrides for Phase 3 (Business Logic)

Objective: Implement domain engines using Supabase as persistence with RLS-aware access, plus Realtime for dashboards.

Timebox: 1.5 hours

Success Criteria:
- Transaction Engine reads/writes via Supabase client with idempotency
- Digital Logbook persisted in payment_schema.logbook_entries with RLS enforcing ownership
- Pricing updates publish Redis event and persist price_history in Supabase
- Reconciliation reads from Supabase and produces reports

1) Transaction Engine Changes
1.1 Replace repository.ts SQL with Supabase calls (from('transactions').insert/update/select)
1.2 Idempotency: store Idempotency-Key in audit_schema.audit_logs or a dedicated table; reject duplicates within 15m
1.3 Currency normalization remains in service layer

2) Digital Logbook
2.1 from('logbook_entries').insert for creation
2.2 Policies: only owner can read/write their entries
2.3 Indexes: create index on (user_id, created_at) for quick range queries

3) Pricing Service
3.1 from('prices').upsert for price changes; insert into price_history
3.2 Currency rates table populated via scheduled job (cron / worker)
3.3 Publish pricing.updated on Redis upon successful change

4) Reconciliation Engine
4.1 Use Supabase client with service role to query across transactions + logbook_entries
4.2 Perform time-window and amount proximity matching in service code; persist report as audit_logs event type reconciliation.report
4.3 Expose report via GET endpoint serving from Supabase (or generated on demand)

5) Realtime for Dashboards
5.1 Enable Realtime on payment_schema.transactions and payment_schema.logbook_entries
5.2 Frontend subscribes to channels to update dashboard counts without polling

6) Verification
- [ ] Price update creates price_history row and sends Redis event
- [ ] Matching reconciliation for a known pair (txn + logbook entry)
- [ ] Realtime updates the dashboard on new transaction

7) Troubleshooting
- RLS denials: switch to service role for admin/report endpoints
- Realtime not firing: ensure table is enabled in Database -> Replication and correct schema
- Upsert conflicts: ensure key uniqueness; use onConflict: 'key'

# Phase 3: Business Logic Layer (8 hours)

Objective: Implement core domain engines and supporting services to deliver MVP features: Digital Transaction Tracking, Pricing, Reconciliation, Notifications.

Timebox: 8 hours

Success Criteria:
1) Digital logbook entries are captured and reconciled against transactions
2) Pricing rules are centrally managed and snapshotted on payments
3) Reconciliation engine flags discrepancies and produces a report
4) Notification engine delivers SMS/email on payment status changes

---

1. Transaction Engine (Payment Service)
1.1 Directory: /services/payment-service/src/domains/transactions
1.2 Components:
- controller.ts: REST endpoints (initiate, status, list)
- service.ts: business rules (idempotency, validation, currency normalization)
- repository.ts: postgres access (schema-qualified)
- dto.ts: request/response types
- mapper.ts: db <-> domain mapping
1.3 Rules:
- Amounts stored in minor units (kobo, cents)
- Currency allowed: NGN, KES, GHS, ZAR
- Idempotency via Idempotency-Key header + Redis setex for 15m
- On initiate: snapshot current prices from pricing service

2. Digital Logbook (Payment Service)
2.1 Directory: /services/payment-service/src/domains/logbook
2.2 Endpoints:
- POST /logbook/entries {type:fuel|cash|misc, amount_minor, currency, note, photo_url?}
- GET /logbook/entries?from=&to=&type=
2.3 Storage:
- payment_schema.logbook_entries(id uuid, user_id, type, amount_minor, currency, note, photo_url, created_at)
2.4 Behavior:
- Offline support: frontend queues entries; backend accepts backdated timestamps
- Reconciliation joins logbook entries to transactions by time window and amount proximity

3. Pricing Service (Standalone)
3.1 Directory: /services/pricing-service
3.2 Database (pricing_schema):
- prices(id uuid, key text unique, amount_minor int, currency text, active boolean, updated_at)
- price_history(id bigserial, key, amount_minor, currency, changed_at, changed_by)
- currency_rates(base text, quote text, rate numeric, fetched_at)
3.3 Endpoints:
- GET /prices
- PUT /prices/:key {amount_minor, currency}
- GET /prices/:key
- GET /currency/rates?base=NGN&quotes=KES,GHS,ZAR
3.4 Behavior:
- On update, append to price_history and publish Redis event pricing.updated
- Payment service caches prices with TTL 60s; fetches on miss
- Currency rates fetched from Fixer.io/ExchangeRate-API hourly (cron)

4. Reconciliation Engine (Audit or Payment Service)
4.1 Directory: /services/audit-service/src/domains/reconciliation
4.2 Inputs:
- payment_schema.transactions
- payment_schema.logbook_entries
- audit_schema.audit_logs
4.3 Logic:
- Match transaction to logbook by amount + timestamp ± 10 minutes + user_id
- Flag unmatched entries and transactions
- Generate daily report (JSON + CSV) with summary metrics
4.4 Endpoints:
- POST /reconciliation/run?date=YYYY-MM-DD (admin)
- GET /reconciliation/reports/:date

5. Notification Engine (Payment Service)
5.1 Directory: /services/payment-service/src/domains/notifications
5.2 Providers:
- SMS: Termii or Africa's Talking
- Email: SendGrid or Mailgun
5.3 Triggers:
- payment.succeeded -> SMS + Email
- payment.failed -> SMS
- reconciliation.summary_ready -> Email (admin)
5.4 Implementation:
- Provider clients with retry + exponential backoff
- Templates in /templates (handlebars or nunjucks)
- Publish notification jobs to Redis queue (BullMQ) to avoid blocking requests

6. Cross-Cutting Concerns
6.1 Correlation IDs: propagate via X-Correlation-ID across all HTTP and event messages
6.2 Error Handling: consistent ApiError class; map to HTTP codes; include error codes
6.3 Metrics: increment counters for reconciliation matches, unmatched, notifications sent, price updates
6.4 RBAC: Admin-only endpoints for price updates and reconciliation

7. Verification Checklist (End of Phase)
- [ ] Create price key fuel_price; update and see cache invalidation
- [ ] Create payment referencing fuel_price snapshot; verify stored
- [ ] Create corresponding logbook entry; run reconciliation; see matched
- [ ] Trigger payment.succeeded; receive SMS on test number

8. Troubleshooting
8.1 Price updates not reflected: clear Redis cache; verify pricing.updated event consumed by payment-service
8.2 Reconciliation misses matches: adjust time window; verify currency normalization
8.3 SMS not delivered: check provider sandbox; ensure sender ID/route enabled; inspect provider logs
8.4 BullMQ jobs stuck: verify Redis connection; check worker concurrency and stalled job config

