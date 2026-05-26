import { Request, Response } from "express";
import { accountService } from "./accounts.service.ts";

export async function listAccounts(req: Request, res: Response) {
  const userId = req.user?.id;

  // Check presence of the userId
  if (!userId) {
    res.status(401).json({
      success: false,
      message: "User id is required"
    });
    return;
  };

  console.log(`Loading account info for ${userId}`);

  const accounts = await accountService.listAccountsforUser(userId);

  res.json({ success: true, data: accounts });
}

export function getAccountData(req: Request, res: Response) {
  // Extract the userId 
  const userId = req.user?.id;
  // Extract the accountId 
  const accountId: string = req.params.id as string;

  // Return if any value is missing 
  if (!userId || !accountId) {
    res.status(401).json({
      message: "User Id and Account Id is required"
    });
    return;
  }
  accountService.validateAccountOwnership(userId, accountId);
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
