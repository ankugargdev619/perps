# Perps Platform — Implementation Plan (Web2 MVP)

**Repository:** `/home/ankugarg/super30/perps`  
**Document date:** May 24, 2026  

**Scope:** A **Web2** perpetuals-style trading platform — custodial ledger, email/password auth, REST + WebSocket APIs, and a Next.js terminal. **No blockchain, wallets, smart contracts, or on-chain settlement.**

**Estimated timelines**

| Track | Solo / small team | Team (3–4 engineers) |
|-------|-------------------|----------------------|
| **Web2 MVP** — Phases 0–7 | **14–18 weeks** | **10–14 weeks** |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Architecture Decisions](#3-architecture-decisions)
4. [Target Architecture](#4-target-architecture)
5. [System Components](#5-system-components)
6. [Data Model (Prisma)](#6-data-model-prisma)
7. [API Blueprint — REST](#7-api-blueprint--rest)
8. [WebSocket Channels](#8-websocket-channels)
9. [Order Engine](#9-order-engine)
10. [Background Workers](#10-background-workers)
11. [Frontend Blueprint](#11-frontend-blueprint)
12. [Infrastructure & Ops](#12-infrastructure--ops)
13. [Security Checklist](#13-security-checklist)
14. [Phased Roadmap](#14-phased-roadmap)
15. [Timeline](#15-timeline)
16. [Success Criteria](#16-success-criteria)
17. [Appendices](#appendix-a--immediate-next-steps)

---

## 1. Executive Summary

The `perps` repo is an **early scaffold**: Express 5 API with health check, Prisma/PostgreSQL and Redis wired but unused, empty auth/user route stubs, placeholder `order_engine/`, and a default Next.js 16 frontend. **No trading, margin, oracle, liquidation, matching, or product UI exists.**

To reach a **production-grade Web2 MVP**, build:

| Layer | Effort |
|-------|--------|
| Foundation (middleware, Docker, CI) | 1–2 weeks |
| Auth + accounts + ledger | 2–3 weeks |
| Markets + price feed | 1–2 weeks |
| Order engine (CLOB) | 4–6 weeks |
| Risk (margin, funding, liquidation) | 3–4 weeks |
| REST + WebSocket | 2–3 weeks |
| Frontend trading terminal | 4–6 weeks |
| DevOps, observability, hardening | 2–3 weeks |

**Model:** CLOB-style perpetuals with **PostgreSQL as source of truth** for balances and positions, **Redis** for order books and pub/sub, and **external REST price feeds** (e.g. Binance/CoinGecko public APIs) for index/mark prices — no chain dependencies.

---

## 2. Current State Analysis

### 2.1 What Exists Today

```
perps/
├── backend/          # Node.js + Express 5 + TypeScript (ESM)
│   ├── src/
│   │   ├── server.ts, app.ts
│   │   ├── config/env.ts       # Zod: DATABASE_URL, REDIS_URL, PORT, HOST
│   │   ├── db/prisma.ts        # Prisma 7 + pg adapter
│   │   ├── cache/redis.ts      # Connect only — no app usage
│   │   └── routes/
│   │       ├── health/         # GET /api/health ✅
│   │       ├── auth/            # Empty stubs (not mounted)
│   │       └── users/          # Empty stubs (not mounted)
│   └── prisma/schema.prisma    # No models
├── frontend/         # Next.js 16 + React 19 + Tailwind 4 (boilerplate only)
└── order_engine/     # Empty .env only
```

### 2.2 Working Endpoint

| Method | Path | Response |
|--------|------|----------|
| `GET` | `/api/health` | `{ "status": "healthy" }` |

### 2.3 Critical Gaps

| Area | Status |
|------|--------|
| Database schema | 0% |
| Authentication | 0% |
| Trading / matching | 0% |
| Positions / margin / PnL | 0% |
| Funding / liquidations | 0% |
| Price feed / mark price | 0% |
| WebSocket streams | 0% |
| Docker / CI/CD | 0% |
| Frontend product UI | 0% |

### 2.4 Documentation Drift

Root `README.md` still references **FastAPI on port 8000** — backend is Node/Express on port **4000**. Fix in Phase 0.

---

## 3. Architecture Decisions

Lock these in a short **ADR** before trading code:

| Decision | Choice |
|----------|--------|
| **Matching** | Central limit order book (CLOB) |
| **Settlement** | Off-chain ledger (PostgreSQL) |
| **Collateral** | DB balance + dev test faucet |
| **Auth** | Email/password + JWT; API keys for bots |
| **Price feed** | External REST/WebSocket (Binance, CoinGecko, or mock in dev) |
| **Order engine** | **Node.js** in `order_engine/` (same language as API; Rust optional later) |
| **Real-time** | Redis pub/sub → WebSocket fanout |

---

## 4. Target Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                    │
│  Next.js Terminal  │  Trading Bots (REST + WS + API Keys)               │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   API (Node/Express)  │
                    │  REST + WS + Auth     │
                    │  Rate limit, validate │
                    └───────────┬───────────┘
                                │
        ┌───────────────────────┼──────────────────────┐
        │                       │                      │
┌───────▼───────┐     ┌─────────▼─────────┐   ┌────────▼────────┐
│ Order Engine  │     │  Risk Worker      │   │ Price Feed      │
│ (Node)        │     │  Margin, liq, fund│   │ Worker          │
│ Match, book   │     │                   │   │ Index, mark     │
└───────┬───────┘     └─────────┬─────────┘   └────────┬────────┘
        │                       │                      │
        └───────────────────────┼──────────────────────┘
                                │
              ┌─────────────────▼─────────────────┐
              │  PostgreSQL (source of truth)     │
              │  Redis (books, cache, pub/sub)    │
              └───────────────────────────────────┘
```

**Event flow (place order):**

1. Client → API: authenticated order request  
2. API: auth, rate limit, pre-trade margin check  
3. API → Order Engine: submit order (Redis Stream or in-process queue)  
4. Engine: match against book → emit fills  
5. Engine → PostgreSQL: persist order/fill/position updates  
6. Engine → Redis pub/sub → WebSocket fanout  
7. Risk worker: recalc margin; trigger liquidation if needed  

---

## 5. System Components

| Service | Location | Responsibility | Tech |
|---------|----------|----------------|------|
| **api** | `backend/` | REST, WS, auth, validation | Node, Express |
| **order-engine** | `order_engine/` | Matching, order book | Node |
| **risk-worker** | `backend/src/workers/risk/` | Margin, liquidation, funding | Node |
| **price-feed** | `backend/src/workers/price/` | Pull index/mark from external API | Node |
| **frontend** | `frontend/` | Trading terminal | Next.js 16 |
| **shared-types** | `packages/types/` (optional) | Shared TS types / OpenAPI | TypeScript |

---

## 6. Data Model (Prisma)

Implement in `backend/prisma/schema.prisma`.

### 6.1 Core Entities

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  accounts     Account[]
  apiKeys      ApiKey[]
}

model ApiKey {
  id        String   @id @default(cuid())
  userId    String
  keyHash   String   @unique
  label     String
  scopes    String[] // read, trade
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}

model Account {
  id              String   @id @default(cuid())
  userId          String
  collateralAsset String   // USDC
  balance         Decimal  @db.Decimal(36, 18)
  lockedMargin    Decimal  @db.Decimal(36, 18)
  user            User     @relation(fields: [userId], references: [id])
  positions       Position[]
  orders          Order[]
}

model Market {
  id                String   @id // e.g. BTC-PERP
  baseAsset         String
  quoteAsset        String
  tickSize          Decimal
  lotSize           Decimal
  maxLeverage       Int
  maintenanceMargin Decimal
  initialMargin     Decimal
  isActive          Boolean  @default(true)
  fundingInterval   Int      // seconds
  orders            Order[]
  positions         Position[]
}

enum OrderSide { BUY SELL }
enum OrderType { MARKET LIMIT STOP_LIMIT STOP_MARKET }
enum OrderStatus { PENDING OPEN PARTIALLY_FILLED FILLED CANCELLED REJECTED }

model Order {
  id            String      @id @default(cuid())
  accountId     String
  marketId      String
  clientOrderId String?
  side          OrderSide
  type          OrderType
  price         Decimal?
  size          Decimal
  filledSize    Decimal     @default(0)
  status        OrderStatus
  reduceOnly    Boolean     @default(false)
  postOnly      Boolean     @default(false)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  account       Account     @relation(fields: [accountId], references: [id])
  market        Market      @relation(fields: [marketId], references: [id])
  fills         Fill[]
  @@index([accountId, status])
  @@index([marketId, status])
}

model Fill {
  id        String   @id @default(cuid())
  orderId   String
  marketId  String
  price     Decimal
  size      Decimal
  fee       Decimal
  isMaker   Boolean
  createdAt DateTime @default(now())
  order     Order    @relation(fields: [orderId], references: [id])
}

enum PositionSide { LONG SHORT }

model Position {
  id            String       @id @default(cuid())
  accountId     String
  marketId      String
  side          PositionSide
  size          Decimal
  entryPrice    Decimal
  leverage      Int
  marginMode    String       // CROSS | ISOLATED
  unrealizedPnl Decimal      @default(0)
  liquidationPx Decimal?
  updatedAt     DateTime     @updatedAt
  account       Account      @relation(fields: [accountId], references: [id])
  market        Market       @relation(fields: [marketId], references: [id])
  @@unique([accountId, marketId])
}

model FundingPayment {
  id        String   @id @default(cuid())
  accountId String
  marketId  String
  rate      Decimal
  payment   Decimal
  periodAt  DateTime
}

model LedgerEntry {
  id           String   @id @default(cuid())
  accountId    String
  type         String   // DEPOSIT, WITHDRAW, FEE, FUNDING, REALIZED_PNL
  amount       Decimal
  balanceAfter Decimal
  refId        String?
  createdAt    DateTime @default(now())
}

model PriceSnapshot {
  id         String   @id @default(cuid())
  marketId   String
  indexPrice Decimal
  markPrice  Decimal
  createdAt  DateTime @default(now())
  @@index([marketId, createdAt])
}

model WithdrawalRequest {
  id        String   @id @default(cuid())
  accountId String
  amount    Decimal  @db.Decimal(36, 18)
  status    String   // PENDING, COMPLETED, REJECTED
  createdAt DateTime @default(now())
}
```

### 6.2 Redis Keys

| Key pattern | Purpose |
|-------------|---------|
| `book:{marketId}:bids` | Sorted set — bid levels |
| `book:{marketId}:asks` | Sorted set — ask levels |
| `ticker:{marketId}` | Hash — last price, 24h stats |
| `mark:{marketId}` | String — current mark price |
| `session:{userId}` | Session / token cache |
| `ratelimit:{ip}` | Rate limit counter |
| `lock:account:{id}` | Distributed lock for balance updates |

---

## 7. API Blueprint — REST

Base URL: `https://api.yourperps.com/api/v1`  
Trading routes require JWT or API key.

### Auth & Users

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/register` | Email + password signup |
| `POST` | `/auth/login` | Login → access + refresh tokens |
| `POST` | `/auth/refresh` | Refresh access token |
| `POST` | `/auth/logout` | Invalidate session |
| `GET` | `/users/me` | Current user |
| `PATCH` | `/users/me` | Update preferences |
| `POST` | `/users/api-keys` | Create API key |
| `GET` | `/users/api-keys` | List API keys |
| `DELETE` | `/users/api-keys/:id` | Revoke API key |

### Accounts

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/accounts` | List accounts |
| `GET` | `/accounts/:id` | Account + equity |
| `GET` | `/accounts/:id/balances` | Collateral balances |
| `POST` | `/accounts/:id/deposit` | Credit balance (test faucet / admin in dev) |
| `POST` | `/accounts/:id/withdraw` | Request withdrawal (ledger debit + ops queue) |
| `GET` | `/accounts/:id/ledger` | Transaction history |
| `GET` | `/accounts/:id/equity` | Equity, margin used, free collateral |

### Markets & Data

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/markets` | List markets |
| `GET` | `/markets/:symbol` | Market config |
| `GET` | `/markets/:symbol/ticker` | 24h stats |
| `GET` | `/markets/:symbol/orderbook` | L2 snapshot |
| `GET` | `/markets/:symbol/trades` | Recent trades |
| `GET` | `/markets/:symbol/candles` | OHLCV |
| `GET` | `/markets/:symbol/funding` | Current funding rate |
| `GET` | `/markets/:symbol/mark-price` | Index + mark |

### Orders & Positions

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/orders` | Place order |
| `GET` | `/orders` | List orders |
| `GET` | `/orders/:id` | Order detail |
| `DELETE` | `/orders/:id` | Cancel order |
| `DELETE` | `/orders` | Cancel all |
| `GET` | `/fills` | Fill history |
| `GET` | `/positions` | Open positions |
| `GET` | `/positions/:market` | Position for market |
| `POST` | `/positions/:market/close` | Market-close |
| `POST` | `/positions/:market/leverage` | Set leverage |

**Place order body:**

```json
{
  "market": "BTC-PERP",
  "side": "BUY",
  "type": "LIMIT",
  "price": "65000.00",
  "size": "0.1",
  "clientOrderId": "optional-uuid",
  "reduceOnly": false,
  "postOnly": false,
  "timeInForce": "GTC"
}
```

### Health & Admin

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness |
| `GET` | `/health/ready` | DB + Redis readiness |
| `POST` | `/admin/markets` | Create/update market |
| `POST` | `/admin/halt` | Halt market trading |

**Error format:**

```json
{
  "error": {
    "code": "INSUFFICIENT_MARGIN",
    "message": "Not enough free collateral",
    "requestId": "req_abc123"
  }
}
```

---

## 8. WebSocket Channels

Endpoint: `wss://api.yourperps.com/ws/v1`

### Public

| Channel | Events |
|---------|--------|
| `orderbook.{symbol}` | `snapshot`, `delta` |
| `trades.{symbol}` | `trade` |
| `ticker.{symbol}` | `ticker` |
| `mark.{symbol}` | `mark_price` |

### Private (JWT or API key)

| Channel | Events |
|---------|--------|
| `orders` | `order_opened`, `order_filled`, `order_cancelled` |
| `fills` | `fill` |
| `positions` | `position_updated`, `position_closed` |
| `account` | `balance_updated`, `liquidation` |

**Requirements:** ping/pong every 30s; sequence numbers on book deltas; resubscribe with snapshot on reconnect.

---

## 9. Order Engine

**Location:** `order_engine/`  
**Stack:** Node.js + Redis + PostgreSQL (via Prisma or sql from API)

### Responsibilities

1. In-memory order book per market (price-time priority)  
2. Accept orders from API (Redis Stream or shared module)  
3. Match market/limit orders  
4. Emit fills; update positions atomically  
5. Publish book deltas to Redis pub/sub  
6. Persist to PostgreSQL  

### Matching Rules

- Price-time priority (FIFO at same price)  
- Market orders walk the book  
- Post-only: reject if would take liquidity  
- Reduce-only: cannot increase position size  
- Self-trade prevention (configurable)  

### Targets (MVP)

| Metric | Target |
|--------|--------|
| Matching latency (p99) | < 5 ms (single process) |
| Book snapshot | < 50 ms for 50 levels |

---

## 10. Background Workers

| Worker | Schedule | Responsibility |
|--------|----------|----------------|
| **price-ingestor** | Every 1–5s | Pull prices from external API; compute mark |
| **funding-calculator** | Per funding interval | Funding payments on DB ledger |
| **liquidation-scanner** | Every 1–5s | Positions below maintenance margin |
| **liquidation-executor** | Event-driven | Close at mark ± slippage |
| **candle-aggregator** | 1m / 5m / 1h | OHLCV from trades |
| **expired-order-cleanup** | Every 1m | Cancel expired GTD orders |
| **withdrawal-processor** | Every 30s | Process pending withdrawal requests (ledger only) |

**Mark price (simplified):**

```
mark = median(impact_bid, impact_ask, last_trade, index_price)
```

---

## 11. Frontend Blueprint

**Stack:** Next.js 16, TanStack Query, Zustand, lightweight-charts (or TradingView widget), shadcn/ui.

### Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing + login/register |
| `/trade/[symbol]` | Trading terminal |
| `/portfolio` | Positions, balances, PnL |
| `/orders` | Open orders + history |
| `/markets` | Market list |
| `/account/settings` | API keys, profile |

### Terminal Components

1. **Header** — user, equity, logout  
2. **Chart** — candlesticks  
3. **Order book** — L2 depth  
4. **Order form** — market/limit, leverage, reduce-only  
5. **Positions** — size, entry, uPnL, liq price, close  
6. **Open orders** — cancel  
7. **Funding countdown** — next funding time  

**Auth:** email/password forms → JWT stored in httpOnly cookie or secure storage; no wallet libraries.

---

## 12. Infrastructure & Ops

### Repo layout (add over time)

```
perps/
├── docker/
│   ├── Dockerfile.api
│   └── docker-compose.yml      # postgres, redis, api
├── .github/workflows/ci.yml
├── packages/types/             # optional shared types
└── docs/openapi.yaml
```

### Observability

- **Logging:** Pino → JSON (`utils/logger.ts`)  
- **Metrics:** Prometheus (order latency, fill rate)  
- **Alerting:** Oracle/price feed stale, DB down  

### Environments

| Env | Purpose |
|-----|---------|
| `local` | Docker compose, test faucet |
| `staging` | Full stack, load tests |
| `prod` | WAF, secrets vault, multi-AZ |

### CI/CD

1. PR: lint + unit + integration tests  
2. `main`: build images → deploy staging  
3. Prod: manual approval  

---

## 13. Security Checklist

- [ ] Password hashing (bcrypt/argon2)  
- [ ] JWT expiry + refresh rotation  
- [ ] API key HMAC signing (timestamp + body)  
- [ ] Rate limiting per IP and per user  
- [ ] Zod validation on all routes  
- [ ] Prisma parameterized queries  
- [ ] Secrets in vault (not `.env` in prod)  
- [ ] Admin routes behind separate auth  
- [ ] Price feed staleness circuit breaker  
- [ ] Max position / OI limits per market  

---

## 14. Phased Roadmap

### Phase 0 — Foundation (Week 1–2)

- [ ] Fix README (Node, port 4000)  
- [ ] `logger`, `error.middleware`, `requestId`, `asyncHandler`  
- [ ] `GET /api/health/ready` (Prisma + Redis)  
- [ ] Docker Compose: PostgreSQL + Redis + API  
- [ ] GitHub Actions CI  

### Phase 1 — Data & Auth (Week 2–4)

- [ ] Prisma schema + migration + seed (BTC-PERP, ETH-PERP)  
- [ ] Register / login / refresh / logout  
- [ ] JWT middleware + API keys  
- [ ] User profile + API key CRUD  
- [ ] Auth integration tests  

### Phase 2 — Accounts & Price Feed (Week 4–6)

- [ ] Account on first login  
- [ ] Test faucet deposit + ledger  
- [ ] Account/balance/equity endpoints  
- [ ] Price ingestor worker (Binance API or mock)  
- [ ] Market CRUD + public market data endpoints  

### Phase 3 — Order Engine (Week 6–10)

- [ ] Node project in `order_engine/` — single-market CLOB  
- [ ] API ↔ engine via Redis Streams  
- [ ] Order REST endpoints; persist orders/fills  
- [ ] Matching unit tests  

### Phase 4 — Positions & Risk (Week 9–13)

- [ ] Position tracking on fill  
- [ ] Cross-margin + pre-trade checks  
- [ ] Liquidation scanner + executor  
- [ ] Funding calculator + scheduled job  
- [ ] Position endpoints  

### Phase 5 — Real-Time (Week 11–14)

- [ ] WebSocket server  
- [ ] Public + private channels  
- [ ] Redis pub/sub bridge from engine  

### Phase 6 — Frontend (Week 12–17)

- [ ] Login/register pages  
- [ ] Trading terminal (`/trade/[symbol]`)  
- [ ] Order book, chart, order form  
- [ ] Portfolio + orders pages  
- [ ] WebSocket hooks  

### Phase 7 — Production Hardening (Week 16–18)

- [ ] Rate limiting, structured logging, metrics  
- [ ] k6 load test (target: 5k orders/min)  
- [ ] Staging + runbooks  
- [ ] **MVP launch**

---

## 15. Timeline

```
Week:  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18
       ├──┤
Ph0    ████ Foundation
           ├────┤
Ph1        ████████ Auth + DB
                 ├────┤
Ph2              ████████ Accounts + Price feed
                    ├──────────┤
Ph3                 ████████████████ Order engine
                              ├────────────┤
Ph4                           ████████████████ Risk
                                    ├────┤
Ph5                                 ████████ WebSocket
                                    ├──────────────┤
Ph6                                 ████████████████████ Frontend
                                                      ├────┤
Ph7                                                   ████████ Hardening
```

### Milestones (from May 24, 2026)

| Milestone | Target | Deliverable |
|-----------|--------|-------------|
| M0: Dev env | Jun 7, 2026 | Docker, CI, middleware |
| M1: Auth + DB | Jun 21, 2026 | Users, JWT, schema live |
| M2: Paper API | Jul 19, 2026 | Markets, orders, engine |
| M3: Risk | Aug 16, 2026 | Margin, funding, liquidations |
| M4: Beta UI | Sep 6, 2026 | Frontend + WebSocket |
| **M5: MVP launch** | **Sep 27, 2026** | Staging stable, load-tested |

**Solo:** ~16–18 weeks. **Team of 3–4:** ~10–14 weeks.

---

## 16. Success Criteria

| Phase | Done when |
|-------|-----------|
| 0 | `docker compose up` runs API + DB + Redis; CI green |
| 1 | Email login works; JWT protects `/users/me` |
| 2 | Test faucet deposit; live BTC mark from price worker |
| 3 | Limit orders match; fills in DB |
| 4 | Underwater position liquidated automatically |
| 5 | Browser gets book updates < 200ms after trade |
| 6 | User trades BTC-PERP from UI end-to-end |
| 7 | k6 passes; staging stable 7 days → **ship** |

---

## Appendix A — Immediate Next Steps

1. **ADR** — CLOB + PostgreSQL ledger + email auth + Node order engine.  
2. **Middleware** — error, logger, requestId.  
3. **Prisma schema** — Section 6; `prisma migrate dev`.  
4. **Auth routes** — register/login with bcrypt + JWT.  
5. **Docker Compose** — Postgres 16, Redis 7, API on 4000.  
6. **Bootstrap `order_engine/`** — `package.json`, basic book + tests.  
7. **Update README** — remove FastAPI references.

---

## Appendix B — Dependencies

### Backend

```
bcrypt (or argon2), jsonwebtoken, pino, express-rate-limit,
ws, bullmq, decimal.js, helmet, cookie-parser, zod
```

### Frontend

```
@tanstack/react-query, zustand, lightweight-charts,
shadcn/ui (or radix), zod, date-fns
```

### Order Engine

```
ioredis, decimal.js, zod (align versions with backend)
```

---

## Appendix C — References (Web2)

| Platform | Study for |
|----------|-----------|
| **Binance Futures** | CLOB, funding, liquidation |
| **Bybit** | API design, WebSocket protocol |
| **Paper trading apps** | Simplified UX for MVP |

---

*Canonical plan: `ImplementationPlan.md`. Web3 (wallets, contracts, on-chain custody) is **out of scope** until a future phase is explicitly added.*
