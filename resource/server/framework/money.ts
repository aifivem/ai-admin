import { characters, isOnline, resourceExport } from "@aifivem/lib/server";
import { Locale } from "common";
import { actionLog } from "../actionLog";
import type { Result } from "../actions/result";
import { coreError, findCitizen } from "../citizen";
import { playerLabel } from "../playerName";
import { tell } from "./tell";

const core = resourceExport("ai-core");

export type MoneyMode = "give" | "set" | "remove";

const NOTIFY = {
  give: "NOTIFY_MONEY_GIVEN",
  set: "NOTIFY_MONEY_SET",
  remove: "NOTIFY_MONEY_REMOVED",
} as const;
const LOG = { give: "gave money", set: "set money", remove: "removed money" };

/** The account and amount checks every money command makes first. */
function checkMoney(account: string, amount: number, mode: MoneyMode): Result {
  if (!core.GetAccountTypes()[account]) return "ERR_ACCOUNT";
  if (
    !Number.isInteger(amount) ||
    amount < (mode === "set" ? 0 : 1) ||
    amount > 1e9
  )
    return "ERR_AMOUNT";
  return null;
}

/** QB `givemoney` / `setmoney` / `removemoney` (ESX `giveaccountmoney` / `setaccountmoney`). */
export function money(
  source: number,
  target: number,
  account: string,
  amount: number,
  mode: MoneyMode,
): Result {
  if (!isOnline(target)) return "ERR_TARGET";
  const error = checkMoney(account, amount, mode);
  if (error) return error;
  const ok =
    mode === "set"
      ? core.SetMoney(target, account, amount, "admin")
      : mode === "give"
        ? core.AddMoney(target, account, amount, "admin")
        : core.RemoveMoney(target, account, amount, "admin");
  if (!ok) return mode === "remove" ? "ERR_FUNDS" : "ERR_AMOUNT";
  tell(source, Locale(NOTIFY[mode], playerLabel(target), account, amount));
  actionLog(LOG[mode], source, target, { account, amount });
  return null;
}

/** QB-style `givemoneycid` / `setmoneycid` / `removemoneycid`: a character by citizenid, loaded or not. */
export async function moneyByCitizen(
  source: number,
  citizenid: string,
  account: string,
  amount: number,
  mode: MoneyMode,
): Promise<Result> {
  const checked = checkMoney(account, amount, mode);
  if (checked) return checked;
  const found = await findCitizen(citizenid);
  if (!found) return "ERR_CITIZEN";
  const write =
    mode === "set"
      ? characters.setMoney
      : mode === "give"
        ? characters.addMoney
        : characters.removeMoney;
  const error = coreError(await write(found.charId, account, amount, "admin"));
  if (error) return error;
  tell(source, Locale(NOTIFY[mode], found.label, account, amount));
  actionLog(LOG[mode], source, found.source ?? undefined, {
    account,
    amount,
    citizenid: found.citizenid,
    charId: found.charId,
  });
  return null;
}
