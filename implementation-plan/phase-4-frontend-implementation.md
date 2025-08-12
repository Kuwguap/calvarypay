# Supabase Migration Overrides for Phase 4 (Frontend)

Objective: Use Supabase for realtime subscriptions and optional client-side reads while keeping backend as the source of truth for writes.

Timebox: 1 hour

Success Criteria:
- Frontend configured with SUPABASE_URL and SUPABASE_ANON_KEY
- Realtime dashboard updates from audit_logs/transactions via Supabase channels
- Client-side reads allowed only for safe data; writes continue through API Gateway

1) Add Supabase Client to Web
1.1 npm i @supabase/supabase-js
1.2 Create apps/web/lib/supabaseClient.ts:
- export const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

2) Env Vars (Next.js)
2.1 Add to .env.local:
- NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
- NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>

3) Realtime Subscriptions
3.1 In dashboard components, subscribe to:
- supabase.channel('realtime:payment_schema:transactions').on('postgres_changes', { event: '*', schema: 'payment_schema', table: 'transactions' }, handler)
- supabase.channel('realtime:audit_schema:audit_logs').on('postgres_changes', { event: 'INSERT', schema: 'audit_schema', table: 'audit_logs' }, handler)
3.2 On message, invalidate React Query caches to refresh data

4) Client-side Reads (Optional)
4.1 For read-only public/own data and if RLS is configured safely, you may read directly using anon key and user JWT attached by API Gateway cookies
4.2 Otherwise, keep reads via API Gateway routes to maintain a single security boundary

5) Offline Digital Logbook
5.1 No change; offline queue posts to API Gateway when online
5.2 Optionally display realtime confirmation when the backend persists entry

6) Troubleshooting
- Realtime not updating: ensure table is enabled in Supabase Replication; verify correct schema/table names
- 401 reading from Supabase: frontend must have a user JWT if RLS requires it; otherwise use API routes

# Phase 4: Frontend Implementation (10 hours)

Objective: Build a Next.js 14+ app with TypeScript and Tailwind for Customer, Merchant, and Admin roles, supporting mobile-first UX and offline digital logbook.

Timebox: 10 hours

Success Criteria:
1) Role-based UI routes exist and are protected
2) Digital Logbook offline entry works; sync on reconnect
3) Payment initiation/verification flows work against Paystack
4) Financial Oversight Dashboard shows real-time metrics

---

1. Project Setup
1.1 Directory: /apps/web
1.2 Initialize Next.js 14 with TS: npx create-next-app@latest --ts
1.3 Add Tailwind CSS: follow official Next.js + Tailwind setup
1.4 Add dependencies: @tanstack/react-query, axios, zod, jotai (for simple state), @headlessui/react, recharts (charts)
1.5 Configure ESLint/Prettier per monorepo standards

2. App Structure (App Router)
2.1 /app/(public)/login/page.tsx
2.2 /app/(dashboard)/layout.tsx (top nav with role switch)
2.3 /app/(dashboard)/merchant/page.tsx
2.4 /app/(dashboard)/customer/page.tsx
2.5 /app/(dashboard)/admin/page.tsx
2.6 /app/(dashboard)/payments/new/page.tsx (initiate)
2.7 /app/(dashboard)/transactions/page.tsx (list)
2.8 /app/(dashboard)/logbook/page.tsx
2.9 /app/(dashboard)/pricing/page.tsx (admin)
2.10 /app/(dashboard)/reconciliation/page.tsx (admin)

3. Auth & API Client
3.1 Store JWT in httpOnly cookies; use /api/auth/login route in Next.js to call gateway
3.2 Create /lib/api.ts axios client injecting Authorization header and X-Correlation-ID
3.3 React Query: queryClient configured in providers
3.4 Protect routes via middleware.ts checking auth cookie; redirect to /login if absent

4. Digital Logbook (Offline-first)
4.1 Use IndexedDB (idb library) as offline queue (table: logbook_queue)
4.2 On submit offline, store record with timestamp, temp UUID
4.3 Background sync: on regain connectivity, POST queued entries to /logbook/entries and mark synced
4.4 Show sync status badges (pending, synced, failed)

5. Payment Flows (Paystack)
5.1 Initiate payment via /payments/initiate; receive authorization_url (Paystack)
5.2 Open authorization_url in new tab/modal; on return, poll /payments/:reference/status until success/failed
5.3 Handle bank transfer/mobile money if supported by Paystack region; fallback to card for demo

6. Financial Oversight Dashboard
6.1 Components:
- KPIs: Total volume, success rate, avg ticket, unmatched logbook count
- Charts: Volume over time, payment success/failure trends
- Tables: Recent transactions, recent logbook entries, discrepancies
6.2 Data sources:
- /transactions (paginated)
- /audit/logs?type=payment.*
- /reconciliation/reports/:date
6.3 Auto-refresh every 10s using React Query refetchInterval

7. Pricing Management (Admin)
7.1 List prices and edit inline; optimistic updates
7.2 PUT /prices/:key; on success, toast and refresh list
7.3 Show price history in a modal (GET /prices/history?key=)

8. Accessibility & Internationalization
8.1 Accessible components (labels, keyboard nav)
8.2 i18n: start with English; add text tokens enabling easy extension to Swahili, Hausa, French
8.3 Mobile-first: Tailwind responsive classes; test on 360px width

9. Validation & Error UX
9.1 Use zod schemas to validate forms client-side
9.2 Display field errors and server errors distinctly
9.3 Retry affordances for failed sync/payment polling

10. Verification Checklist (End of Phase)
- [ ] Login + protected routes function on mobile and desktop
- [ ] Offline logbook entries sync reliably after reconnect
- [ ] Paystack flow completes and surfaces statuses
- [ ] Dashboard renders metrics and updates periodically

11. Troubleshooting
11.1 CORS errors: ensure gateway allows frontend origin; set with credentials
11.2 Cookie issues on localhost: use sameSite=lax; secure=false for http; match domain/port
11.3 IndexedDB blocked: check private browsing limitations; fallback to localStorage for demo
11.4 Slow charts: limit data window and use virtualization for long tables

