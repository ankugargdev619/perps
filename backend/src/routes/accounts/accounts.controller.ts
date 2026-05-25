import { Response } from "express";
import { AuthRequest } from "../../types/auth.type.ts";

export function listAccounts(req: AuthRequest, res: Response) {
  const userId = req.user.id;
  res.json({ message: "Listing accounts" });
}

export function getAccountData(req: AuthRequest, res: Response) {
  // Extract the accountId 
  const accountId = req.params.id

  // TODO : Get the account data

  res.json({ message: "Account data" });
}


export function getAccountBalance(req: AuthRequest, res: Response) {
  const accountId = req.params.id;

  // TODO: Get account balance

  res.json({ message: "Account balance" });
}


export function depositBalance(req: AuthRequest, res: Response) {
  const accountId = req.params.id;

  // TODO: deposit the amount

  res.json({ message: "Deposit balance" })
}

export function withdrawBalance(req: AuthRequest, res: Response) {
  const accountId = req.params.id;

  // TODO: withdraw balance

  res.json({ message: "Withdraw balance" });
}


export function getAccountLedger(req: AuthRequest, res: Response) {
  const accountId = req.params.id;

  // TODO: 
  res.json({ message: "Account ledger" })
}

export function getEquity(req: AuthRequest, res: Response) {
  const accountId = req.params.id;

  // TODO:
  res.json({ message: "Equity balance" });
}
