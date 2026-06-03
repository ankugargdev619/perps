import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware.ts";
import { marketSymbolParamSchema, orderBookQuerySchema } from "./markets.schema.ts";
import { getMarketData, getMarketTicker, listMarkets, getMarketOrderBook } from "./markets.controller.ts";


export const marketsRouter = Router();

marketsRouter.get('/', listMarkets);
marketsRouter.get('/:symbol', validate({ params: marketSymbolParamSchema }), getMarketData);
marketsRouter.get('/:symbol/ticker', validate({ params: marketSymbolParamSchema }), getMarketTicker);
marketsRouter.get('/:symbol/orderbook', validate({ params: marketSymbolParamSchema, query: orderBookQuerySchema }), getMarketOrderBook);
// marketsrouter.get('/:symbol/trades', validate({ params: symbolparamschema }), getmarkeettrades);
// marketsrouter.get('/:symbol/candles', validate({ params: symbolparamschema }), getmarketcandles);
// marketsrouter.get('/:symbol/funding', validate({ params: symbolparamschema }), getmarketfunding);
// marketsrouter.get('/:symbol/mark-price', validate({ params: symbolparamschema }), getmarketmarkprice);
