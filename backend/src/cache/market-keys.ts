
export const marketKeys = {
  all: () => `markets:all`,
  market: (symbol: string) => `markets:${symbol}`,
  ticker: (symbol: string) => `ticker:${symbol}`,
  bookBids: (symbol: string) => `book:${symbol}:bids`,
  bookAsks: (symbol: string) => `book:${symbol}:asks`,
  trades: (symbol: string) => `trades:${symbol}`,
  candles: (symbol: string, resolution: string) => `candles:${symbol}:${resolution}`,
  funding: (symbol: string) => `funding:${symbol}`,
  mark: (symbol: string) => `mark:${symbol}`
};
