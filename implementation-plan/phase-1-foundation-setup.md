# Supabase Migration Overrides for Phase 1 (Use this instead of local PostgreSQL)

Objective: Replace all local PostgreSQL usage with Supabase (managed Postgres) while keeping Node.js, Express, Redis, and the rest of the stack unchanged.

Timebox: 1.5 hours (within the Phase 1 budget)

Success Criteria:
- Supabase project created with API keys available (Project URL, anon key, service role key)
- Required schemas exist in Supabase: user_schema, payment_schema, audit_schema, pricing_schema
- RLS enabled with baseline policies for all tables created in this phase
- All services connect to Supabase using SUPABASE_URL and service keys (server-side)
- Docker Compose has NO local PostgreSQL container

1) Create Supabase Project and Configure Keys
1.1 Install CLI: npm i -g supabase
1.2 Create project in dashboard: https://app.supabase.com -> New project (Starter is fine)
1.3 Note values from Project Settings -> API:
   - Project URL: https://<project-ref>.supabase.co
   - anon key (client)
   - service_role key (server, DO NOT expose to frontend)

2) Environment Variables (replace DATABASE_URL)
2.1 Add the following to each service's .env.example and .env:
- SUPABASE_URL=https://<project-ref>.supabase.co
- SUPABASE_ANON_KEY=<anon-key> (frontend only)
- SUPABASE_SERVICE_ROLE_KEY=<service-role-key> (backend services only)
- SUPABASE_DB_SCHEMA=<service-specific schema: user_schema|payment_schema|audit_schema|pricing_schema>

2.2 Remove DATABASE_URL usage from services; update db client to use @supabase/supabase-js.

3) Project Dependencies (per service)
3.1 Add: @supabase/supabase-js@^2, postgres.js (optional if needed), zod, jose (for jwt) remains
3.2 Shared: keep prom-client, winston, helmet, cors

4) Remove Local PostgreSQL from Docker Compose
4.1 Edit docker-compose.yml:
- Remove postgres service and any postgres volume mounts
- Ensure services only depend_on redis, not postgres
- No change to Prometheus/Grafana, Redis

5) Create Schemas in Supabase
5.1 In Supabase SQL Editor, run:
- CREATE SCHEMA IF NOT EXISTS user_schema;
- CREATE SCHEMA IF NOT EXISTS payment_schema;
- CREATE SCHEMA IF NOT EXISTS audit_schema;
- CREATE SCHEMA IF NOT EXISTS pricing_schema;

5.2 Optionally commit as migration using supabase CLI:
- supabase link --project-ref <ref>
- supabase db commit -m "init schemas"

6) Base Tables for Phase 1 (only minimal to start services)
6.1 user_schema base tables:
- users (id uuid primary key default gen_random_uuid(), email text unique, phone text, password_hash text, created_at timestamptz default now(), updated_at timestamptz default now())
- roles (id serial primary key, name text unique)
- user_roles (user_id uuid references user_schema.users(id), role_id int references user_schema.roles(id))

6.2 audit_schema base table:
- audit_logs (id bigserial primary key, event_time timestamptz default now(), actor_user_id uuid, type text, correlation_id text, payload jsonb, signature_hmac text)

6.3 payment_schema base tables:
- transactions (id uuid pk default gen_random_uuid(), user_id uuid, amount_minor int, currency text, status text, provider text, reference text unique, created_at timestamptz default now(), updated_at timestamptz default now())
- logbook_entries (id uuid pk default gen_random_uuid(), user_id uuid, type text, amount_minor int, currency text, note text, photo_url text, created_at timestamptz default now())

6.4 pricing_schema base tables:
- prices (id uuid pk default gen_random_uuid(), key text unique, amount_minor int, currency text, active boolean default true, updated_at timestamptz default now())
- price_history (id bigserial, key text, amount_minor int, currency text, changed_at timestamptz default now(), changed_by uuid)
- currency_rates (base text, quote text, rate numeric, fetched_at timestamptz)

7) Enable RLS + Baseline Policies
7.1 Enable RLS for all created tables:
- ALTER TABLE <schema>.<table> ENABLE ROW LEVEL SECURITY;

7.2 Policies (examples; refine in Phase 2+):
- For user-owned rows (transactions, logbook_entries):
  CREATE POLICY user_is_owner ON payment_schema.transactions
  FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY user_is_owner_ins ON payment_schema.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
- For admin read (map admin role via JWT custom claim): allow if current_setting('request.jwt.claims', true)::jsonb ? 'roles' AND 'admin' = ANY( (current_setting('request.jwt.claims', true)::jsonb -> 'roles')::text[] );

Note: If keeping custom JWT (User Service), configure API Gateway to sign JWTs with a roles claim. Use Supabase JWT secret for validating RLS if desired, or use service_role key from backend to bypass RLS for internal admin tasks.

8) Connectivity Test (per service)
8.1 Add a small bootstrap check on startup:
- Instantiate createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- Run a simple query: select 1 via rpc or select from prices limit 1
- Log success/failure with correlationId

9) Supabase Realtime (prepare for later phases)
9.1 Enable Realtime on audit_schema.audit_logs and payment_schema.transactions from Database -> Replication -> Realtime
9.2 Frontend will subscribe using anon key; backend can use service role for system subscriptions

10) Verification (End of Phase)
- [ ] docker compose up builds without postgres
- [ ] Services boot and pass startup Supabase connectivity check
- [ ] Schemas and base tables exist in Supabase
- [ ] RLS enabled with at least owner-read/insert policies where applicable

11) Troubleshooting
- Supabase connection fails: confirm SUPABASE_URL and key; check project is not paused
- RLS blocks queries: use service_role key server-side or adjust policies; inspect PostgREST error code
- gen_random_uuid() missing: enable pgcrypto extension in SQL: CREATE EXTENSION IF NOT EXISTS pgcrypto;
- Unique constraint errors: verify reference uniqueness (reference in transactions)

# Phase 1: Foundation Setup (6 hours)

Objective: Establish repo structure, Docker environment, base configs, database schemas, and CI to enable fast, consistent development across the team.

Timebox: 6 hours

Success Criteria:
1) docker compose up builds and runs all containers without error
2) PostgreSQL has user_schema, payment_schema, audit_schema, pricing_schema created
3) Redis is reachable; basic pub/sub test succeeds
4) CI pipeline runs lint + test on push
5) All services expose /health (200) and /metrics endpoints (returning Prometheus format)

---

1. Prerequisites and Tooling
1.1 Install Node.js >= 18, npm >= 8, Docker Desktop, GitHub account
1.2 Install PostgreSQL client (psql) and Redis CLI (optional)
1.3 Ensure ports available: 3000-3010, 3004 (frontend), 5432 (Postgres), 6379 (Redis), 9090 (Prometheus)

2. Repository Structure (root)
2.1 Create folders with exact names:
- /apps/web (Next.js frontend)
- /services/api-gateway
- /services/user-service
- /services/payment-service
- /services/audit-service
- /services/pricing-service
- /shared/libs (DTOs, typings, shared middlewares)
- /database/init (SQL init scripts)
- /monitoring (Prometheus, Grafana)
- /.github/workflows (CI)

2.2 Naming conventions:
- Kebab-case for folders and files (e.g., user-service)
- TypeScript strict mode for all services
- Common HTTP paths use plural nouns (/users, /payments, /prices, /audit-logs)

3. Environment Variables (.env files)
3.1 Create .env templates per service under each service folder, e.g., /services/payment-service/.env.example
Include:
- NODE_ENV=development
- PORT=300X
- DATABASE_URL=postgresql://postgres:password@postgres:5432/payment_system
- DB_SCHEMA=<service_specific_schema>
- REDIS_URL=redis://redis:6379
- JWT_SECRET=<set-in-user-service-and-api-gateway>
- LOG_LEVEL=info
- SERVICE_NAME=<service-name>
- PAYSTACK_SECRET_KEY=sk_test_xxx (payment-service only)
- FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-xxx (fallback)
- CURRENCY_API_KEY=<fixer_or_exchange_rate_api>
- TERMII_API_KEY=<or AFRICASTALKING_API_KEY>
- SENDGRID_API_KEY=<or MAILGUN_API_KEY>

3.2 Do NOT commit real secrets. Commit only .env.example.

4. Docker Compose Orchestration
4.1 Create docker-compose.yml in root with services:
- postgres: image postgres:15, volume postgres_data
- redis: image redis:7, volume redis_data
- api-gateway, user-service, payment-service, audit-service, pricing-service (Node 18 alpine images)
- prometheus, grafana
- web (Next.js)

4.2 Use multi-stage Dockerfiles per service (builder + runner). Keep images < 200MB.

4.3 Compose networking: all services on payment-net (bridge). Expose only api-gateway, web, grafana, prometheus to host.

5. Database Initialization
5.1 Create /database/init/01-init-schemas.sql containing:
- CREATE SCHEMA IF NOT EXISTS user_schema;
- CREATE SCHEMA IF NOT EXISTS payment_schema;
- CREATE SCHEMA IF NOT EXISTS audit_schema;
- CREATE SCHEMA IF NOT EXISTS pricing_schema;

5.2 Mount /database/init into postgres container at /docker-entrypoint-initdb.d

5.3 Verification (Success Criteria):
- After docker compose up, run psql -h localhost -U postgres -d payment_system -c "\dn" and ensure the four schemas exist.

6. Base Service Scaffolding
6.1 For each microservice create standard structure:
- src/app.ts (Express app setup with helmet, cors, json, /health, /metrics)
- src/server.ts (http server start)
- src/config/index.ts (env loader, schema)
- src/middlewares/correlationId.ts (X-Correlation-ID)
- src/middlewares/errorHandler.ts (structured error responses)
- src/logging/logger.ts (Winston JSON logger)
- src/routes/index.ts (register routes)
- src/metrics/metrics.ts (prom-client default + custom counters)
- src/db/index.ts (pg Pool with schema-qualified queries)
- tsconfig.json (strict: true)
- Dockerfile (multi-stage)
- package.json (scripts: dev, build, start, test)

6.2 API Gateway additions:
- src/middlewares/jwtAuth.ts (verify JWT)
- src/middlewares/rateLimiter.ts (Redis-based)
- src/proxy/routes.ts (route to internal services via http-proxy-middleware or axios)
- OpenAPI aggregation route /docs (serve swagger UI per service links)

6.3 User Service additions:
- src/domains/auth (controllers, services)
- src/domains/users (repository, DTOs)
- postgres tables in user_schema: users, roles, user_roles, refresh_tokens

6.4 Payment Service additions:
- src/domains/payments (controllers, services, repository)
- src/integrations/paystack (client, webhook handler)
- postgres tables in payment_schema: transactions, providers, pricing_snapshot

6.5 Audit Service additions:
- src/domains/audit (event store, append-only)
- postgres tables in audit_schema: audit_logs(event_time, type, payload, correlation_id, actor)

6.6 Pricing Service additions:
- src/domains/pricing (price catalogs, history)
- postgres tables in pricing_schema: prices, price_history, currency_rates

6.7 Shared library (/shared/libs):
- http client with correlation ID propagation
- types for common DTOs (UserDTO, PaymentDTO, AuditEvent)
- error types

7. CI/CD (GitHub Actions)
7.1 Create .github/workflows/ci.yml that runs on push/pull_request:
- uses actions/setup-node@v4 (node 18)
- npm ci for each service and apps/web
- run lint, typecheck, test
- build Docker images (no push) to validate Dockerfiles

7.2 Conventional commits: add commitlint config (optional for hackathon)

8. Observability Baseline
8.1 Logging: Winston JSON, include fields: timestamp, level, msg, service, correlationId, userId(optional)
8.2 Metrics: prom-client default metrics + http_request_duration_seconds, payment_processed_total
8.3 Tracing (optional): prepare OpenTelemetry SDK but defer full setup if time tight

9. Verification Checklist (End of Phase)
- [ ] docker compose up --build starts all containers
- [ ] GET http://localhost:3000/health returns 200 {status: "ok"}
- [ ] GET http://localhost:3000/metrics exposes Prometheus text
- [ ] psql shows four schemas
- [ ] Redis PUBLISH/ SUBSCRIBE test works between services

10. Troubleshooting
10.1 Containers crash on start: check env variables; run docker compose logs <service>
10.2 Postgres init scripts not applied: confirm volume is clean (docker compose down -v); ensure init path is mounted; check file encoding (LF)
10.3 Ports already in use: change published ports in compose or stop conflicting processes
10.4 Redis connection refused: verify container name and REDIS_URL; check firewall on Windows
10.5 Node memory errors during build: increase Docker resources or reduce build concurrency

