# SmartSpend

A personal finance mobile app for Indian college students. Track UPI payments, mess bills, society fees, set monthly budgets, and get AI-powered spending insights via Gemini.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080 → proxied at /api)
- `pnpm --filter @workspace/mobile run dev` — run the Expo mobile app (port 18115)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `SESSION_SECRET` — JWT signing secret
- Required env: `GEMINI_API_KEY` — Google Gemini API key

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + JWT auth (jsonwebtoken + bcryptjs)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Mobile: Expo + Expo Router (file-based routing)
- AI: Google Gemini 1.5 Flash (via GEMINI_API_KEY)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle table definitions (users, transactions, budgets, categories)
- `artifacts/api-server/src/routes/` — Express route handlers (auth, transactions, budgets, categories, analytics, ai)
- `artifacts/api-server/src/lib/auth.ts` — JWT sign/verify + requireAuth middleware
- `artifacts/mobile/app/` — Expo Router screens (auth stack, 5 tabs, transaction modals)
- `artifacts/mobile/contexts/AuthContext.tsx` — JWT auth state + AsyncStorage persistence
- `artifacts/mobile/constants/colors.ts` — design tokens (emerald green + navy dark)

## Architecture decisions

- JWT-based auth (stateless) — tokens stored in AsyncStorage on mobile, 30-day expiry
- All AI routes use Google Gemini 1.5 Flash directly via GEMINI_API_KEY (not Replit integration)
- Predefined categories seeded in DB on first request (userId=null means global default)
- Transaction amounts stored as `numeric(12,2)` in Postgres, returned as JS `number`
- Budget upsert: creating a budget for an existing category/month updates the amount

## Product

- Auth: Register/login with email + password
- Transactions: Create, edit, delete with Indian categories (UPI, Mess, Society Fees, etc.)
- Budgets: Monthly budget planner with animated progress bars + over-budget alerts
- AI Insights: Natural language spending queries + auto-categorization + monthly AI summary
- Dashboard: Monthly income/expense/savings summary + top spending categories
- Reports: Monthly trend bar chart + category breakdown with percentages

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Do NOT run `pnpm dev` at workspace root (no root dev script by design)
- After any schema change: run `pnpm --filter @workspace/db run push` then restart api-server
- After any openapi.yaml change: run `pnpm --filter @workspace/api-spec run codegen`
- The tabs layout tries NativeTabs first (iOS 26+), falls back to classic Tabs
- AI categorize endpoint: note + amount → Gemini → suggested category (tap ⚡ in new transaction form)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
