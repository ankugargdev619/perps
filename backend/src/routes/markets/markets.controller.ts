import { Request, Response } from "express";
import { marketsService } from "./markets.service.ts";

/**
 * Controller for :
 * GET : /markets
 * */
export async function listMarkets(req: Request, res: Response) {

  await marketsService.listMarkets();

  res.json({
    success: true,
    data: {}
  });
}

/**
 * Controller for
 * GET : /markets/:symbol
 * */
export async function getMarketData(req: Request, res: Response) {

  await marketsService.getMarketData();
  res.json({
    success: true,
    data: {}
  })
}

/**
 * Controller for
 * GET : /markets/:symbol/ticker
 * */
export async function getMarketTicker(req: Request, res: Response) {

  await marketsService.getMarketTicker();
  res.json({
    success: true,
    data: {}
  });
}

/**
 * Controller for
 * GET : /markets/:symbol/orderbook 
 * */
export async function getMarketOrderBook(req: Request, res: Response) {

  await marketsService.getMarketOrdereBook();
  res.json({
    success: true,
    data: {}
  })
}

/**
 * Controller for
 * GET : /markets/:symbol/trades
 * */
export async function getMarkeetTrades(req: Request, res: Response) {

  await marketsService.getMarketTrades();
  res.json({
    success: true,
    data: {}
  })
}

/**
 * Controller for
 * GET : /markets/:symbol/candles 
 * */
export async function getMarketCandles(req: Request, res: Response) {

  await marketsService.getMarketCandles();
  res.json({
    success: true,
    data: {}
  })
}

/**
 * Controller for 
 * GET : /markets/:symbol/funding 
 * */
export async function getMarketFunding(req: Request, res: Response) {
  await marketsService.getMarketFunding();
  res.json({
    success: true,
    data: {}
  })
}


/**
 * Controller for
 * GET : /markets/:symbol/mark-price 
 * */
export async function getMarketMarkPrice(req: Request, res: Response) {
  await marketsService.getMarketMarkPrice();
  res.json({
    success: true,
    data: {}
  })
}
