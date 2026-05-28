import { prisma } from "../../db/prisma.ts";
import { LedgerType, Prisma, UserRole, WithdrawalStatus } from "../../generated/prisma/client.ts";
import { HttpError } from "../../utils/http-error.ts";
import { getOwnedAccount } from "./accounts.helper.ts";


export class AccountsService {
  async listAccountsforUser(userId: string) {
    const accounts = await prisma.account.findMany({
      where: {
        userId
      },
      omit: {
        createdaAt: true,
        updatedAt: true
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
        },
        omit: {
          createdaAt: true,
          updatedAt: true
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
    await getOwnedAccount(userId, accountId);

    const withdrawalReq = await prisma.$transaction(async (tx) => {

      // Check available balance for use
      const rows = await tx.$queryRaw<{ available: string }[]>(
        Prisma.sql`SELECT public.get_usable_balance(${accountId}) AS available`
      );
      const available = Prisma.Decimal(rows[0]?.available ?? "0");

      if (available.lt(amount)) throw new HttpError(401, `Insufficient balance in the account, current balance : ${available}`)
      // Create a withdrawal request with pending state
      const request = await tx.withdrawRequest.create({
        data: {
          accountId,
          amount,
          status: WithdrawalStatus.PENDING,
        },
        omit: {
          createdAt: true,
          updatedAt: true
        }
      });

      // Reserve the withdrawal amount
      await tx.account.update({
        where: {
          id: accountId
        },
        data: {
          withdrawalReserve: {
            increment: amount
          }
        }
      });
      return request;
    });

    return withdrawalReq;
  }

}

export const accountService = new AccountsService();
