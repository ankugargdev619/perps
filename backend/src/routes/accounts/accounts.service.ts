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

  async validateAccountOwnership(userId: string, accountId: string) {

  }

  async getAccountData(accountId: string) {

  }

}


export const accountService = new AccountsService();
