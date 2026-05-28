import { Request, Response } from "express";
import { accountService } from "./accounts.service.ts";
import { UserRole } from "../../generated/prisma/enums.ts";
import { env } from "../../config/env.ts";

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

  try {
    const accounts = await accountService.listAccountsforUser(userId);
    res.json({ success: true, data: accounts });
  } catch (err: any) {
    console.error("Error listing user accounts", err.meessage);
    res.status(401).json({
      success: false,
      error: "Error listing user data"
    });
  }
}

export async function getAccountData(req: Request, res: Response) {
  // Extract the userId 
  const userId = req.user?.id;
  // Extract the accountId 
  const accountId: string = req.validated?.params.id as string;

  // Return if any value is missing 
  if (!userId || !accountId) {
    res.status(400).json({
      success: false,
      error: "User Id and Account Id is required"
    });
    return;
  }

  try {
    // Load the account data
    const accountData = await accountService.getAccountData(userId, accountId);
    res.json({ success: true, data: accountData });
  } catch (err: any) {
    console.error("Error fetching account data", err);
    res.status(401).json({
      success: false,
      error: "Error fetching account data"
    })
  }
}


export async function getAccountBalance(req: Request, res: Response) {
  // Extract the userId 
  const userId = req.user?.id;
  // Extract the accountId 
  const accountId: string = req.validated?.params.id as string;

  // Return if any value is missing 
  if (!userId || !accountId) {
    res.status(400).json({
      success: false,
      error: "User Id or account id is missing"
    });
    return;
  }

  try {
    const accountBalance = await accountService.getAccountBalance(userId, accountId);
    res.json({ success: true, data: accountBalance });
  } catch (err: any) {
    console.error("Error fetching balance", err.message);
    res.status(401).json({
      success: false,
      message: "Error fetching the balance",
    });
  }
}


export async function depositBalance(req: Request, res: Response) {
  // Extract the userId 
  const userId = req.user?.id;
  // Extract the accountId 
  const accountId: string = req.validated?.params.id as string;
  // Get the amount to be deposited
  const { amount } = req.body;


  // Check if faucet is ENABLED 
  const FAUCET_ENABLED = env.FAUCET_ENABLED;
  if (!FAUCET_ENABLED) throw new Error('Deposit not allowed');

  // Check if the role is admin 
  if (req.user?.role != UserRole.ADMIN) throw new Error("Only admin allowed to deposit balance");

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

  try {
    const account = await accountService.depositBalance(accountId, amount, req.requestId!);
    res.json({ success: true, data: account });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message
    })
  }
}

export function withdrawBalance(req: Request, res: Response) {
  const accountId = req.validated?.params.id;

  // TODO: withdraw balance

  res.json({ message: "Withdraw balance" });
}


export function getAccountLedger(req: Request, res: Response) {
  const accountId = req.validated?.params.id;

  // TODO: 
  res.json({ message: "Account ledger" })
}

export function getEquity(req: Request, res: Response) {
  const accountId = req.validated?.params.id;

  // TODO:
  res.json({ message: "Equity balance" });
}
