import { Request, Response } from "express";
import { accountService } from "./accounts.service.ts";
import { UserRole } from "../../generated/prisma/enums.ts";
import { env } from "../../config/env.ts";
import { HttpError } from "../../utils/http-error.ts";

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

  const accounts = await accountService.listAccountsforUser(userId);
  res.json({ success: true, data: accounts });
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

  // Load the account data
  const accountData = await accountService.getAccountData(userId, accountId);
  res.json({ success: true, data: accountData });
}


export async function getAccountBalance(req: Request, res: Response) {
  // Extract the userId 
  const userId = req.user?.id;
  // Extract the accountId 
  const accountId: string = req.validated?.params.id as string;

  // Return if any value is missing 
  if (!userId || !accountId) {
    console.error("Account id and user id is required");
    throw new HttpError(400, "Account Id missing");
  }

  const accountBalance = await accountService.getAccountBalance(userId, accountId);
  res.json({ success: true, data: accountBalance });
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
  if (!FAUCET_ENABLED) throw new HttpError(403, 'Deposit not allowed');

  // Check if the role is admin 
  if (req.user?.role != UserRole.ADMIN) throw new HttpError(403, "Only admin allowed to deposit balance");

  // Return if any value is missing 
  if (!userId || !accountId) {
    throw new HttpError(400, "User id and account is is required");
  }

  if (amount <= 0) throw new HttpError(401, "Inavlid amount");

  const account = await accountService.depositBalance(accountId, amount, req.requestId!);
  res.json({ success: true, data: account });
}

export async function withdrawBalance(req: Request, res: Response) {
  const { amount } = req.validated?.body;
  const userId = req.user?.id;
  const accountId = req.validated?.params.id;

  if (!userId || !accountId) {
    throw new HttpError(400, "User Id and Account Id is required");
  }

  const withdrawReq = await accountService.submitWithdrawalRequest(userId!, accountId, amount);
  res.status(201).json({
    success: true,
    data: withdrawReq
  });
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
