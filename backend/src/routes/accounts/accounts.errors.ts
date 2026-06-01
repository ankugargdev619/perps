import { Decimal } from "@prisma/client/runtime/client";
import { ApiError } from "../../utils/api-error.ts";

export const accountErrorCodes = {
  USER_ID_REQUIRED: "USER_ID_REQUIRED",
  MISSING_PARAMS: "MISSING_PARAMS",
  ACCOUNT_NOT_FOUND: "ACCOUNT_NOT_FOUND",
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  INVALID_AMOUNT: "INVALID_AMOUNT",
  INVALID_CURSOR: "INVALID_CURSOR",
  DEPOSIT_DISABLED: "DEPOSIT_DISABLED",
  FORBIDDEN_NOT_ADMIN: "FORBIDDEN_NOT_ADMIN",
} as const;

export type AccountErrorCodes =
  (typeof accountErrorCodes)[keyof typeof accountErrorCodes]

export const accountErrors = {
  userIdRequired: () =>
    new ApiError(400, accountErrorCodes.USER_ID_REQUIRED, "User id is required"),

  missingParams: (details?: string) =>
    new ApiError(400, accountErrorCodes.MISSING_PARAMS, details ?? `User id and account id are required`),

  notFound: (accountId: string) =>
    new ApiError(404, accountErrorCodes.ACCOUNT_NOT_FOUND, `Account not found ${accountId}`),

  insufficientBalance: (available: Decimal | string) =>
    new ApiError(400, accountErrorCodes.INSUFFICIENT_BALANCE, `Insufficient balancec in the account, current balance: ${available}`),

  invalidAmount: () =>
    new ApiError(400, accountErrorCodes.INVALID_AMOUNT, "Amount should be greater than 0"),

  invalidCursor: () =>
    new ApiError(400, accountErrorCodes.INVALID_CURSOR, 'Inavlid cursor'),

  depositDisabled: () =>
    new ApiError(403, accountErrorCodes.DEPOSIT_DISABLED, "Deposit not allowed, faucet is disabled"),

  forbiddenNotAdmin: () =>
    new ApiError(403, accountErrorCodes.FORBIDDEN_NOT_ADMIN, "Only admin allowed to deposit balance"),
}
