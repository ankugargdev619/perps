import { ApiError } from "../../utils/api-error.ts"


export const marketErrorCodes = {
  MARKET_NOT_FOUND: "MARKET_NOT_FOUND",
  MARKET_INACTIVE: "MARKET_INACTIVE",
  INVALID_SYMBOL: "INVALID_SYMBOL",
  INVALID_QUERY: "INVALID_QUERY"
} as const;

export type MarketErrorCodes =
  (typeof marketErrorCodes)[keyof typeof marketErrorCodes]

export const marketErrors = {
  notFound: (symbol: string) =>
    new ApiError(
      404,
      marketErrorCodes.MARKET_NOT_FOUND,
      `Unknown market: ${symbol}`
    ),

  inactive: (symbol: string) =>
    new ApiError(
      400,
      marketErrorCodes.MARKET_INACTIVE,
      `Market is not active ${symbol}`
    ),

  invalidSymbol: () =>
    new ApiError(
      400,
      marketErrorCodes.INVALID_SYMBOL,
      "Invalid market symbol format"
    ),

  invalidQuery: (message: string) =>
    new ApiError(
      400,
      marketErrorCodes.INVALID_QUERY,
      message
    )
}
