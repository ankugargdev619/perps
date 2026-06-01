import { redis, connectRedis, disconnectRedis } from "../src/cache/redis.ts";
import { MARKET_SEEDS } from "../prisma/seed-data/markets.ts";
import { marketKeys } from "../src/cache/market-keys.ts";

const now = Date.now();
const nextFundingAt = now + 4 * 60 * 60 * 1000;

async function seedSymbol(symbol: string, lastPrice: string) {

  await redis.hSet(marketKeys.ticker(symbol), {
    last: lastPrice,
    priceChange24h: "120.00",
    priceChangePct24h: "0.0018",
    high24h: String(Number(lastPrice) + 1000),
    low24h: String(Number(lastPrice) - 1000),
    volume24h: "1234.56",
    trades24h: "9876",
    ts: String(now)
  });

  const bidsKey = marketKeys.bookBids(symbol);
  const asksKey = marketKeys.bookAsks(symbol);
  await redis.del(bidsKey);
  await redis.del(asksKey);

  const last = Number(lastPrice);
  await redis.zAdd(bidsKey, [
    { score: last - 0.5, value: "1.25" },
    { score: last - 1.0, value: "0.80" },
    { score: last - 2.0, value: "2.10" },
  ]);
  await redis.zAdd(asksKey, [
    { score: last + 0.5, value: "0.60" },
    { score: last + 1.0, value: "2.10" },
    { score: last + 2.0, value: "1.00" },
  ]);


  const tradesKey = marketKeys.trades(symbol);
  await redis.del(tradesKey);

  const trades = [
    { id: `${symbol}-t3`, price: lastPrice, size: "0.01", side: "BUY", ts: now - 2000 },
    { id: `${symbol}-t2`, price: lastPrice, size: "0.05", side: "SELL", ts: now - 1000 },
    { id: `${symbol}-t1`, price: lastPrice, size: "0.02", side: "BUY", ts: now },
  ];

  for (const t of trades) {
    await redis.lPush(tradesKey, JSON.stringify(t));
  }

  const candlesKey = marketKeys.candles(symbol, 'lm');
  await redis.del(candlesKey);
  const candleTs = now - 60_000;
  await redis.zAdd(candlesKey, {
    score: candleTs,
    value: JSON.stringify({
      open: String(last - 5),
      high: String(last + 10),
      low: String(last - 10),
      close: lastPrice,
      volume: "12.34",
    }),
  });

  await redis.hSet(marketKeys.funding(symbol), {
    rate: "0.0001",
    intervalSec: "28800",
    nextFundingAt: String(nextFundingAt),
    ts: String(now),
  });

  await redis.hSet(marketKeys.mark(symbol), {
    indexPrice: String(Number(lastPrice) - 2),
    markPrice: lastPrice,
    ts: String(now),
  });
}

async function main() {
  await connectRedis();

  const prices: Record<string, string> = {
    "BTC-PERP": "65000.50",
    "ETH-PERP": "3200.25",
  };

  for (const m of MARKET_SEEDS) {
    await seedSymbol(m.id, prices[m.id] ?? "100.00");
    console.log(`Seeded redis for ${m.id}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectRedis();
  })
