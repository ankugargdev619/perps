# Perps Platform — Implementation Plan & Production Blueprint

**Repository:** `/home/ankugarg/super30/perps`  
**Document date:** May 24, 2026  

**Estimated timelines**

| Track | Solo / small team | Team (4–6 engineers) |
|-------|-------------------|----------------------|
| **Off-chain MVP (required)** — Phases 0–8 | **22–26 weeks** | **14–18 weeks** |
| **+ On-chain (optional)** — Phase 9 | **+6–12 weeks** | **+6–10 weeks** |
| **Full stack (MVP + on-chain)** | **28–38 weeks** | **20–28 weeks** |

### Scope legend

| Tag | Meaning |
|-----|---------|
| **REQUIRED** | Needed for a production-grade **off-chain** perps platform (custodial / DB ledger). |
| **🔗 ON-CHAIN (OPTIONAL)** | Only if you add smart-contract settlement, on-chain collateral, or trustless deposits/withdrawals. **Skip entirely for MVP.** |

> **Default path:** Off-chain CLOB + PostgreSQL ledger + Redis + oracle feeds (Pyth/Chainlink as **price sources**, not settlement). Ship Phases 0–8 first; add Phase 9 only when you want decentralized custody/settlement.

---

## Table of Contents

0. [On-Chain Optional Scope — Quick Reference](#0-on-chain-optional-scope--quick-reference)
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
18. [Appendices](#appendix-a--immediate-next-steps-this-week)

---

## 0. On-Chain Optional Scope — Quick Reference

Everything below is **not required** for a working perps exchange with off-chain matching and a database ledger. Build these only if you choose on-chain settlement/custody (Phase 9).

| Category | Item | Notes |
|----------|------|-------|
| **Services** | `settlement-worker` | Batch trade settlement to L2 |
| **Services** | `indexer/` | Chain events → DB sync |
| **Services** | `contracts/` (Foundry) | Vault, clearinghouse, oracle adapter |
| **Architecture** | Hybrid / batched on-chain settlement | MVP uses **off-chain ledger only** |
| **Architecture** | On-chain collateral vault | MVP uses **DB balance** + test faucet |
| **ADR** | Chain selection (L2, appchain, Solana) | Only for Phase 9 |
| **Workers** | `withdrawal-processor` (on-chain txs) | MVP: internal ledger withdrawal / manual ops |
| **Workers** | `reconciliation` (DB vs vault) | MVP: N/A |
| **API** | `POST .../deposit` with `txHash` | MVP: test faucet credits DB only |
| **API** | `POST .../withdraw` → on-chain payout | MVP: queue + manual / fiat off-ramp |
| **Prisma** | `OnChainDeposit`, `WithdrawalRequest.txHash`, `SettlementBatch` | Add in Phase 9 only |
| **Infra** | `contracts/` in repo, testnet/mainnet deploy | Phase 9 |
| **Infra** | Staging/prod **testnet contracts** | Phase 9 |
| **Security** | Smart contract audit | Phase 9 |
| **Security** | Withdrawal allowlist for **new wallet addresses** | Stricter for on-chain; lighter for MVP |
| **Frontend** | Chain switcher, wrong-network prompts | Phase 9 (wallet login via SIWE is **REQUIRED**) |
| **Frontend** | On-chain deposit/withdraw UI | Phase 9 |
| **Milestone** | M6: Mainnet + audited contracts | Phase 9 only |
| **Success** | Phase 9: testnet deposit → trade → withdraw on-chain | Phase 9 only |
| **Timeline** | Phase 9 bar in Gantt | Optional add-on |

**Still REQUIRED (not on-chain):** SIWE wallet login, Pyth/Chainlink as **oracle price feeds**, order engine, margin, funding, liquidation, WebSocket, frontend terminal — these work without smart contracts.

---

## 1. Executive Summary

The `perps` repo is an **early scaffold**: Express 5 API with health check, Prisma/PostgreSQL and Redis wired but unused, empty auth/user route stubs, placeholder `order_engine/`, and a default Next.js 16 frontend. **No trading, margin, oracle, liquidation, matching, wallet, or on-chain logic exists.**

To reach production grade (**off-chain MVP**), you must build:

| Layer | Scope | Effort |
|-------|-------|--------|
| Architecture & data model | **REQUIRED** | 1–2 weeks |
| Auth + accounts | **REQUIRED** | 2–3 weeks |
| Markets + oracle/index | **REQUIRED** | 2–3 weeks |
| Order engine (CLOB) | **REQUIRED** | 6–10 weeks |
| Risk (margin, funding, liquidation) | **REQUIRED** | 4–6 weeks |
| REST + WebSocket APIs | **REQUIRED** | 3–4 weeks |
| Frontend trading terminal | **REQUIRED** | 6–8 weeks |
| DevOps, observability, security | **REQUIRED** | 3–4 weeks |
| Testing & hardening | **REQUIRED** | 4–6 weeks |
| On-chain settlement, contracts, keepers | **🔗 ON-CHAIN (OPTIONAL)** | +6–12 weeks |

This plan assumes a **CLOB-style perpetuals exchange** (Hyperliquid-style **off-chain matching**): PostgreSQL ledger as source of truth for balances and positions. **On-chain settlement is a later add-on (Phase 9), not a prerequisite for launch.**

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
| Smart contracts | 0% (🔗 optional — Phase 9) |
| Docker / CI/CD | 0% |
| Production observability | 0% |
| Frontend product UI | 0% |

### 2.5 Documentation Drift

Root `README.md` still references **FastAPI on port 8000** — the backend was migrated to Node/Express on port **4000**. Update README in Phase 0.

---

## 3. Architecture Decision (Required First)

Before writing trading code, lock these decisions in an **Architecture Decision Record (ADR)**:

| Decision | Options | MVP (required) | 🔗 On-chain (optional) |
|----------|---------|----------------|------------------------|
| **Matching model** | CLOB vs AMM vs hybrid | **CLOB** | Same |
| **Settlement** | On-chain vs off-chain ledger vs hybrid | **Off-chain ledger** (PostgreSQL) | Hybrid: batched L2 settlement |
| **Collateral** | On-chain vault vs DB ledger | **DB ledger** + test faucet | Vault contract + deposits |
| **Auth** | SIWE vs email vs API keys | **SIWE + API keys** | Same (SIWE ≠ on-chain custody) |
| **Chain** | L2, appchain, Solana | *Not needed* | Pick one in Phase 9 |
| **Oracle** | Pyth, Chainlink, internal | **Pyth/Chainlink as price feed** + internal mark | On-chain `OracleAdapter` verification |
| **Order engine** | Node vs Rust vs Go | **Rust** matching; Node API | Same |

**MVP scope (required):** Off-chain CLOB + PostgreSQL ledger + Redis order book + Pyth (or Chainlink) as **off-chain price oracle**.  
**Phase 9 only (optional):** Smart contracts, keepers, on-chain deposit/withdraw, reconciliation.

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
              │  🔗 ON-CHAIN (OPTIONAL) — Phase 9    │
              │  Settlement worker / Keeper          │
              │  Smart contracts on L2             │
              └───────────────────────────────────┘
```

**Solid box (above dashed):** required for MVP. **Dashed on-chain layer:** skip until Phase 9.

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

| Service | Scope | Location | Responsibility | Tech |
|---------|-------|----------|----------------|------|
| **api-gateway** | **REQUIRED** | `backend/` | REST, WS, auth, validation | Node, Express |
| **order-engine** | **REQUIRED** | `order_engine/` | Matching, order book | Rust recommended |
| **risk-engine** | **REQUIRED** | `backend/src/workers/risk/` | Margin, liquidation, funding | Node |
| **oracle-service** | **REQUIRED** | `backend/src/workers/oracle/` | Index/mark from Pyth/Chainlink (off-chain) | Node |
| **frontend** | **REQUIRED** | `frontend/` | Trading terminal | Next.js 16 |
| **shared-types** | **REQUIRED** | `packages/types/` | Shared TS types / OpenAPI | TypeScript |
| **settlement-worker** | **🔗 ON-CHAIN (OPTIONAL)** | `backend/src/workers/settlement/` | Batch settle trades on L2 | Node + viem |
| **indexer** | **🔗 ON-CHAIN (OPTIONAL)** | `indexer/` | Chain events → DB sync | Node or Rust |
| **contracts** | **🔗 ON-CHAIN (OPTIONAL)** | `contracts/` | Vault, clearinghouse, oracle adapter | Foundry |

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

// 🔗 ON-CHAIN (OPTIONAL) — add in Phase 9 only
model OnChainDeposit {
  id          String   @id @default(cuid())
  accountId   String
  txHash      String   @unique
  chainId     Int
  amount      Decimal  @db.Decimal(36, 18)
  confirmations Int
  status      String   // PENDING, CONFIRMED, FAILED
  createdAt   DateTime @default(now())
}

model WithdrawalRequest {
  id            String   @id @default(cuid())
  accountId     String
  amount        Decimal  @db.Decimal(36, 18)
  toAddress     String
  txHash        String?  // 🔗 set when on-chain payout sent
  status        String   // PENDING, PROCESSING, COMPLETED, FAILED
  createdAt     DateTime @default(now())
}

model SettlementBatch {
  id          String   @id @default(cuid())
  txHash      String?
  tradeCount  Int
  status      String
  createdAt   DateTime @default(now())
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

**Scope column:** **REQUIRED** = MVP · **🔗** = on-chain variant or only needed with Phase 9

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

| # | Scope | Method | Path | Description |
|---|-------|--------|------|-------------|
| 2.1 | **REQUIRED** | `GET` | `/accounts` | List user accounts |
| 2.2 | **REQUIRED** | `GET` | `/accounts/:id` | Account detail + equity |
| 2.3 | **REQUIRED** | `GET` | `/accounts/:id/balances` | Collateral balances |
| 2.4 | **REQUIRED** | `POST` | `/accounts/:id/deposit` | Credit balance — **MVP:** test faucet / admin credit |
| 2.4b | **🔗** | `POST` | `/accounts/:id/deposit` | Same path — body includes `txHash`; verify on-chain deposit |
| 2.5 | **REQUIRED** | `POST` | `/accounts/:id/withdraw` | Request withdrawal — **MVP:** ledger debit + ops queue |
| 2.5b | **🔗** | `POST` | `/accounts/:id/withdraw` | Same path — triggers on-chain USDC transfer |
| 2.6 | **REQUIRED** | `GET` | `/accounts/:id/ledger` | Transaction history (paginated) |
| 2.7 | **REQUIRED** | `GET` | `/accounts/:id/equity` | Total equity, margin used, free collateral |
| 2.8 | **🔗** | `GET` | `/accounts/:id/deposits/:txHash` | On-chain deposit status |
| 2.9 | **🔗** | `GET` | `/accounts/:id/withdrawals/:id` | Withdrawal + chain tx status |

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

| Worker | Scope | Schedule | Responsibility |
|--------|-------|----------|----------------|
| **oracle-ingestor** | **REQUIRED** | Every 1–5s | Pull Pyth/Chainlink **prices** (off-chain API); compute mark |
| **funding-calculator** | **REQUIRED** | Every funding interval (e.g. 1h) | Funding payments; debit/credit DB ledger |
| **liquidation-scanner** | **REQUIRED** | Every 1–5s | Find positions below maintenance margin |
| **liquidation-executor** | **REQUIRED** | Event-driven | Close positions at mark ± slippage |
| **insurance-fund** | **REQUIRED** | On liquidation | Absorb bad debt (DB ledger) if liq insufficient |
| **candle-aggregator** | **REQUIRED** | Every 1m/5m/1h | Build OHLCV from trades |
| **expired-order-cleanup** | **REQUIRED** | Every 1m | Cancel GTD expired orders |
| **withdrawal-processor** | **🔗 ON-CHAIN (OPTIONAL)** | Every 30s | Sign & broadcast on-chain withdrawal txs |
| **deposit-confirmer** | **🔗 ON-CHAIN (OPTIONAL)** | Every 15s | Watch vault events; credit DB after N confirmations |
| **settlement-batcher** | **🔗 ON-CHAIN (OPTIONAL)** | Every N sec / M trades | Submit trade batches to clearinghouse |
| **reconciliation** | **🔗 ON-CHAIN (OPTIONAL)** | Daily | DB balances vs on-chain vault total |

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

## 11. Smart Contracts — 🔗 ON-CHAIN (OPTIONAL) — Phase 9 Only

> **Entire section is optional.** A production off-chain perps platform does **not** need any of this. Add only when you want trustless custody or on-chain settlement.

**New directory:** `contracts/` (Foundry) — create in Phase 9, not before.

| Contract | Purpose |
|----------|---------|
| `CollateralVault.sol` | USDC deposits/withdrawals |
| `MarginAccount.sol` | Per-user margin state root (Merkle optional) |
| `PerpClearinghouse.sol` | Batch settle trades from operator signature |
| `OracleAdapter.sol` | On-chain verification of Pyth/Chainlink updates |
| `InsuranceFund.sol` | On-chain protocol backstop |
| `Governor.sol` | Pause, parameter updates (timelock) |

**Keepers (optional):** `settlement-worker`, `deposit-confirmer`, `withdrawal-processor` — see Section 10.

**When to start:** After Phase 8 (staging prod) is stable. **Do not block MVP on contracts or audits.**

---

## 12. Frontend Blueprint

**Stack additions (required):** SIWE via `viem`, TanStack Query, lightweight-charts or TradingView, Zustand.  
**Stack additions (🔗 on-chain only):** `wagmi`, WalletConnect, chain switcher, deposit/withdraw contract flows.

### 12.1 Pages / Routes

| Route | Scope | Purpose |
|-------|-------|---------|
| `/` | **REQUIRED** | Landing / SIWE connect wallet |
| `/trade/[symbol]` | **REQUIRED** | Main trading terminal |
| `/portfolio` | **REQUIRED** | Positions, balances, PnL |
| `/orders` | **REQUIRED** | Open orders + history |
| `/markets` | **REQUIRED** | Market list |
| `/account/settings` | **REQUIRED** | API keys, preferences |
| `/account/deposit` | **🔗** | On-chain deposit UI (approve + deposit) |
| `/account/withdraw` | **🔗** | On-chain withdraw UI |
| `/docs` | optional | API docs link |

### 12.2 Trading Terminal Components

1. **Header** — wallet, equity — **🔗** add network/chain indicator in Phase 9  
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
├── contracts/                  # 🔗 ON-CHAIN (OPTIONAL) — Foundry, Phase 9
├── indexer/                    # 🔗 ON-CHAIN (OPTIONAL)
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

| Env | Scope | Purpose |
|-----|-------|---------|
| `local` | **REQUIRED** | Docker compose, test faucet (DB credits) |
| `staging` | **REQUIRED** | Full off-chain stack |
| `staging` | **🔗** | + testnet contracts & keepers |
| `prod` | **REQUIRED** | Off-chain prod, WAF, multi-AZ |
| `prod` | **🔗** | + mainnet contracts & audited vault |

### 13.4 CI/CD Pipeline

1. PR: lint + unit tests + integration tests  
2. Merge to `main`: build Docker images  
3. Deploy to staging automatically  
4. Prod: manual approval + blue/green deploy  

---

## 14. Security & Compliance Checklist

### Required (off-chain MVP)

- [ ] SIWE replay protection (nonce, expiry)  
- [ ] API key HMAC signing (timestamp + body)  
- [ ] Rate limiting per IP and per user  
- [ ] Input validation (Zod on all routes — use `validate.middleware.ts`)  
- [ ] SQL injection prevention (Prisma parameterized queries)  
- [ ] Secrets in vault (not `.env` in prod)  
- [ ] Admin routes behind separate auth + IP allowlist  
- [ ] Oracle staleness circuit breaker (halt market if mark > 30s old)  
- [ ] Max position / OI limits per market  
- [ ] DDoS protection (Cloudflare/AWS Shield)  
- [ ] Geo-blocking (if required by jurisdiction)  

### 🔗 On-chain (optional) — Phase 9 only

- [ ] Withdrawal allowlist + delay for new **wallet** addresses  
- [ ] Multisig / timelock on contract admin  
- [ ] Smart contract audit before mainnet  
- [ ] Keeper key management (HSM, separate from API keys)  
- [ ] Reconciliation alerts (DB vs vault drift)  
- [ ] Bug bounty program (especially after contracts live)  

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

- [ ] SIWE wallet login (viem — **required**)  
- [ ] Trading terminal page  
- [ ] Order book + chart + order form  
- [ ] Portfolio + orders pages  
- [ ] WebSocket hooks  
- [ ] 🔗 On-chain UI (deposit/withdraw, chain switch) — defer to Phase 9  

### Phase 8 — Production Hardening (Week 20–26)

- [ ] Rate limiting, WAF, secrets management  
- [ ] Prometheus + Grafana  
- [ ] Load testing (k6): 10k orders/min target  
- [ ] Chaos testing (Redis/DB failover)  
- [ ] Staging environment + runbooks  

### Phase 9 — 🔗 ON-CHAIN (OPTIONAL) (Week +6–12 after Phase 8)

> Skip this phase entirely to ship a production **off-chain** perps platform at **M5** (see timeline).

- [ ] Foundry `contracts/` (vault, clearinghouse, oracle adapter)  
- [ ] `indexer/` — vault Deposit/Withdraw events → DB  
- [ ] `settlement-worker` + `deposit-confirmer` + on-chain `withdrawal-processor`  
- [ ] API: deposit with `txHash`, withdrawal chain status (2.4b, 2.5b, 2.8, 2.9)  
- [ ] Frontend: chain switch, deposit/withdraw pages  
- [ ] Testnet deployment + reconciliation worker  
- [ ] Audit + mainnet contract launch (**M6**)  

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
Phase9 🔗 OPTIONAL (not on critical path)                                          ████████████ On-chain
```

### Milestone Dates (Starting May 24, 2026)

| Milestone | Scope | Target Date | Deliverable |
|-----------|-------|-------------|-------------|
| M0: Dev environment | **REQUIRED** | Jun 7, 2026 | Docker, CI, middleware, health/ready |
| M1: Auth + DB | **REQUIRED** | Jun 28, 2026 | Users, SIWE, Prisma schema live |
| M2: Paper trading API | **REQUIRED** | Aug 9, 2026 | Markets, orders, engine |
| M3: Risk engine | **REQUIRED** | Sep 20, 2026 | Margin, funding, liquidations |
| M4: Beta terminal | **REQUIRED** | Oct 25, 2026 | Frontend + WebSocket |
| **M5: Production launch (off-chain)** | **REQUIRED** | **Dec 6, 2026** | **Load-tested staging/prod — no contracts required** |
| M6: On-chain mainnet | **🔗 OPTIONAL** | Jan 17, 2027+ | Audited contracts + vault deposits |

**Solo developer (Phases 0–8 only):** ~30–36 weeks. **Add Phase 9:** +6–12 weeks.

---

## 17. Success Criteria by Phase

| Phase | Scope | Done when |
|-------|-------|-----------|
| 0 | **REQUIRED** | `docker compose up` runs API + DB + Redis; CI green |
| 1 | **REQUIRED** | Wallet login works; JWT protects `/users/me` |
| 2 | **REQUIRED** | User can deposit via **test faucet**; ledger shows entries |
| 3 | **REQUIRED** | BTC-PERP ticker shows live mark from Pyth (off-chain feed) |
| 4 | **REQUIRED** | Limit buy + sell match; fills appear in DB |
| 5 | **REQUIRED** | Underwater position gets liquidated automatically |
| 6 | **REQUIRED** | Browser receives book deltas < 100ms after trade |
| 7 | **REQUIRED** | User trades BTC-PERP from UI end-to-end |
| 8 | **REQUIRED** | k6 load test passes; staging stable 7 days → **ship at M5** |
| 9 | **🔗 OPTIONAL** | Testnet: on-chain deposit → trade → on-chain withdraw |

---

## Appendix A — Immediate Next Steps (This Week)

1. **Write ADR** — CLOB + **off-chain ledger** (skip on-chain for MVP unless required).  
2. **Implement middleware** — `error.middleware.ts`, `logger.ts`, `requestId.middleware.ts`.  
3. **Expand Prisma schema** — Copy models from Section 6; run `prisma migrate dev`.  
4. **Wire auth routes** — SIWE with `viem` + JWT in `tokens.ts`.  
5. **Docker Compose** — Postgres 16, Redis 7, API on 4000.  
6. **Bootstrap `order_engine/`** — `cargo init`, basic book struct + tests.  
7. **Update README** — Remove FastAPI references.

---

## Appendix B — Key Dependencies to Add

### Backend (`backend/package.json`) — REQUIRED

```
siwe, viem, jsonwebtoken, pino, express-rate-limit,
ws, bullmq (job queue), decimal.js, helmet, cookie-parser
```

### Backend — 🔗 ON-CHAIN (OPTIONAL), Phase 9

```
# viem already listed — add: abis from contracts/, @pythnetwork/client (if on-chain oracle verify)
```

### Frontend (`frontend/package.json`) — REQUIRED

```
viem, @tanstack/react-query, zustand, lightweight-charts,
@radix-ui/react-* (or shadcn/ui), zod, date-fns
```

### Frontend — 🔗 ON-CHAIN (OPTIONAL), Phase 9

```
wagmi, @wagmi/connectors, WalletConnect
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

---

## Appendix D — Phase 9 Checklist (🔗 On-Chain Only)

Use this when you opt into on-chain; ignore until M5 (off-chain prod) is done.

- [ ] ADR: chain, custody model, upgradeability  
- [ ] `contracts/` — vault, clearinghouse, oracle adapter, governor  
- [ ] Testnet deploy + verified contracts  
- [ ] `indexer` listening to `Deposit` / `Withdraw` events  
- [ ] `deposit-confirmer` + `withdrawal-processor` + `settlement-batcher`  
- [ ] `reconciliation` worker + alerts  
- [ ] API endpoints 2.4b, 2.5b, 2.8, 2.9  
- [ ] Prisma: `OnChainDeposit`, `WithdrawalRequest.txHash`, `SettlementBatch`  
- [ ] Frontend deposit/withdraw + chain switch  
- [ ] External audit + bug bounty  
- [ ] Mainnet deploy (**M6**)

---

*Canonical plan: `ImplementationPlan.md` in repo root. Review after Phase 0 ADR; default to **off-chain MVP** unless product requires trustless custody.*

