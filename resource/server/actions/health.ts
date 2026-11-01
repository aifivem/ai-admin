import { isOnline, medical, needs, notify } from "@aicore-fivem/lib/server";
import { Locale } from "common";
import { actionLog } from "../actionLog";
import { playerName } from "../playerName";
import type { Result } from "./result";

/** Heal and revive through lib `medical` (whatever death script runs). */
export const healthActions = {
  /** Full health; a downed player needs revive (the death script keeps the down state). */
  heal(source: number, target: number): Result {
    if (medical.provider() === null) return "ERR_NO_DEATH";
    if (!isOnline(target)) return "ERR_TARGET";
    if (medical.isDead(target)) return "ERR_DOWN";
    medical.heal(target);
    if (target !== source)
      notify(target, Locale("NOTIFY_HEALED_BY"), "success");
    if (source > 0)
      notify(source, Locale("NOTIFY_HEALED", playerName(target)), "success");
    actionLog("healed a player", source, target);
    return null;
  },

  /** Gets a downed player up where they lie (a player who is not down is healed), hunger and thirst full. */
  revive(source: number, target: number): Result {
    if (medical.provider() === null) return "ERR_NO_DEATH";
    if (!isOnline(target)) return "ERR_TARGET";
    if (!medical.revive(target)) medical.heal(target);
    needs.refill(target);
    if (target !== source)
      notify(target, Locale("NOTIFY_REVIVED_BY"), "success");
    if (source > 0)
      notify(source, Locale("NOTIFY_REVIVED", playerName(target)), "success");
    actionLog("revived a player", source, target);
    return null;
  },
};
