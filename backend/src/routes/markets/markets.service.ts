import { marketErrors } from "./markets.errors.ts";
import { fetchMarketFromDb, fetchMarketsFromDb, getCachedMarket, getCachedMarkets, getTickerFromRedis, setCachedMarket, setCachedMarkets } from "./markets.helper.ts";


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

  async getMarketOrdereBook() {

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
