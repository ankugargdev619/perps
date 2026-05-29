import { prisma } from "../../db/prisma.ts";
import { Prisma } from "../../generated/prisma/client.ts";
import { HttpError } from "../../utils/http-error.ts";

/**
 * Get the account details if the account is owneed by the user and reeturns an error if the account is not owned by the user 
 * */
export async function getOwnedAccount(userId: string, accountId: string) {

  const account = await prisma.$transaction(async (tx) => {
    // load the account 
    const account = await tx.account.findUnique({
      where: {
        id: accountId,
        userId
      },
      omit: {
        createdaAt: true,
        updatedAt: true
      }
    });

    const rows = await tx.$queryRaw<{ available: string }[]>(
      Prisma.sql`SELECT public.get_usable_balance(${accountId}) AS available`
    );

    const available = Prisma.Decimal(rows[0]?.available ?? "0");

    return { ...account, available };

  })

  if (!account) {
    console.log(`User ${userId} doesn't have account ${accountId}`);
    throw new HttpError(400, `The account doees not exist.`);
  }

  return account;
}
