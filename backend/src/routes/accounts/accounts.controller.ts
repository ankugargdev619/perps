import { Request, Response } from "express";
import { accountService } from "./accounts.service.ts";

export async function listAccounts(req: Request, res: Response) {
  const userId = req.user?.id;

  // Check presence of the userId
  if (!userId) {
    res.status(400).json({
      success: false,
      error: "User id is required"
    });
    return;
  };

  console.log(`Loading account info for ${userId}`);

  const accounts = await accountService.listAccountsforUser(userId);

  res.json({ success: true, data: accounts });
}

export async function getAccountData(req: Request, res: Response) {
  // Extract the userId 
  const userId = req.user?.id;
  // Extract the accountId 
  const accountId: string = req.params.id as string;

  // Return if any value is missing 
  if (!userId || !accountId) {
    res.status(400).json({
      success: false,
      error: "User Id and Account Id is required"
    });
    return;
  }

  // Load the account data
  const accountData = await accountService.getAccountData(userId, accountId);
  res.json({ success: true, data: accountData });
}


export async function getAccountBalance(req: Request, res: Response) {
  // Extract the userId 
  const userId = req.user?.id;
  // Extract the accountId 
  const accountId: string = req.params.id as string;

  // Return if any value is missing 
  if (!userId || !accountId) {
    res.status(400).json({
      success: false,
      error: "User Id or account id is missing"
    });
    return;
  }

  const accountBalance = await accountService.getAccountBalance(userId, accountId);

  res.json({ success: true, data: accountBalance });
}


export async function depositBalance(req: Request, res: Response) {
  // Extract the userId 
  const userId = req.user?.id;
  // Extract the accountId 
  const accountId: string = req.params.id as string;
  // Get the amount to be deposited
  const { amount } = req.body;

  // Return if any value is missing 
  if (!userId || !accountId) {
    res.status(400).json({
      success: false,
      error: "User Id and Account Id is required"
    });
    return;
  }

  if (amount <= 0) {
    res.status(400).json({
      success: false,
      error: "Invalid deposit amount"
    })
  }

  const account = await accountService.depositBalance(userId, accountId, amount);

  res.json({ success: true, data: account });
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
