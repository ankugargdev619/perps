import { prisma } from "../../db/prisma.ts";
import { Prisma } from "../../generated/prisma/client.ts";


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
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId
      }
    });

    return account;
  }

  async getAccountBalance(userId: string, accountId: string) {
    // Load the account data
    const accountBalance = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId
      },
      select: {
        balance: true
      }
    })

    return accountBalance;
  }

  async depositBalance(userId: string, accountId: string, amount: Prisma.Decimal) {
    // Load account data
    const account = await prisma.account.update({
      where: {
        id: accountId,
        userId
      },
      data: {
        balance: {
          increment: amount
        }
      }
    });

    return account;
  }

}


export const accountService = new AccountsService();
