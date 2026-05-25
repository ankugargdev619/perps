import { Router } from "express";
import { depositBalance, getAccountBalance, getAccountData, getAccountLedger, getEquity, listAccounts, withdrawBalance } from "./accounts.controller.ts";
import { validate } from "../../middlewares/validate.middleware.ts";
import { accountParamSchema } from "./accounts.schema.ts";


export const accountsRouter = Router();

accountsRouter.get("/", listAccounts);
accountsRouter.get("/:id", validate({ params: accountParamSchema }), getAccountData);
accountsRouter.get("/:id/balances", validate({ params: accountParamSchema }), getAccountBalance);
accountsRouter.post("/:id/deposit", validate({ params: accountParamSchema }), depositBalance);
accountsRouter.post("/:id/withdraw", validate({ params: accountParamSchema }), withdrawBalance);
accountsRouter.get("/:id/ledger", validate({ params: accountParamSchema }), getAccountLedger);
accountsRouter.get("/:id/equity", validate({ params: accountParamSchema }), getEquity);
