import { prisma } from "../../db/prisma.ts";
import { LedgerType, Prisma, WithdrawalStatus } from "../../generated/prisma/client.ts";
import { HttpError } from "../../utils/http-error.ts";
import { decodeCursor, encodeCursor, getOwnedAccount } from "./accounts.helper.ts";

const DEFAULT_LIMIT = 50;

export class AccountsService {
  async listAccountsforUser(userId: string) {
    try {
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
    } catch (err: any) {
      throw err;
    }
  }

  async getAccountData(userId: string, accountId: string) {
    try {
      // Load the account data, no validation required since we are only loading the account with userId  
      const account = await getOwnedAccount(userId, accountId);
      return account;
    } catch (err: any) {
      throw err;
    }
  }

  /**
   * Returns account details with balance 
   * */
  async getAccountBalance(userId: string, accountId: string) {
    try {
      // Load the account data
      const account = await getOwnedAccount(userId, accountId);
      return account;
    } catch (err: any) {
      throw err;
    }
  }

  async depositBalance(accountId: string, amount: Prisma.Decimal, refId: string) {

    try {
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
        const ledgerEntry = await tx.ledgerEntry.create({
          data: {
            accountId,
            amount,
            type: LedgerType.DEPOSIT,
            balanceAfter: accountData.balance,
            refId
          }
        });

        return { ...accountData, ledgerEntryId: ledgerEntry.id };
      });

      return account;
    } catch (err: any) {
      throw err;
    }
  }

  async submitWithdrawalRequest(userId: string, accountId: string, amount: Prisma.Decimal) {

    // Check if sufficient balance is present in the account
    const account = await getOwnedAccount(userId, accountId);

    // Throw an error if the balance is not available
    if (account.available.lt(amount)) throw new HttpError(401, `Insufficient balance in the account, current balance : ${account.available}`)

    try {
      const withdrawalReq = await prisma.$transaction(async (tx) => {
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
    } catch (err: any) {
      throw err;
    }
  }

  async getLedgerData(userId: string, accountId: string, cursor?: string, limit?: number) {

    const expectedLimit = limit || DEFAULT_LIMIT;

    try {
      // Check ownership of the account
      await getOwnedAccount(userId, accountId);

      // Decode the cursor
      const ledgerCursor = cursor ? decodeCursor(cursor) : undefined;

      const where = ledgerCursor?.createdAt ? {
        accountId,
        createdAt: {
          lt: ledgerCursor?.createdAt
        }
      } :
        { accountId }

      // List all the rows
      const rows = await prisma.ledgerEntry.findMany({
        where,
        orderBy: {
          createdAt: "desc"
        },
        take: expectedLimit + 1
      });

      const hasMore = rows.length > expectedLimit;
      const data = hasMore ? rows.slice(0, expectedLimit) : rows;
      const last = data[data.length - 1];

      if (data.length < 1) throw new HttpError(400, 'No transactions found on the ledger');

      const nextCursor = {
        createdAt: last?.createdAt.toISOString(),
        id: last?.id
      };

      const encodedCursor = encodeCursor(nextCursor);

      const page = {
        limit: Math.min(expectedLimit, data.length),
        nextCursor: encodedCursor,
        hasMore: hasMore
      };

      return { data, page };
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  }
}

export const accountService = new AccountsService();
