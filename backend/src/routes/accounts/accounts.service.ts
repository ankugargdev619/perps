import { prisma } from "../../db/prisma.ts";
import { LedgerType, Prisma, WithdrawalStatus } from "../../generated/prisma/client.ts";
import { HttpError } from "../../utils/http-error.ts";
import { getOwnedAccount } from "./accounts.helper.ts";

const DEFAULT_LIMIT = 50;
type LedgerPagination = {
  limit?: number;
  before?: number;
  after?: number;
}

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

  async getLedgerData(userId: string, accountId: string, pagination: LedgerPagination) {

    const limit = pagination?.limit || DEFAULT_LIMIT;

    try {
      // Check ownership of the account
      await getOwnedAccount(userId, accountId);

      const isBefore = pagination?.before !== undefined;
      const cursorMs = pagination?.after ?? pagination?.before;
      const cursorDate = cursorMs !== undefined ? new Date(cursorMs) : undefined;

      if (cursorDate && Number.isNaN(cursorDate.getTime())) {
        throw new HttpError(400, "Invalid cursor");
      }

      const where = {
        accountId,
        ...(cursorDate && !isBefore && { createdAt: { lt: cursorDate } }),
        ...(cursorDate && isBefore && { createdAt: { gt: cursorDate } }),
      };

      // List all the rows
      const rows = await prisma.ledgerEntry.findMany({
        where,
        orderBy: {
          createdAt: isBefore ? "asc" : "desc"
        },
        take: limit + 1
      });

      // Indicates if more entries are present in the direction we are looking
      const hasMoreInDirection = rows.length > limit;
      // Slice the eextra entry that we are checking
      const sliced = hasMoreInDirection ? rows.slice(0, limit) : rows;
      // Reverse the entries if we are propagating in reverse
      const data = isBefore ? sliced.reverse() : sliced;

      // Return no data if there are no entries present
      if (data.length === 0) {
        return {
          data: [],
          page: {
            limit: Math.min(limit, data.length),
            hasNext: false,
            hasPrevious: false,
            nextCursor: null,
            prevCursor: null
          },
        };
      }

      const first = data[0];
      const last = data[data.length - 1];

      const hasNext = isBefore ? true : hasMoreInDirection;
      const hasPrevious = isBefore ? hasMoreInDirection : pagination.after !== undefined;

      return {
        data,
        page: {
          limit: data.length,
          hasNext,
          hasPrevious,
          nextCursor: hasNext ? last.createdAt.getTime() : null,
          prevCursor: hasPrevious ? first.createdAt.getTime() : null,
        }
      }


    } catch (err: any) {
      console.error(err);
      throw err;
    }
  }
}

export const accountService = new AccountsService();
