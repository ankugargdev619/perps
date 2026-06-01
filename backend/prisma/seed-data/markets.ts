export type MarketSeed = {
  id: string;
  baseAsset: string;
  quoteAsset: string;
  tickSize: string;
  lotSize: string;
  maxLeverage: number;
  initialMargin: string;
  maintenanceMargin: string;
  fundingInterval: number;
  isActive: boolean;
}


export const MARKET_SEEDS: MarketSeed[] = [
  {
    id: "BTC-PERP",
    baseAsset: "BTC",
    quoteAsset: "USDC",
    tickSize: "0.50",
    lotSize: "0.001",
    maxLeverage: 50,
    initialMargin: "0.02",
    maintenanceMargin: "0.01",
    fundingInterval: 28800,
    isActive: true,
  },
  {
    id: "ETH-PERP",
    baseAsset: "ETH",
    quoteAsset: "USDC",
    tickSize: "0.05",
    lotSize: "0.01",
    maxLeverage: 50,
    initialMargin: "0.02",
    maintenanceMargin: "0.01",
    fundingInterval: 28800,
    isActive: true,
  }
]
