import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware.ts";
import { marketSymbolParamSchema } from "./markets.schema.ts";
import { getMarkeetTrades, getMarketCandles, getMarketData, getMarketFunding, getMarketMarkPrice, getMarketOrderBook, listMarkets } from "./markets.controller.ts";


export const marketsRouter = Router();

marketsRouter.get('/', () => { });
marketsRouter.get('/:symbol', validate({ params: marketSymbolParamSchema }), listMarkets);
// marketsRouter.get('/:symbol/ticker', getMarketData);
// marketsRouter.get('/:symbol/orderbook', validate({ params: symbolParamSchema }), getMarketOrderBook);
// marketsRouter.get('/:symbol/trades', validate({ params: symbolParamSchema }), getMarkeetTrades);
// marketsRouter.get('/:symbol/candles', validate({ params: symbolParamSchema }), getMarketCandles);
// marketsRouter.get('/:symbol/funding', validate({ params: symbolParamSchema }), getMarketFunding);
// marketsRouter.get('/:symbol/mark-price', validate({ params: symbolParamSchema }), getMarketMarkPrice);
