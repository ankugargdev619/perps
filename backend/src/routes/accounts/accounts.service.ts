import { prisma } from "../../db/prisma.ts";


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
    const account = await prisma.account.findFirst(({
      where: {
        id: accountId,
        userId
      }
    }));

    return account;
  }

}


export const accountService = new AccountsService();
