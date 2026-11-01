import { isOnline, resourceExport } from "@aicore-fivem/lib/server";
import { Locale } from "common";
import { actionLog } from "../actionLog";
import type { Result } from "../actions/result";
import { playerLabel } from "../playerName";
import { tell } from "./tell";

const core = resourceExport("ai-core");

/** QB `givemoney` / `setmoney` (ESX `giveaccountmoney` / `setaccountmoney`). */
export function money(
  source: number,
  target: number,
  account: string,
  amount: number,
  set: boolean,
): Result {
  if (!isOnline(target)) return "ERR_TARGET";
  if (!core.GetAccountTypes()[account]) return "ERR_ACCOUNT";
  if (!Number.isInteger(amount) || amount < (set ? 0 : 1) || amount > 1e9)
    return "ERR_AMOUNT";
  const ok = set
    ? core.SetMoney(target, account, amount, "admin")
    : core.AddMoney(target, account, amount, "admin");
  if (!ok) return "ERR_AMOUNT";
  tell(
    source,
    Locale(
      set ? "NOTIFY_MONEY_SET" : "NOTIFY_MONEY_GIVEN",
      playerLabel(target),
      account,
      amount,
    ),
  );
  actionLog(set ? "set money" : "gave money", source, target, {
    account,
    amount,
  });
  return null;
}
