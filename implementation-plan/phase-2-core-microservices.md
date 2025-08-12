# Supabase Migration Overrides for Phase 2 (Core Microservices)

Objective: Replace pg Pool with Supabase JS client across services; configure RLS-aware access; wire Paystack + Audit with Supabase.

Timebox: 2 hours (inside Phase 2 budget)

Success Criteria:
- All services use @supabase/supabase-js with SUPABASE_SERVICE_ROLE_KEY
- RLS policies permit intended operations; admin endpoints use service role; user endpoints rely on JWT with roles
- Paystack webhook writes to Supabase; audit logs append successfully

1) Dependencies and Client Setup
1.1 Per service: npm i @supabase/supabase-js
1.2 Create src/db/supabase.ts in each service:
- export function getSupabaseClient() { return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: process.env.SUPABASE_DB_SCHEMA } }); }
1.3 Replace imports of pg Pool with calls through this client

2) Repository Pattern Updates
2.1 Example read:
- const { data, error } = await supabase.from('transactions').select('*').eq('user_id', userId).limit(50)
2.2 Example insert:
- await supabase.from('transactions').insert([{ ...payload }])
2.3 Use .single() for singular selects; always check error and log with correlationId

3) RLS-aware Access
3.1 For user-bound routes (e.g., GET /transactions), optionally create a user-scoped client using the user's JWT:
- createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${userJwt}` } }, db: { schema: 'payment_schema' } })
3.2 For admin tasks, use service role client to bypass RLS
3.3 Add JWT roles claim at login (User Service) to support RLS policy checks

4) Supabase Auth vs Custom Auth
4.1 Keep custom JWT for hackathon speed; do NOT switch to Supabase Auth midstream
4.2 Optionally sync users into user_schema.users; passwords remain bcrypt hashed in service
4.3 Future: migrate to Supabase Auth using GoTrue; out of scope for 48h

5) Schema Additions for Phase 2
5.1 Payment: add unique index on transactions.reference
5.2 Audit: add GIN index on audit_logs(payload) for searching
5.3 Pricing: unique on prices.key

6) Paystack Webhook Writing
6.1 On webhook receipt:
- validate signature
- supabase.from('transactions').update({ status: 'success' | 'failed' }).eq('reference', ref)
- supabase.from('audit_logs').insert([{ type: 'payment.succeeded', payload, correlation_id }])

7) Realtime Configuration
7.1 In Supabase dashboard enable Realtime for payment_schema.transactions and audit_schema.audit_logs
7.2 Frontend subscribes to channel: supabase.channel('realtime:public:*') with filters to those tables

8) OpenAPI remains unchanged (models reflect Supabase tables)

9) Troubleshooting
- PostgREST 401/403: using anon key without JWT; switch to service role or pass user JWT
- RLS blocks admin: admin endpoints must use service role client
- Missing data: schema mismatch—ensure SUPABASE_DB_SCHEMA matches table location

# Phase 2: Core Microservices (12 hours)

Objective: Implement API Gateway, User Service, Payment Service (with Paystack), and Audit Service with production-ready patterns.

Timebox: 12 hours

Success Criteria:
1) API Gateway authenticates JWT, enforces rate limits, and routes to services
2) User Service supports register/login/refresh and role-based access
3) Payment Service creates charges via Paystack and handles webhooks
4) Audit Service records immutable events from User and Payment services
5) OpenAPI docs available for all services

---

1. API Gateway (Express + TypeScript)
1.1 Directory: /services/api-gateway
1.2 Key files:
- src/app.ts: express app, helmet, cors, json, routes
- src/middlewares/jwtAuth.ts: validate Authorization: Bearer <token>
- src/middlewares/rateLimiter.ts: Redis-based token bucket (key: IP + path)
- src/middlewares/correlationId.ts: read/generate X-Correlation-ID
- src/routes/public.ts: /health, /metrics, /docs
- src/routes/proxy.ts: /api/users/* -> user-service; /api/payments/* -> payment-service; /api/audit/* -> audit-service
- src/utils/httpProxy.ts: axios client with timeout, retries, correlation-id propagation
1.3 Rate limiting: 100 req/min per IP for auth routes, 300 req/min for others
1.4 Security: helmet with HSTS, no sniff, CSP (report-only)
1.5 Success check: unauthenticated access to protected routes returns 401; valid JWT passes and routes correctly

2. User Service (Auth & RBAC)
2.1 Directory: /services/user-service
2.2 Database (user_schema):
- users(id uuid pk, email unique, phone, password_hash, created_at, updated_at)
- roles(id serial pk, name unique)
- user_roles(user_id fk, role_id fk)
- refresh_tokens(id uuid, user_id fk, token_hash, expires_at, revoked boolean)
2.3 Endpoints:
- POST /auth/register {email, phone, password}
- POST /auth/login {email, password} -> {accessToken, refreshToken}
- POST /auth/refresh {refreshToken}
- GET /users/me (auth)
- POST /users/assign-role (admin)
2.4 Implementation notes:
- Use bcrypt (12 rounds) for password hashing
- JWT: HS256 with 15m access, 7d refresh; store refresh token hash
- Input validation with zod or joi
- Publish audit events to Redis channel audit.events
- Metrics: auth_success_total, auth_failed_total
2.5 Success check: end-to-end register->login->me works; roles gate admin endpoint

3. Payment Service (Paystack Integration)
3.1 Directory: /services/payment-service
3.2 Database (payment_schema):
- transactions(id uuid pk, user_id, amount_minor int, currency text, status text, provider text, reference text unique, created_at, updated_at)
- pricing_snapshot(id uuid, transaction_id fk, price_key text, amount_minor int, currency text)
3.3 Endpoints:
- POST /payments/initiate {amount, currency, channel(card|bank|mobile), metadata}
- GET /payments/:reference/status
- POST /webhooks/paystack (no auth, HMAC validation via x-paystack-signature)
- GET /transactions (auth, paginated, filter by status)
3.4 Paystack Integration:
- Use secret key from PAYSTACK_SECRET_KEY
- Initiate transaction via /transaction/initialize
- Verify via /transaction/verify/:reference
- Validate webhook signature (compute HMAC-SHA512 of body with secret)
- Support NGN primarily; map KES/GHS/ZAR via currency API if needed
3.5 Events:
- Publish payment events to Redis: payment.initiated, payment.succeeded, payment.failed
- Append audit logs to Audit Service via HTTP + Redis
3.6 Success check: happy-path card payment from init -> webhook -> verified -> status=success

4. Audit Service (Event Sourcing)
4.1 Directory: /services/audit-service
4.2 Database (audit_schema):
- audit_logs(id bigserial pk, event_time timestamptz, actor_user_id uuid, type text, correlation_id text, payload jsonb, signature_hmac text)
4.3 Endpoints:
- POST /audit/logs (internal) {type, actor_user_id, payload}
- GET /audit/logs?type=&userId=&from=&to= (admin)
- GET /reports/daily (admin) summarizing transactions
4.4 Implementation notes:
- Sign each log payload with HMAC (AUDIT_HMAC_SECRET) for tamper-evidence
- Only append; no update/delete
- Subscribe to Redis channels (audit.events, payment.*) and persist
4.5 Success check: events from User and Payment appear in DB; daily report endpoint aggregates

5. OpenAPI Documentation
5.1 Each service has openapi.yaml under /openapi
5.2 Use swagger-ui-express to serve at /docs
5.3 API Gateway exposes links directory at /docs
5.4 Success check: All endpoints documented and navigable

6. Security & Hardening
6.1 helmet.js in all services; disable x-powered-by
6.2 Input validation everywhere; sanitize outputs
6.3 JWT validation at gateway; scopes/roles on services as defense in depth
6.4 HMAC validation for Paystack webhook and audit log signatures

7. Troubleshooting
7.1 401 on valid tokens: check clock skew; ensure same JWT_SECRET between gateway and user service
7.2 Paystack webhook not firing: ensure public tunnel (ngrok) and correct callback URL; verify signature header name
7.3 Duplicate transactions: enforce unique(reference); implement idempotency keys via Idempotency-Key header
7.4 Redis events not received: confirm channel names and JSON payload; check firewall on Windows

