import { Router } from "express";
import { depositBalance, getAccountBalance, getAccountData, getAccountLedger, getEquity, listAccounts, withdrawBalance } from "./accounts.controller.ts";
import { validate } from "../../middlewares/validate.middleware.ts";
import { accountDepositSchema, accountParamSchema, accountWithdrawSchema, ledgerQuerySchema } from "./accounts.schema.ts";


export const accountsRouter = Router();

accountsRouter.get("/", listAccounts);
accountsRouter.get("/:id", validate({ params: accountParamSchema }), getAccountData);
accountsRouter.get("/:id/balance", validate({ params: accountParamSchema }), getAccountBalance);
accountsRouter.post("/:id/deposit", validate({ params: accountParamSchema, body: accountDepositSchema }), depositBalance);
accountsRouter.post("/:id/withdraw", validate({ params: accountParamSchema, body: accountWithdrawSchema }), withdrawBalance);
accountsRouter.get("/:id/ledger", validate({ params: accountParamSchema, query: ledgerQuerySchema }), getAccountLedger);
accountsRouter.get("/:id/equity", validate({ params: accountParamSchema }), getEquity);
