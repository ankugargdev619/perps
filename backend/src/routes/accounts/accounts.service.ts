import { env } from "../../config/env.ts";
import { prisma } from "../../db/prisma.ts";
import { LedgerType, Prisma, UserRole, WithdrawalStatus } from "../../generated/prisma/client.ts";
import { HttpError } from "../../utils/http-error.ts";
import { getOwnedAccount } from "./accounts.helper.ts";


export class AccountsService {
  async listAccountsforUser(userId: string) {
    const accounts = await prisma.account.findMany({
      where: {
        userId
      }
    });
    return accounts;
  }

  async getAccountData(userId: string, accountId: string) {
    // Load the account data, no validation required since we are only loading the account with userId  
    const account = await getOwnedAccount(userId, accountId);
    return account;
  }

  async getAccountBalance(userId: string, accountId: string) {
    // Load the account data
    const account = await getOwnedAccount(userId, accountId);
    return { ...account, available: (account.balance.minus(account.lockedMargin)) as Prisma.Decimal };
  }

  async depositBalance(accountId: string, amount: Prisma.Decimal, refId: string) {

    // Start a transaction
    const account = await prisma.$transaction(async (tx) => {

      // Update account data
      const accountData = await tx.account.update({
        where: {
          id: accountId,
        },
        data: {
          balance: {
            increment: amount
          }
        }
      });

      // Add ledger entry
      await tx.ledgerEntry.create({
        data: {
          accountId,
          amount,
          type: LedgerType.DEPOSIT,
          balanceAfter: accountData.balance,
          refId
        }
      });

      return accountData;
    });

    return account;
  }

  async submitWithdrawalRequest(userId: string, accountId: string, amount: Prisma.Decimal) {

    // Check if sufficient balance is present in the account
    const account = getOwnedAccount(userId, accountId);
    if ((await account).balance < amount) {
      console.error(`Account ${accountId} does not have enough balance`);
      throw new HttpError(400, `Account ${accountId} does not have enough balance`);
    };

    // Create a withdrawal request with pending state
    const request = await prisma.withdrawRequest.create({
      data: {
        accountId,
        amount,
        status: WithdrawalStatus.PENDING,
      }
    });


  }

}

export const accountService = new AccountsService();
