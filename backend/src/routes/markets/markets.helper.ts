import { marketKeys } from "../../cache/market-keys.ts";
import { redis } from "../../cache/redis.ts";
import { prisma } from "../../db/prisma.ts"
import { marketErrors } from "./markets.errors.ts";
import { MARKETS_CACHE_TTL_SECONDS, PublicMarket, PublicMarketTicker } from "./markets.schema.ts";

export const fetchMarketsFromDb = async (): Promise<PublicMarket[]> => {
  try {
    const rows = await prisma.market.findMany({
      orderBy: {
        id: "asc"
      }
    });

    return rows.map((m) => ({
      symbol: m.id,
      baseAsset: m.baseAsset,
      quoteAsset: m.quoteAsset,
      tickSize: m.tickSize.toString(),
      lotSize: m.lotSize.toString(),
      maxLeverage: m.maxLeverage,
      initialMargin: m.initialMargin.toString(),
      maintenanceMargin: m.maintenanceMargin.toString(),
      fundingInterval: m.fundingInterval,
      isActive: m.isActive,
    }));
    ;
  } catch (err: any) {
    throw err;
  }

}

/**
 *  This returns the data from the cache market 
 * */
export const getCachedMarkets = async (): Promise<PublicMarket[] | null> => {
  if (!redis) return null;
  const raw = await redis.get(marketKeys.all());
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PublicMarket[];
  } catch {
    return null;
  }
};

/**
 *  This sets the data to cache
 * */
export const setCachedMarkets = async (markets: PublicMarket[]): Promise<void> => {
  if (!redis) return;
  const payload = JSON.stringify(markets);
  const options = {
    EX: MARKETS_CACHE_TTL_SECONDS
  }
  await redis.set(marketKeys.all(), payload, options);
}

/**
 *  Fetch market from the data base 
 * */
export const fetchMarketFromDb = async (symbol: string): Promise<PublicMarket> => {
  try {
    const row = await prisma.market.findUnique({ where: { id: symbol } })
    if (!row) throw marketErrors.notFound(symbol);
    if (!row.isActive) throw marketErrors.inactive(symbol);
    return {
      symbol: row.id,
      baseAsset: row.baseAsset,
      quoteAsset: row.quoteAsset,
      tickSize: row.tickSize.toString(),
      lotSize: row.lotSize.toString(),
      maxLeverage: row.maxLeverage,
      initialMargin: row.initialMargin.toString(),
      maintenanceMargin: row.maintenanceMargin.toString(),
      fundingInterval: row.fundingInterval,
      isActive: row.isActive
    }
  } catch (err: any) {
    throw err;
  }
}

/**
 *  Get market data from the database
 * */
export const getCachedMarket = async (symbol: string): Promise<PublicMarket | null> => {
  if (!redis) return null;
  const raw = await redis.get(marketKeys.market(symbol));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PublicMarket;
  } catch {
    return null;
  }
};

/**
 *  Set the cache for market data
 * */
export const setCachedMarket = async (symbol: string, market: PublicMarket) => {
  if (!redis) return;
  const options = {
    EX: MARKETS_CACHE_TTL_SECONDS
  }
  await redis.set(marketKeys.market(symbol), JSON.stringify(market), options);
};

const neutralTicker = (symbol: string): PublicMarketTicker => ({
  symbol,
  last: "0",
  priceChange24h: "0",
  priceChangePct24h: "0",
  high24h: "0",
  low24h: "0",
  volume24h: "0",
  trades24h: 0,
  ts: Date.now(),
});

/**
 * Fetch market ticker data from thee redis
 * */
export const getTickerFromRedis = async (symbol: string): Promise<PublicMarketTicker> => {
  if (!redis) return neutralTicker(symbol);

  const key = marketKeys.ticker(symbol);
  const raw = await redis.hGetAll(key);

  if (!raw || Object.keys(raw).length === 0) return neutralTicker(symbol);

  return {
    symbol,
    last: raw.last ?? "0",
    priceChange24h: raw.priceChange24h ?? "0",
    priceChangePct24h: raw.priceChangePct24h ?? "0",
    high24h: raw.high24h ?? "0",
    low24h: raw.low24h ?? "0",
    volume24h: raw.volume24h ?? "0",
    trades24h: raw.trades24h ? Number(raw.trades24h) : 0,
    ts: raw.ts ? Number(raw.ts) : Date.now()
  };
}
