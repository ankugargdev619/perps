import { Request, Response } from "express";

export function listAccounts(_req: Request, res: Response) {
  res.json({ message: "Listing accounts" });
}

export function getAccountData(req: Request, res: Response) {
  // Extract the accountId 
  const accountId = req.params.id

  // TODO : Get the account data

  res.json({ message: "Account data" });
}


export function getAccountBalance(req: Request, res: Response) {
  const accountId = req.params.id;

  // TODO: Get account balance

  res.json({ message: "Account balance" });
}


export function depositBalance(req: Request, res: Response) {
  const accountId = req.params.id;

  // TODO: deposit the amount

  res.json({ message: "Deposit balance" })
}

export function withdrawBalance(req: Request, res: Response) {
  const accountId = req.params.id;

  // TODO: withdraw balance

  res.json({ message: "Withdraw balance" });
}


export function getAccountLedger(req: Request, res: Response) {
  const accountId = req.params.id;

  // TODO: 
  res.json({ message: "Account ledger" })
}

export function getEquity(req: Request, res: Response) {
  const accountId = req.params.id;

  // TODO:
  res.json({ message: "Equity balance" });
}
