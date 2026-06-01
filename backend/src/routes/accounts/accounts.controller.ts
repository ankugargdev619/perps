import { Request, Response } from "express";
import { accountService } from "./accounts.service.ts";
import { UserRole } from "../../generated/prisma/enums.ts";
import { env } from "../../config/env.ts";
import { accountErrors } from "./accounts.errors.ts";

/**
 * Controller for 
 * GET : /api/accounts 
 * */
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

  try {
    const accounts = await accountService.listAccountsforUser(userId);
    res.json({ success: true, data: accounts });
  } catch (err: any) {
    throw err;
  }
}

/**
 * Controller for
 * GET : /api/accounts/:accountId/
 * */
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
    throw err;
  }
}

/**
 * Controller for
 * GET : /api/accounts/:accountId/balance
 * */
export async function getAccountBalance(req: Request, res: Response) {
  // Extract the userId 
  const userId = req.user?.id;
  // Extract the accountId 
  const accountId: string = req.validated?.params.id as string;

  // Return if any value is missing 
  if (!userId || !accountId) {
    console.error("Account id and user id is required");
    throw accountErrors.missingParams();
  }

  try {
    const accountBalance = await accountService.getAccountBalance(userId, accountId);
    res.json({ success: true, data: accountBalance });
  } catch (err: any) {
    throw err;
  }
}


/**
 * Controller for
 * POST : /api/accounts/:accountId/deposit
 * */
export async function depositBalance(req: Request, res: Response) {

  // Extract the userId 
  const userId = req.user?.id;
  // Extract the accountId 
  const accountId: string = req.validated?.params.id as string;
  // Get the amount to be deposited
  const { amount } = req.body;

  // Check if faucet is ENABLED 
  const FAUCET_ENABLED = env.FAUCET_ENABLED;
  if (!FAUCET_ENABLED) throw accountErrors.depositDisabled();

  // Check if the role is admin 
  if (req.user?.role != UserRole.ADMIN) throw accountErrors.forbiddenNotAdmin();

  // Return if any value is missing 
  if (!userId || !accountId) {
    throw accountErrors.missingParams();
  }

  if (amount <= 0) throw accountErrors.invalidAmount();

  try {
    const account = await accountService.depositBalance(accountId, amount, req.requestId!);
    res.json({ success: true, data: account });
  } catch (err: any) {
    throw err;
  }
}

/**
 * Controller for
 * POST : /api/accounts/:accountId/withdraw
 * */
export async function withdrawBalance(req: Request, res: Response) {
  const { amount } = req.validated?.body;
  const userId = req.user?.id;
  const accountId = req.validated?.params.id;

  if (!userId || !accountId) {
    throw accountErrors.missingParams();
  }

  try {
    const withdrawReq = await accountService.submitWithdrawalRequest(userId!, accountId, amount);
    res.status(201).json({
      success: true,
      data: withdrawReq
    });
  } catch (err: any) {
    throw err;
  }
}

/**
 * Controller for
 * GET : /api/accounts/:accountId/ledger
 * */
export async function getAccountLedger(req: Request, res: Response) {
  const accountId = req.validated?.params.id;
  const pagination = req.validated?.query;
  const userId = req.user?.id;

  if (!userId || !accountId) throw accountErrors.missingParams();
  try {
    const ledgerData = await accountService.getLedgerData(userId, accountId, pagination);
    res.json({ success: true, ...ledgerData });
  } catch (err: any) {
    throw err;
  }

}

export function getEquity(req: Request, res: Response) {
  const accountId = req.validated?.params.id;

  // TODO:
  res.json({ message: "Equity balance" });
}
