# Supabase Migration Overrides for Phase 6 (Deployment & Monitoring)

Objective: Deploy services configured to use Supabase cloud (no local Postgres) with secure key management and monitoring.

Timebox: 0.5 hour

Success Criteria:
- docker-compose.prod.yml has no postgres
- Services read SUPABASE_* env vars at runtime
- Grafana dashboards work; realtime flows in production

1) Docker Compose (Prod) Changes
1.1 Remove postgres service entirely
1.2 Ensure env vars include:
- SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (services)
- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (web)
1.3 Secrets management: mount via Docker secrets or env_file not checked into repo

2) Supabase Configuration
2.1 Verify RLS policies are correct for production
2.2 Rotate service_role key after demos if shared broadly
2.3 Enable backups and Point-in-Time Recovery (managed by Supabase)

3) Monitoring
3.1 Add business panels to Grafana using Supabase Realtime counts (front-end) + service metrics
3.2 Database health via Supabase Dashboard (connections, CPU, errors)

4) Security
4.1 Never expose service_role key to frontend; only anon key publicly
4.2 Gateway signs JWTs with roles claim matching RLS policies
4.3 Webhook endpoints validate HMAC and verify transaction with Paystack

5) Verification
- [ ] One-command deploy succeeds
- [ ] Payments flow works in prod; audit logs and dashboards update realtime
- [ ] RLS prevents cross-tenant data access

6) Troubleshooting
- Prod-only RLS issues: log PostgREST errors returned in response; compare claims vs policies
- Realtime blocked: check hosting provider websockets configuration and ports

# Phase 6: Deployment & Monitoring (4 hours)

Objective: Ship production-ready containers, deploy with Docker Compose (or minimal K8s if desired), and set up monitoring and docs.

Timebox: 4 hours

Success Criteria:
1) Production build images with multi-stage Dockerfiles
2) One-command deploy: docker compose -f docker-compose.prod.yml up -d
3) Prometheus and Grafana running with service dashboards
4) Documentation published: API docs, deployment guide, runbook

---

1. Production Docker Images
1.1 Dockerfile best practices per service:
- FROM node:18-alpine AS builder; install deps, build, prune devDeps
- FROM node:18-alpine AS runner; copy dist + production deps; run as non-root
- Set NODE_ENV=production; use tini; enable HEALTHCHECK
1.2 Enable SIGTERM handling (graceful shutdown)
1.3 Use .dockerignore to keep images small

2. Production Compose
2.1 Create docker-compose.prod.yml
- Use env_file for secrets (mounted as Docker secrets if available)
- Expose only API Gateway and Frontend
- Configure Postgres WAL archiving (optional)
- Configure Redis persistence (appendonly yes)

2.2 Sample command:
- docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

3. Monitoring Stack
3.1 Prometheus config (monitoring/prometheus.yml): scrape jobs for all services and Node exporter (optional)
3.2 Grafana provisioning:
- monitoring/grafana/datasources/datasource.yml -> Prometheus
- monitoring/grafana/dashboards/*.json -> Node.js, Postgres, Business KPIs
3.3 Alerts (Grafana):
- Payment failure rate > 5%
- Webhook error rate > 1%
- High latency P95 > 200ms

4. Security Hardening
4.1 HTTPS termination at load balancer (Caddy or Nginx); use Let's Encrypt
4.2 Rotate JWT and API keys; configure key vault or Docker secrets
4.3 Set secure, httpOnly cookies; sameSite=lax; CSRF on sensitive routes
4.4 Restrict CORS to known origins; set HSTS; disable TRACE methods

5. Documentation & Runbooks
5.1 Deployment guide: prerequisites, env vars, commands, rollback steps
5.2 API docs: link per service /docs and aggregated at gateway
5.3 Runbook: on-call procedures for webhook failure, DB outage, Redis stall
5.4 ERD: include schema diagrams and explanation

6. Verification Checklist (End of Phase)
- [ ] Prod compose runs cleanly
- [ ] Frontend reachable over HTTPS
- [ ] Grafana shows live metrics with alerts
- [ ] End-to-end payment verified in prod

7. Troubleshooting
7.1 Image cannot start: verify node:alpine compatibility with native modules; rebuild with --no-cache
7.2 TLS issues: confirm DNS and certificate issuance; check reverse proxy config
7.3 Prometheus scrape errors: validate /metrics paths; container network names
7.4 Postgres load: add read replica for dashboards; optimize indexes on transactions

