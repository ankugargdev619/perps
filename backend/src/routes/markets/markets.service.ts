import { marketKeys } from "../../cache/market-keys.ts";
import { redis } from "../../cache/redis.ts";
import { marketErrors } from "./markets.errors.ts";
import { fetchMarketFromDb, fetchMarketsFromDb, getCachedMarket, getCachedMarkets, getTickerFromRedis, setCachedMarket, setCachedMarkets } from "./markets.helper.ts";
import { OrderBook } from "./markets.schema.ts";


export class MarketsService {

  async listMarkets() {

    try {
      // Try in the cache
      const cached = getCachedMarkets();
      if (cached) return cached;

      const markets = await fetchMarketsFromDb();
      setCachedMarkets(markets); // Set markets data in the cache

      return markets;
    } catch (err: any) {
      throw err;
    }
  }

  async getMarketData(symbol: string) {

    try {
      // Try cached market data
      const cached = getCachedMarket(symbol);

      if (cached) return cached;

      // Get the market data from the DB
      const market = await fetchMarketFromDb(symbol);
      setCachedMarket(symbol, market); // Set market key in redis cache

      return market;
    } catch (err: any) {
      throw err;
    }
  }

  async getMarketTicker(symbol: string) {
    try {
      // Ensure that the market exists
      const market = await fetchMarketFromDb(symbol);
      if (!market) throw marketErrors.notFound(symbol);

      const ticker = await getTickerFromRedis(symbol);

      return ticker;
    } catch (err: any) {
      throw err;
    }
  }

  async getMarketOrderBook(symbol: string, depth: number): Promise<OrderBook> {
    try {
      const market = await fetchMarketFromDb(symbol);
      if (!market) throw marketErrors.notFound(symbol);

      const bidsKey = marketKeys.bookBids(symbol);
      const asksKey = marketKeys.bookAsks(symbol);

      const tickSize = market.tickSize ?? "0.01";
      const decimals = tickSize.includes(".") ? tickSize.split(".")[1].length : 0;
      const fmt = (n: number) => n.toFixed(decimals);

      if (!redis) {
        return { symbol, bids: [], asks: [], ts: Date.now() };
      }

      const [bidsRaw, asksRaw] = await Promise.all([
        redis.zRangeWithScores(bidsKey, 0, depth - 1, { REV: true }),
        redis.zRangeWithScores(asksKey, 0, depth - 1)
      ]);

      return {
        symbol,
        bids: bidsRaw.map((x) => [fmt(x.score), x.value]),
        asks: asksRaw.map((x) => [fmt(x.score), x.value]),
        ts: Date.now(),
      }

    } catch (err: any) {
      throw err;
    }
  }

  async getMarketTrades() {

  }

  async getMarketCandles() {

  }

  async getMarketFunding() {

  }

  async getMarketMarkPrice() {

  }
}

export const marketsService = new MarketsService();
