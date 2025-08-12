# Supabase Migration Overrides for Phase 5 (Integration & Testing)

Objective: Validate end-to-end with Supabase, including RLS policies, webhook persistence, realtime dashboards, and tests.

Timebox: 1 hour

Success Criteria:
- Services write/read via Supabase with correct RLS behavior
- Paystack webhook updates transactions and inserts audit logs
- Postman + Jest run against Supabase

1) Update Postman Environment
1.1 Add variables: SUPABASE_URL, project-ref; ensure baseUrl points to API Gateway
1.2 Add pre-request script to set X-Correlation-ID and Authorization

2) Jest Integration Tests
2.1 Use service role key in test env to seed data safely
2.2 BeforeAll: create test user, price, initiate payment; AfterAll: cleanup rows by reference
2.3 Mock external calls where needed (SMS provider) but keep Paystack verify path live or stubbed

3) Supabase Policies Test Cases
3.1 Attempt to read another user's transactions with anon key -> expect 401/403
3.2 Admin read with service role -> expect 200 and full dataset
3.3 Insert logbook entry with mismatched user_id -> expect 403

4) Webhook End-to-End
4.1 Use ngrok to expose /webhooks/paystack
4.2 Complete a test charge in Paystack sandbox
4.3 Verify:
- transactions.status updated to success
- audit_logs insert with type payment.succeeded
- dashboard receives realtime update

5) Monitoring Validation
5.1 Confirm /metrics includes database-related counters (e.g., supabase_request_total)
5.2 Grafana panels show API latency, payment success rate

6) Troubleshooting
- RLS failing tests: verify JWT roles claim and policy logic; use EXPLAIN with PostgREST errors
- Realtime not received in web: check channel names and event filters; verify network blocks (corporate firewalls)

# Phase 5: Integration & Testing (8 hours)

Objective: Wire all services end-to-end, implement Paystack webhooks, and validate flows via automated and manual tests.

Timebox: 8 hours

Success Criteria:
1) End-to-end payment works: initiate -> Paystack auth -> webhook -> verify -> dashboard reflects success
2) Digital logbook entries reconcile with transactions; discrepancies visible
3) All services publish metrics and logs; Grafana shows dashboards
4) Postman collection + Jest integration tests pass locally and in CI

---

1. Service-to-Service Communication
1.1 Ensure API Gateway routes to /api/users, /api/payments, /api/audit, /api/pricing
1.2 Add correlation ID propagation in axios clients; log in each service
1.3 Add idempotency middleware using Idempotency-Key header for POST endpoints

2. Paystack Webhook Handling
2.1 Expose /webhooks/paystack in payment-service
2.2 Validate x-paystack-signature (HMAC-SHA512 with PAYSTACK_SECRET_KEY)
2.3 On charge.success, set transaction status=success and publish payment.succeeded event
2.4 On charge.failed, set status=failed and publish payment.failed event
2.5 Return 200 quickly; offload heavy work to background jobs (BullMQ)

3. Test Data & Postman
3.1 Create ./tests/postman/EliteEpay.postman_collection.json with folders: Auth, Payments, Logbook, Pricing, Audit
3.2 Add environment file with baseUrl=http://localhost:3000 and auth tokens
3.3 Provide sample payloads for initiate payment and logbook entries
3.4 Document pre-request scripts to set correlationId

4. Automated Tests
4.1 Unit tests (Jest) for service-layer logic: auth, pricing updates, reconciliation matching
4.2 Integration tests (Supertest) for key endpoints: /auth/register, /payments/initiate, /webhooks/paystack, /audit/logs
4.3 Use testcontainers (optional) to spin up ephemeral Postgres/Redis in CI

5. Observability Validation
5.1 Prometheus: confirm /metrics endpoint exposes http_request_duration_seconds and business counters
5.2 Grafana: import basic dashboards for Node.js + custom business metrics
5.3 Create alerts: high error rate (>5% 5m), webhook failures, Redis latency

6. Performance Checks
6.1 k6 or autocannon smoke test: 100 RPS for 1 minute on /payments/initiate and /transactions
6.2 Validate response time P95 < 200ms, DB query P99 < 50ms (use explain analyze if needed)

7. Security Validation
7.1 JWT validation across services; blacklisted refresh tokens denied
7.2 Helmet headers present; CORS locked to frontend origin
7.3 Input validation errors return 400 with structured error body
7.4 Webhook endpoint only accepts valid signatures

8. Verification Checklist (End of Phase)
- [ ] All Postman tests pass
- [ ] k6/autocannon meets latency targets
- [ ] Grafana shows live metrics and alerts configured
- [ ] Payments succeed and appear in reconciliation

9. Troubleshooting
9.1 Webhook signature mismatch: ensure raw body used for HMAC; disable body-parser on that route and parse raw
9.2 Flaky tests due to timing: add retries/backoff; increase webhook polling timeout
9.3 Missing metrics: ensure prom-client register metrics once (avoid duplicate registration)
9.4 Random 500s: inspect service logs with correlationId; check DB connection pool limits

