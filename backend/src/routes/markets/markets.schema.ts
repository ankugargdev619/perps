import z from "zod";
const SYMBOL_REGEX = /^[A-Z0-9]+-PERP$/;
const CANDLE_RESOLUTIONS = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;

export const marketSymbolParamSchema = z.object({
  symbol: z
    .string()
    .trim()
    .transform((s) => s.toUpperCase())
    .refine((s) => SYMBOL_REGEX.test(s), {
      message: "Symbol must be uppercase BASE-PERP (e.g. BTC-PERP)",
    }),
});

export type MarketSymbolParams = z.infer<typeof marketSymbolParamSchema>;

export const orderBookQuerySchema = z.object({
  depth: z.coerce.number().int().min(1).max(200).optional().default(50),
  cursor: z.string().min(1).optional()
})

export type OrderbookQuery = z.infer<typeof orderBookQuerySchema>;

export const tradesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  cursor: z.string().min(1).optional(),
});

export const candlesQuerySchema = z
  .object({
    resolution: z.enum(CANDLE_RESOLUTIONS),
    start: z.coerce.number().int().nonnegative().optional(),
    end: z.coerce.number().int().nonnegative().optional(),
    limit: z.coerce.number().int().min(1).max(1000).optional().default(200),
  })
  .refine((q) => !(q.start != null && q.end != null && q.start > q.end),
    { message: "start ,ust be <=  end" }
  );


export const MARKETS_CACHE_TTL_SECONDS = 5;


export type PublicMarket = {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  tickSize: string;
  lotSize: string;
  maxLeverage: number;
  initialMargin: string;
  maintenanceMargin: string;
  fundingInterval: number;
  isActive: boolean;
};

export type PublicMarketTicker = {
  symbol: string;
  last: string;
  priceChange24h: string;
  priceChangePct24h: string;
  high24h: string;
  low24h: string;
  volume24h: string;
  trades24h: number;
  ts: number;
};
