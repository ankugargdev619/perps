# Perps Platform — Implementation Plan & Production Blueprint

**Repository:** `/home/ankugarg/super30/perps`  
**Document date:** May 24, 2026  
**Estimated total timeline:** 28–36 weeks (solo/small team) · 16–22 weeks (4–6 engineers)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Architecture Decision (Required First)](#3-architecture-decision-required-first)
4. [Recommended Target Architecture](#4-recommended-target-architecture)
5. [System Components & Services](#5-system-components--services)
6. [Data Model (Prisma)](#6-data-model-prisma)
7. [API Blueprint — REST Endpoints](#7-api-blueprint--rest-endpoints)
8. [WebSocket Channels](#8-websocket-channels)
9. [Order Engine Specification](#9-order-engine-specification)
10. [Background Workers & Cron Jobs](#10-background-workers--cron-jobs)
11. [Smart Contracts (If On-Chain Settlement)](#11-smart-contracts-if-on-chain-settlement)
12. [Frontend Blueprint](#12-frontend-blueprint)
13. [Infrastructure & Production Ops](#13-infrastructure--production-ops)
14. [Security & Compliance Checklist](#14-security--compliance-checklist)
15. [Phased Implementation Roadmap](#15-phased-implementation-roadmap)
16. [Timeline (Gantt-Style)](#16-timeline-gantt-style)
17. [Success Criteria by Phase](#17-success-criteria-by-phase)

---

## 1. Executive Summary

The `perps` repo is an **early scaffold**: Express 5 API with health check, Prisma/PostgreSQL and Redis wired but unused, empty auth/user route stubs, placeholder `order_engine/`, and a default Next.js 16 frontend. **No trading, margin, oracle, liquidation, matching, wallet, or on-chain logic exists.**

To reach production grade, you must build:

| Layer | Effort |
|-------|--------|
| Architecture & data model | 1–2 weeks |
| Auth + accounts | 2–3 weeks |
| Markets + oracle/index | 2–3 weeks |
| Order engine (CLOB) | 6–10 weeks |
| Risk (margin, funding, liquidation) | 4–6 weeks |
| REST + WebSocket APIs | 3–4 weeks |
| Frontend trading terminal | 6–8 weeks |
| On-chain settlement (optional) | 6–12 weeks |
| DevOps, observability, security | 3–4 weeks |
| Testing, audit prep, hardening | 4–6 weeks |

This plan assumes a **CLOB-style perpetuals exchange** (Hyperliquid / dYdX v4 pattern): off-chain matching with deterministic settlement, on-chain or custodial collateral depending on your custody model.

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
│   │       ├── auth/           # Empty stubs (not mounted)
│   │       └── users/          # Empty stubs (not mounted)
│   └── prisma/schema.prisma    # No models
├── frontend/         # Next.js 16 + React 19 + Tailwind 4 (boilerplate only)
└── order_engine/     # Empty .env only
```

### 2.2 Working Endpoint (Only One)

| Method | Path | Response |
|--------|------|----------|
| `GET` | `/api/health` | `{ "status": "healthy" }` |

### 2.3 Placeholder Files (Not Wired)

- `auth.controller.ts` — comments only (`loginController` stub)
- `auth.routes.ts`, `auth.service.ts`, `auth.schema.ts` — empty
- `users/*` — empty
- `middlewares/*` — empty (`auth`, `error`, `validate`, `requestId`)
- `utils/*` — empty (`asyncHandler`, `httpErrors`, `logger`, `tokens`, `passwords`)

### 2.4 Critical Gaps

| Area | Status |
|------|--------|
| Database schema | 0% |
| Authentication | 0% |
| Trading / matching | 0% |
| Positions / margin / PnL | 0% |
| Funding rates | 0% |
| Liquidations | 0% |
| Oracle / mark price | 0% |
| WebSocket streams | 0% |
| Smart contracts | 0% |
| Docker / CI/CD | 0% |
| Production observability | 0% |
| Frontend product UI | 0% |

### 2.5 Documentation Drift

Root `README.md` still references **FastAPI on port 8000** — the backend was migrated to Node/Express on port **4000**. Update README in Phase 0.

---

## 3. Architecture Decision (Required First)

Before writing trading code, lock these decisions in an **Architecture Decision Record (ADR)**:

| Decision | Options | Recommendation |
|----------|---------|----------------|
| **Matching model** | CLOB vs AMM/vault vs hybrid | **CLOB** for price discovery + pro traders |
| **Settlement** | Fully on-chain vs off-chain ledger vs hybrid | **Hybrid**: off-chain match, batched on-chain settlement |
| **Collateral** | On-chain vault vs custodial DB ledger | Start **DB ledger** for MVP; add vault later |
| **Auth** | SIWE (wallet) vs email/password vs API keys | **SIWE + API keys** for bots |
| **Chain** | Ethereum L2, appchain, Solana | Pick one; affects contracts |
| **Oracle** | Pyth, Chainlink, internal index | **Pyth** (low latency) + internal mark |
| **Order engine language** | Node vs Rust vs Go | **Rust** for matching; Node for API gateway |

**MVP scope recommendation:** Off-chain CLOB + PostgreSQL ledger + Redis order book + Pyth oracle. Add smart contracts in Phase 5+.

---

## 4. Recommended Target Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
│  Next.js Terminal  │  Mobile  │  Trading Bots (REST + WS + API Keys)        │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   API Gateway (Node)   │
                    │  REST + WS + Auth      │
                    │  Rate limit, validate  │
                    └───────────┬───────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
┌───────▼───────┐     ┌─────────▼─────────┐   ┌────────▼────────┐
│ Order Engine  │     │  Risk Engine       │   │ Oracle Service  │
│ (Rust)        │     │  (Node worker)     │   │ (Node worker)   │
│ Match, book   │     │  Margin, liq, fund │   │ Index, mark     │
└───────┬───────┘     └─────────┬─────────┘   └────────┬────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
              ┌─────────────────▼─────────────────┐
              │  PostgreSQL (source of truth)      │
              │  Redis (books, cache, pub/sub)     │
              │  Kafka/NATS (events, optional)     │
              └─────────────────┬─────────────────┘
                                │
              ┌─────────────────▼─────────────────┐
              │  Settlement / Keeper (optional)    │
              │  Smart contracts on L2             │
              └───────────────────────────────────┘
```

**Event flow (place order):**

1. Client → API Gateway: signed order request  
2. Gateway: auth, rate limit, pre-trade risk check  
3. Gateway → Order Engine: submit order (gRPC or Redis stream)  
4. Engine: match against book → emit fills  
5. Engine → PostgreSQL: persist order/fill/position updates  
6. Engine → Redis pub/sub → WebSocket fanout  
7. Risk worker: recalc margin, trigger liquidation if needed  

---

## 5. System Components & Services

| Service | Location | Responsibility | Tech |
|---------|----------|----------------|------|
| **api-gateway** | `backend/` (extend) | REST, WS, auth, validation | Node, Express |
| **order-engine** | `order_engine/` (new) | Matching, order book | Rust recommended |
| **risk-engine** | `backend/src/workers/risk/` | Margin, liquidation, funding | Node |
| **oracle-service** | `backend/src/workers/oracle/` | Index/mark price ingestion | Node |
| **settlement-worker** | `backend/src/workers/settlement/` | On-chain batch settlement | Node + viem/ethers |
| **indexer** (optional) | `indexer/` | Chain event → DB sync | Node or Rust |
| **frontend** | `frontend/` | Trading terminal | Next.js 16 |
| **contracts** | `contracts/` (new) | Vault, margin, oracle adapter | Foundry |
| **shared-types** | `packages/types/` (new) | Shared TS types / OpenAPI | TypeScript |

---

## 6. Data Model (Prisma)

Implement in `backend/prisma/schema.prisma`. Suggested models:

### 6.1 Core Entities

```prisma
// Users & auth
model User {
  id            String   @id @default(cuid())
  walletAddress String?  @unique
  email         String?  @unique
  createdAt     DateTime @default(now())
  accounts      Account[]
  apiKeys       ApiKey[]
}

model ApiKey {
  id        String   @id @default(cuid())
  userId    String
  keyHash   String   @unique
  label     String
  scopes    String[] // read, trade, withdraw
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}

// Collateral & balances
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

// Markets
model Market {
  id                String   @id // e.g. BTC-PERP
  baseAsset         String
  quoteAsset        String
  tickSize          Decimal
  lotSize           Decimal
  maxLeverage       Int
  maintenanceMargin Decimal  // e.g. 0.005 = 0.5%
  initialMargin     Decimal
  isActive          Boolean  @default(true)
  fundingInterval   Int      // seconds
  orders            Order[]
  positions         Position[]
}

// Orders & fills
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
  id          String   @id @default(cuid())
  orderId     String
  marketId    String
  price       Decimal
  size        Decimal
  fee         Decimal
  isMaker     Boolean
  createdAt   DateTime @default(now())
  order       Order    @relation(fields: [orderId], references: [id])
}

// Positions
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

// Funding
model FundingPayment {
  id        String   @id @default(cuid())
  accountId String
  marketId  String
  rate      Decimal
  payment   Decimal
  periodAt  DateTime
}

// Ledger (double-entry)
model LedgerEntry {
  id          String   @id @default(cuid())
  accountId   String
  type        String   // DEPOSIT, WITHDRAW, FEE, FUNDING, REALIZED_PNL
  amount      Decimal
  balanceAfter Decimal
  refId       String?
  createdAt   DateTime @default(now())
}

// Oracle snapshots
model PriceSnapshot {
  id        String   @id @default(cuid())
  marketId  String
  indexPrice Decimal
  markPrice  Decimal
  createdAt  DateTime @default(now())
  @@index([marketId, createdAt])
}
```

### 6.2 Redis Keys (Convention)

| Key pattern | Purpose |
|-------------|---------|
| `book:{marketId}:bids` | Sorted set — bid levels |
| `book:{marketId}:asks` | Sorted set — ask levels |
| `ticker:{marketId}` | Hash — last price, 24h stats |
| `mark:{marketId}` | String — current mark price |
| `session:{userId}` | JWT/session cache |
| `ratelimit:{ip}` | Rate limit counter |
| `lock:account:{id}` | Distributed lock for balance updates |

---

## 7. API Blueprint — REST Endpoints

Base URL: `https://api.yourperps.com/api/v1`  
All trading routes require authentication unless noted.

### Phase 0 — Foundation (Week 1–2)

| # | Method | Path | Description |
|---|--------|------|-------------|
| 0.1 | `GET` | `/health` | Liveness (exists) |
| 0.2 | `GET` | `/health/ready` | DB + Redis readiness |
| 0.3 | `GET` | `/version` | API version, build hash |

### Phase 1 — Auth & Users (Week 3–5)

| # | Method | Path | Description |
|---|--------|------|-------------|
| 1.1 | `POST` | `/auth/nonce` | SIWE nonce for wallet |
| 1.2 | `POST` | `/auth/verify` | Verify SIWE signature → JWT |
| 1.3 | `POST` | `/auth/refresh` | Refresh access token |
| 1.4 | `POST` | `/auth/logout` | Invalidate session |
| 1.5 | `GET` | `/users/me` | Current user profile |
| 1.6 | `PATCH` | `/users/me` | Update preferences |
| 1.7 | `POST` | `/users/api-keys` | Create API key (HMAC secret returned once) |
| 1.8 | `GET` | `/users/api-keys` | List API keys |
| 1.9 | `DELETE` | `/users/api-keys/:id` | Revoke API key |

### Phase 2 — Accounts & Collateral (Week 5–7)

| # | Method | Path | Description |
|---|--------|------|-------------|
| 2.1 | `GET` | `/accounts` | List user accounts |
| 2.2 | `GET` | `/accounts/:id` | Account detail + equity |
| 2.3 | `GET` | `/accounts/:id/balances` | Collateral balances |
| 2.4 | `POST` | `/accounts/:id/deposit` | Deposit (on-chain tx hash or test faucet) |
| 2.5 | `POST` | `/accounts/:id/withdraw` | Request withdrawal |
| 2.6 | `GET` | `/accounts/:id/ledger` | Transaction history (paginated) |
| 2.7 | `GET` | `/accounts/:id/equity` | Total equity, margin used, free collateral |

### Phase 3 — Markets & Market Data (Week 6–8)

| # | Method | Path | Description |
|---|--------|------|-------------|
| 3.1 | `GET` | `/markets` | List all perp markets |
| 3.2 | `GET` | `/markets/:symbol` | Market config (tick, lot, leverage caps) |
| 3.3 | `GET` | `/markets/:symbol/ticker` | 24h volume, last, change |
| 3.4 | `GET` | `/markets/:symbol/orderbook` | L2 book snapshot (depth param) |
| 3.5 | `GET` | `/markets/:symbol/trades` | Recent public trades |
| 3.6 | `GET` | `/markets/:symbol/candles` | OHLCV (`interval`, `from`, `to`) |
| 3.7 | `GET` | `/markets/:symbol/funding` | Current + predicted funding rate |
| 3.8 | `GET` | `/markets/:symbol/funding/history` | Historical funding rates |
| 3.9 | `GET` | `/markets/:symbol/open-interest` | Open interest |
| 3.10 | `GET` | `/markets/:symbol/mark-price` | Index + mark price |

### Phase 4 — Orders & Trading (Week 8–14)

| # | Method | Path | Description |
|---|--------|------|-------------|
| 4.1 | `POST` | `/orders` | Place order |
| 4.2 | `GET` | `/orders` | List orders (filters: market, status) |
| 4.3 | `GET` | `/orders/:id` | Order by ID |
| 4.4 | `DELETE` | `/orders/:id` | Cancel order |
| 4.5 | `DELETE` | `/orders` | Cancel all orders (optional `market`) |
| 4.6 | `GET` | `/fills` | User fill history |
| 4.7 | `POST` | `/orders/batch` | Batch place (max N) |
| 4.8 | `DELETE` | `/orders/batch` | Batch cancel |

**Place order request body:**

```json
{
  "market": "BTC-PERP",
  "side": "BUY",
  "type": "LIMIT",
  "price": "65000.00",
  "size": "0.1",
  "clientOrderId": "uuid-optional",
  "reduceOnly": false,
  "postOnly": false,
  "timeInForce": "GTC"
}
```

### Phase 5 — Positions (Week 10–12)

| # | Method | Path | Description |
|---|--------|------|-------------|
| 5.1 | `GET` | `/positions` | All open positions |
| 5.2 | `GET` | `/positions/:market` | Position for market |
| 5.3 | `POST` | `/positions/:market/close` | Market-close position |
| 5.4 | `POST` | `/positions/:market/leverage` | Set leverage (isolated) |
| 5.5 | `POST` | `/positions/:market/margin` | Add/remove isolated margin |
| 5.6 | `GET` | `/positions/:market/liquidation-price` | Est. liquidation price |

### Phase 6 — Risk & Admin (Week 12–16)

| # | Method | Path | Description |
|---|--------|------|-------------|
| 6.1 | `GET` | `/risk/margin-summary` | Account margin breakdown |
| 6.2 | `GET` | `/risk/limits` | User/market risk limits |
| 6.3 | `POST` | `/admin/markets` | Create/update market (admin) |
| 6.4 | `POST` | `/admin/halt` | Halt trading on market (admin) |
| 6.5 | `GET` | `/admin/metrics` | Platform metrics (admin) |

### Error Response Standard

```json
{
  "error": {
    "code": "INSUFFICIENT_MARGIN",
    "message": "Not enough free collateral",
    "requestId": "req_abc123"
  }
}
```

**HTTP status codes:** `400` validation, `401` auth, `403` forbidden, `404` not found, `409` conflict (duplicate clientOrderId), `429` rate limit, `503` market halted.

---

## 8. WebSocket Channels

Endpoint: `wss://api.yourperps.com/ws/v1`

### 8.1 Public Channels (no auth)

| Channel | Subscribe message | Events |
|---------|-------------------|--------|
| `orderbook.{symbol}` | `{ "op": "subscribe", "channel": "orderbook", "symbol": "BTC-PERP", "depth": 50 }` | `snapshot`, `delta` |
| `trades.{symbol}` | `{ "op": "subscribe", "channel": "trades", "symbol": "BTC-PERP" }` | `trade` |
| `ticker.{symbol}` | `{ "op": "subscribe", "channel": "ticker", "symbol": "BTC-PERP" }` | `ticker` |
| `candles.{symbol}.{interval}` | `{ "op": "subscribe", "channel": "candles", ... }` | `candle` |
| `mark.{symbol}` | `{ "op": "subscribe", "channel": "mark", ... }` | `mark_price` |

### 8.2 Private Channels (JWT or API key in subscribe)

| Channel | Events |
|---------|--------|
| `orders` | `order_opened`, `order_filled`, `order_cancelled`, `order_rejected` |
| `fills` | `fill` |
| `positions` | `position_updated`, `position_closed` |
| `account` | `balance_updated`, `margin_call`, `liquidation` |

### 8.3 Protocol Requirements

- Heartbeat: ping/pong every 30s  
- Sequence numbers on book deltas for gap detection  
- `resubscribe` with snapshot on reconnect  
- Rate limit: max 20 subscriptions per connection  

---

## 9. Order Engine Specification

**Location:** `/home/ankugarg/super30/perps/order_engine/`  
**Recommended stack:** Rust + Tokio + Redis + PostgreSQL (via sqlx)

### 9.1 Responsibilities

1. Maintain in-memory order book per market (price-time priority)  
2. Accept orders from API gateway (Redis Stream or gRPC)  
3. Match market/limit/stop orders  
4. Emit fills, update positions atomically  
5. Publish book deltas to Redis pub/sub  
6. Persist state to PostgreSQL (async or sync depending on latency target)  

### 9.2 Internal APIs (Engine ↔ Gateway)

| Interface | Method | Purpose |
|-----------|--------|---------|
| `SubmitOrder` | gRPC / Redis | New order |
| `CancelOrder` | gRPC / Redis | Cancel by ID |
| `GetBookSnapshot` | gRPC | Full L2 snapshot |
| `GetOrderStatus` | gRPC | Order state |

### 9.3 Matching Rules

- Price-time priority (FIFO at same price)  
- Market orders: walk the book, partial fills allowed  
- Post-only: reject if would take liquidity  
- Reduce-only: cannot increase position size  
- Self-trade prevention: cancel resting or reject incoming (configurable)  

### 9.4 Performance Targets (Production)

| Metric | Target |
|--------|--------|
| Matching latency (p99) | < 1 ms |
| Throughput | > 50k orders/sec (single market, horizontal scale) |
| Book snapshot | < 10 ms for 100 levels |

---

## 10. Background Workers & Cron Jobs

| Worker | Schedule | Responsibility |
|--------|----------|----------------|
| **oracle-ingestor** | Every 1–5s | Pull Pyth/Chainlink; compute mark price |
| **funding-calculator** | Every funding interval (e.g. 1h) | `funding = (mark - index) / index * factor`; debit/credit accounts |
| **liquidation-scanner** | Every 1–5s | Find positions below maintenance margin |
| **liquidation-executor** | Event-driven | Close positions at mark ± slippage |
| **insurance-fund** | On liquidation | Absorb bad debt if liquidation insufficient |
| **candle-aggregator** | Every 1m/5m/1h | Build OHLCV from trades |
| **withdrawal-processor** | Every 30s | Process pending withdrawals (on-chain) |
| **reconciliation** | Daily | DB balances vs on-chain vault |
| **expired-order-cleanup** | Every 1m | Cancel GTD expired orders |

### Mark Price Formula (Typical)

```
mark = median(impact_price_bid, impact_price_ask, last_trade, index + EMA_basis)
```

### Funding Rate Formula (Simplified)

```
fundingRate = clamp(premiumIndex + clamp(interestRate - premiumIndex, -0.05%, 0.05%), -cap, +cap)
premiumIndex = (max(0, impactBid - index) - max(0, index - impactAsk)) / index
```

---

## 11. Smart Contracts (If On-Chain Settlement)

**New directory:** `contracts/` (Foundry)

| Contract | Purpose |
|----------|---------|
| `CollateralVault.sol` | USDC deposits/withdrawals |
| `MarginAccount.sol` | Per-user margin state root (Merkle optional) |
| `PerpClearinghouse.sol` | Batch settle trades from operator signature |
| `OracleAdapter.sol` | Pyth/Chainlink price verification |
| `InsuranceFund.sol` | Protocol backstop |
| `Governor.sol` | Pause, parameter updates (timelock) |

**Keepers:** `settlement-worker` submits batches every N seconds or M trades.

**Timeline:** Add after off-chain MVP is stable (Phase 5+).

---

## 12. Frontend Blueprint

**Stack additions:** wagmi/viem, WalletConnect, TanStack Query, lightweight-charts or TradingView widget, Zustand.

### 12.1 Pages / Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing / connect wallet |
| `/trade/[symbol]` | Main trading terminal |
| `/portfolio` | Positions, balances, PnL |
| `/orders` | Open orders + history |
| `/markets` | Market list |
| `/account/settings` | API keys, preferences |
| `/docs` | API docs link (optional) |

### 12.2 Trading Terminal Components

1. **Header** — wallet, equity, network  
2. **Chart** — candlesticks + position overlays  
3. **Order book** — L2 with depth visualization  
4. **Order form** — market/limit, leverage slider, reduce-only  
5. **Positions panel** — size, entry, uPnL, liq price, close button  
6. **Open orders** — cancel individual / all  
7. **Trade history** — recent fills  
8. **Funding countdown** — next funding time + rate  

### 12.3 WebSocket Integration

- Single WS connection with multiplexed channels  
- Reconnect with exponential backoff  
- Optimistic UI for order placement with server reconciliation  

---

## 13. Infrastructure & Production Ops

### 13.1 Repository Additions

```
perps/
├── docker/
│   ├── Dockerfile.api
│   ├── Dockerfile.engine
│   └── docker-compose.yml      # postgres, redis, api, engine
├── .github/workflows/
│   ├── ci.yml                  # lint, test, build
│   └── deploy.yml              # staging/prod
├── contracts/                  # Foundry
├── packages/types/             # Shared types
└── docs/
    ├── openapi.yaml
    └── architecture.md
```

### 13.2 Observability

| Tool | Purpose |
|------|---------|
| **Structured logging** | Pino → JSON (implement `utils/logger.ts`) |
| **Metrics** | Prometheus: order latency, fill rate, liq count |
| **Tracing** | OpenTelemetry across API → engine |
| **Alerting** | PagerDuty: oracle stale, DB down, liq failures |
| **Dashboards** | Grafana: trading volume, OI, system health |

### 13.3 Environments

| Env | Purpose |
|-----|---------|
| `local` | Docker compose, test faucet |
| `staging` | Full stack, testnet contracts |
| `prod` | Mainnet, WAF, multi-AZ |

### 13.4 CI/CD Pipeline

1. PR: lint + unit tests + integration tests  
2. Merge to `main`: build Docker images  
3. Deploy to staging automatically  
4. Prod: manual approval + blue/green deploy  

---

## 14. Security & Compliance Checklist

- [ ] SIWE replay protection (nonce, expiry)  
- [ ] API key HMAC signing (timestamp + body)  
- [ ] Rate limiting per IP and per user  
- [ ] Input validation (Zod on all routes — use `validate.middleware.ts`)  
- [ ] SQL injection prevention (Prisma parameterized queries)  
- [ ] Secrets in vault (not `.env` in prod)  
- [ ] Withdrawal allowlist + delay for new addresses  
- [ ] Admin routes behind separate auth + IP allowlist  
- [ ] Oracle staleness circuit breaker (halt market if mark > 30s old)  
- [ ] Max position / OI limits per market  
- [ ] DDoS protection (Cloudflare/AWS Shield)  
- [ ] Smart contract audit before mainnet  
- [ ] Bug bounty program  
- [ ] Geo-blocking (if required by jurisdiction)  

---

## 15. Phased Implementation Roadmap

### Phase 0 — Foundation (Week 1–2)

- [ ] Fix README (Node backend, port 4000)  
- [ ] Implement `logger`, `error.middleware`, `requestId.middleware`, `asyncHandler`  
- [ ] Add `GET /api/health/ready` (Prisma + Redis ping)  
- [ ] Docker Compose: PostgreSQL + Redis + API  
- [ ] GitHub Actions CI (typecheck + test)  
- [ ] OpenAPI spec skeleton  

### Phase 1 — Data & Auth (Week 3–5)

- [ ] Full Prisma schema + initial migration + seed (BTC-PERP, ETH-PERP)  
- [ ] SIWE auth flow (endpoints 1.1–1.4)  
- [ ] JWT middleware + API key HMAC middleware  
- [ ] User + API key CRUD (1.5–1.9)  
- [ ] Integration tests for auth  

### Phase 2 — Accounts (Week 5–7)

- [ ] Account creation on first login  
- [ ] Test faucet deposit (dev) + ledger entries  
- [ ] Balance/equity endpoints (2.1–2.7)  
- [ ] Redis distributed locks for balance updates  

### Phase 3 — Oracle & Markets (Week 6–9)

- [ ] Oracle ingestor worker (Pyth REST/WS)  
- [ ] Mark price calculator  
- [ ] Market CRUD + public market data endpoints (3.1–3.10)  
- [ ] Candle aggregator from trades table  

### Phase 4 — Order Engine MVP (Week 9–14)

- [ ] Bootstrap Rust project in `order_engine/`  
- [ ] Single-market CLOB (limit + market orders)  
- [ ] Gateway ↔ engine message bus (Redis Streams)  
- [ ] Order REST endpoints (4.1–4.8)  
- [ ] Persist orders/fills to PostgreSQL  
- [ ] Unit tests for matching logic  

### Phase 5 — Positions & Risk (Week 12–18)

- [ ] Position tracking on fill  
- [ ] Cross-margin calculator  
- [ ] Pre-trade margin checks on order submit  
- [ ] Liquidation scanner + executor  
- [ ] Funding rate calculator + hourly job  
- [ ] Position endpoints (5.1–5.6)  

### Phase 6 — Real-Time (Week 14–17)

- [ ] WebSocket server (ws or Socket.io)  
- [ ] Public channels: orderbook, trades, ticker  
- [ ] Private channels: orders, fills, positions  
- [ ] Redis pub/sub bridge from engine  

### Phase 7 — Frontend (Week 15–22)

- [ ] Wallet connect (wagmi)  
- [ ] Trading terminal page  
- [ ] Order book + chart + order form  
- [ ] Portfolio + orders pages  
- [ ] WebSocket hooks  

### Phase 8 — Production Hardening (Week 20–26)

- [ ] Rate limiting, WAF, secrets management  
- [ ] Prometheus + Grafana  
- [ ] Load testing (k6): 10k orders/min target  
- [ ] Chaos testing (Redis/DB failover)  
- [ ] Staging environment + runbooks  

### Phase 9 — On-Chain (Week 24–36, Optional)

- [ ] Foundry contracts (vault, clearinghouse)  
- [ ] Testnet deployment + keeper  
- [ ] Deposit/withdraw via contract events  
- [ ] Audit + mainnet launch  

---

## 16. Timeline (Gantt-Style)

Assumes **1 senior backend + 1 frontend + 0.5 DevOps** (adjust if solo).

```
Week:  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28+
       ├──┤
Phase0 ████ Foundation, Docker, CI
           ├────┤
Phase1     ████████ Prisma + Auth
                 ├────┤
Phase2           ████████ Accounts
                    ├──────┤
Phase3              ██████████ Oracle + Markets
                         ├──────────────┤
Phase4                   ████████████████████ Order Engine
                                    ├──────────────┤
Phase5                              ████████████████████ Risk + Liq + Funding
                                           ├────────┤
Phase6                                        ██████████ WebSocket
                                              ├──────────────────┤
Phase7                                        ████████████████████████████ Frontend
                                                               ├──────────────┤
Phase8                                                         ████████████████ Prod hardening
                                                                               ├────────────────────────┤
Phase9 (opt)                                                                   ████████████████████████████ On-chain
```

### Milestone Dates (Starting May 24, 2026)

| Milestone | Target Date | Deliverable |
|-----------|-------------|-------------|
| M0: Dev environment | Jun 7, 2026 | Docker, CI, middleware, health/ready |
| M1: Auth + DB | Jun 28, 2026 | Users, SIWE, Prisma schema live |
| M2: Paper trading API | Aug 9, 2026 | Markets, orders, engine (no real money) |
| M3: Risk engine | Sep 20, 2026 | Margin, funding, liquidations |
| M4: Beta terminal | Oct 25, 2026 | Frontend + WebSocket, testnet |
| M5: Staging prod | Dec 6, 2026 | Load tested, monitored, staging |
| M6: Mainnet launch | Jan 17, 2027 | Audited contracts (if on-chain) + prod |

**Solo developer:** Add ~40–50% to all timelines (≈40–50 weeks total).

---

## 17. Success Criteria by Phase

| Phase | Done when |
|-------|-----------|
| 0 | `docker compose up` runs API + DB + Redis; CI green |
| 1 | Wallet login works; JWT protects `/users/me` |
| 2 | User can deposit test USDC; ledger shows entries |
| 3 | BTC-PERP ticker shows live mark from Pyth |
| 4 | Limit buy + sell match; fills appear in DB |
| 5 | Underwater position gets liquidated automatically |
| 6 | Browser receives book deltas < 100ms after trade |
| 7 | User trades BTC-PERP from UI end-to-end |
| 8 | k6 load test passes; staging stable 7 days |
| 9 | Testnet deposit → trade → withdraw works on-chain |

---

## Appendix A — Immediate Next Steps (This Week)

1. **Write ADR** — Choose CLOB + off-chain ledger for MVP.  
2. **Implement middleware** — `error.middleware.ts`, `logger.ts`, `requestId.middleware.ts`.  
3. **Expand Prisma schema** — Copy models from Section 6; run `prisma migrate dev`.  
4. **Wire auth routes** — SIWE with `viem` + JWT in `tokens.ts`.  
5. **Docker Compose** — Postgres 16, Redis 7, API on 4000.  
6. **Bootstrap `order_engine/`** — `cargo init`, basic book struct + tests.  
7. **Update README** — Remove FastAPI references.

---

## Appendix B — Key Dependencies to Add

### Backend (`backend/package.json`)

```
siwe, viem, jsonwebtoken, bcrypt (if email auth), pino, express-rate-limit,
ws, bullmq (job queue), decimal.js, helmet, cookie-parser
```

### Frontend (`frontend/package.json`)

```
wagmi, viem, @tanstack/react-query, zustand, lightweight-charts,
@radix-ui/react-* (or shadcn/ui), zod, date-fns
```

### Order Engine (`order_engine/Cargo.toml`)

```
tokio, redis, sqlx, serde, rust_decimal, tracing, tonic (gRPC optional)
```

---

## Appendix C — Reference Architectures

| Platform | Model | Study for |
|----------|-------|-------------|
| **Hyperliquid** | Off-chain CLOB, on-chain settlement | Matching + API design |
| **dYdX v4** | Appchain + CLOB | Decentralized orderbook |
| **GMX** | AMM + oracle + keepers | If you pivot to pool-based |
| **Binance Futures** | Centralized CLOB | Risk engine, funding, liq |

---

*This document should be reviewed and updated after Phase 0 ADR is finalized. Store canonical copy in repo at `docs/IMPLEMENTATION_PLAN.md` when ready.*

