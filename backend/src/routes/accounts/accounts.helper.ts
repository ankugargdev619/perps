import { prisma } from "../../db/prisma.ts";
import { Prisma } from "../../generated/prisma/client.ts";





/**
 * Get the account details if the account is owneed by the user and reeturns an error if the account is not owned by the user 
 * */
export async function getOwnedAccount(userId: string, accountId: string) {

  // load the account 
  const account = await prisma.account.findUnique({
    where: {
      id: accountId,
      userId
    }
  });

  if (!account) {
    console.log(`User ${userId} doesn't have account ${accountId}`);
    throw new Error(`User ${userId} doesn't have account ${accountId}`);
  }

  return account;
}

export async function ensureBalance(userId: string, accountId: string, amount: Prisma.Decimal) {

  // load the account
  const account = await prisma.account.findFirst({
    where: {
      id: accountId
    }
  });


}
