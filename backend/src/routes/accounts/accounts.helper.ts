import { prisma } from "../../db/prisma.ts";
import { HttpError } from "../../utils/http-error.ts";

/**
 * Get the account details if the account is owneed by the user and reeturns an error if the account is not owned by the user 
 * */
export async function getOwnedAccount(userId: string, accountId: string) {

  // load the account 
  const account = await prisma.account.findUnique({
    where: {
      id: accountId,
      userId
    },
    omit: {
      createdaAt: true,
      updatedAt: true
    }
  });

  if (!account) {
    console.log(`User ${userId} doesn't have account ${accountId}`);
    throw new HttpError(400, `User ${userId} doesn't have account ${accountId}`);
  }

  return account;
}
