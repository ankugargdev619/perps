import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware.ts";
import { marketSymbolParamSchema } from "./markets.schema.ts";
import { getMarkeetTrades, getMarketCandles, getMarketData, getMarketFunding, getMarketMarkPrice, getMarketOrderBook, getMarketTicker, listMarkets } from "./markets.controller.ts";


export const marketsRouter = Router();

marketsRouter.get('/', listMarkets);
marketsRouter.get('/:symbol', validate({ params: marketSymbolParamSchema }), getMarketData);
marketsRouter.get('/:symbol/ticker', validate({ params: marketSymbolParamSchema }), getMarketTicker);
// marketsrouter.get('/:symbol/orderbook', validate({ params: symbolparamschema }), getmarketorderbook);
// marketsrouter.get('/:symbol/trades', validate({ params: symbolparamschema }), getmarkeettrades);
// marketsrouter.get('/:symbol/candles', validate({ params: symbolparamschema }), getmarketcandles);
// marketsrouter.get('/:symbol/funding', validate({ params: symbolparamschema }), getmarketfunding);
// marketsrouter.get('/:symbol/mark-price', validate({ params: symbolparamschema }), getmarketmarkprice);
