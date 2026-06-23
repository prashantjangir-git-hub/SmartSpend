# SmartSpend

A personal finance mobile app built for Indian college students. Track UPI payments, mess bills, society fees, set monthly budgets, and get AI-powered spending insights — all in one place.

---

## Features

- **Auth** — Register and log in with email + password (JWT-based)
- **Transactions** — Add, edit, delete income/expense with Indian categories (UPI, Mess, Society Fees, etc.)
- **Budget Planner** — Set monthly budgets per category with animated progress bars and over-budget alerts
- **AI Insights** — Ask questions in plain English ("How much did I spend on food?") powered by Google Gemini
- **AI Auto-Categorize** — Type a transaction note and let AI suggest the category
- **Dashboard** — Monthly summary card with income, expense, savings rate and top categories
- **Reports** — Monthly trend chart and category breakdown with percentages
- **Recurring Transactions** — Mark bills as daily/weekly/monthly recurring

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | Expo + Expo Router (React Native) |
| Backend | Express 5 + Node.js |
| Database | PostgreSQL + Drizzle ORM |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| AI | Google Gemini 1.5 Flash |
| API Contract | OpenAPI 3.1 + Orval codegen |
| Monorepo | pnpm workspaces |

---

## Project Structure

```
smartspend/
├── artifacts/
│   ├── api-server/        # Express API backend
│   └── mobile/            # Expo React Native app
├── lib/
│   ├── api-spec/          # OpenAPI spec (source of truth)
│   ├── api-client-react/  # Auto-generated React Query hooks
│   ├── api-zod/           # Auto-generated Zod schemas
│   └── db/                # Drizzle ORM schema + client
└── scripts/               # Utility scripts
```

---

## Getting Started

### Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [pnpm](https://pnpm.io/installation) — `npm install -g pnpm`
- [PostgreSQL](https://www.postgresql.org/) database
- [Expo Go](https://expo.dev/go) app on your phone (for mobile preview)
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/SmartSpend.git
cd SmartSpend
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

Create a `.env` file in the root:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/smartspend
SESSION_SECRET=your-secret-key-here
GEMINI_API_KEY=your-gemini-api-key-here
```

### 4. Set up the database

```bash
pnpm --filter @workspace/db run push
```

### 5. Run codegen (generates API hooks from OpenAPI spec)

```bash
pnpm --filter @workspace/api-spec run codegen
```

### 6. Start the API server

```bash
pnpm --filter @workspace/api-server run dev
```

The API will be available at `http://localhost:8080/api`

### 7. Start the mobile app

```bash
pnpm --filter @workspace/mobile run dev
```

Scan the QR code with Expo Go on your phone.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm --filter @workspace/api-server run dev` | Start API server (dev mode) |
| `pnpm --filter @workspace/mobile run dev` | Start Expo mobile app |
| `pnpm run typecheck` | Full TypeScript check |
| `pnpm --filter @workspace/api-spec run codegen` | Regenerate API hooks from OpenAPI spec |
| `pnpm --filter @workspace/db run push` | Push DB schema changes |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/transactions` | List transactions (filterable) |
| POST | `/api/transactions` | Create a transaction |
| PATCH | `/api/transactions/:id` | Update a transaction |
| DELETE | `/api/transactions/:id` | Delete a transaction |
| GET | `/api/budgets` | List budgets with spending progress |
| POST | `/api/budgets` | Create/update a monthly budget |
| GET | `/api/categories` | List all categories |
| GET | `/api/analytics/summary` | Dashboard summary |
| GET | `/api/analytics/monthly` | Monthly income vs expense trends |
| GET | `/api/analytics/categories` | Spending by category |
| POST | `/api/ai/query` | Natural language spending query |
| POST | `/api/ai/categorize` | Auto-categorize a transaction |
| GET | `/api/ai/summary` | AI-generated monthly summary |

---

## Default Categories

Food & Mess · Transport · Entertainment · Shopping · Education · Society Fees · Rent · Health · UPI Transfer · Salary · Pocket Money · Freelance · Subscriptions · Other
