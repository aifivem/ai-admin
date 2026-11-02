import {
  illegal,
  isOnline,
  needs,
  notify,
  online,
  resourceExport,
} from "@aifivem/lib/server";
import { ADMIN, type CharacterTarget } from "@aifivem/shared";
import { Locale } from "common";
import { actionLog } from "../actionLog";
import { coreError, findCitizen } from "../citizen";
import { tell } from "../framework/tell";
import { playerLabel } from "../playerName";
import type { Result } from "./result";

const core = resourceExport("ai-core");

const NEEDS = {
  hunger: ["hunger"],
  thirst: ["thirst"],
  all: ["hunger", "thirst"],
} as const;
type NeedChoice = keyof typeof NEEDS;
const isNeedChoice = (v: string): v is NeedChoice => v in NEEDS;

/** A character named by a server id or citizenid, with its label; null when none matches. */
async function characterOf(target: number | string): Promise<{
  who: CharacterTarget;
  label: string;
  source: number | null;
} | null> {
  if (typeof target === "number") {
    const c = online.character(target);
    return c
      ? {
          who: target,
          label: `${online.name(target)} (${c.citizenid})`,
          source: target,
        }
      : null;
  }
  const found = await findCitizen(target);
  return found
    ? {
        who: { charId: found.charId },
        label: found.label,
        source: found.source,
      }
    : null;
}

/** Character tools: needs, paycheck, legal / illegal status, the panel's character card. */
export const characterActions = {
  /** Hunger, thirst or both (`all`) to `value` (0-100) through ai-core's needs; the player is told. */
  setStatus(
    source: number,
    target: number,
    need: string,
    value: number,
  ): Result {
    const choice = need.toLowerCase();
    if (!isNeedChoice(choice)) return "ERR_NEED";
    if (!Number.isFinite(value) || value < 0 || value > 100)
      return "ERR_NEED_VALUE";
    const amount = Math.round(value);
    for (const n of NEEDS[choice])
      if (!needs.set(target, n, amount)) return "ERR_NO_CHARACTER";
    const label = Locale(
      `NEED_${choice.toUpperCase() as Uppercase<NeedChoice>}`,
    );
    if (target !== source)
      notify(target, Locale("NOTIFY_STATUS_BY", label, amount), "info");
    tell(
      source,
      Locale("NOTIFY_STATUS_SET", playerLabel(target), label, amount),
    );
    actionLog("set needs", source, target, { need: choice, value: amount });
    return null;
  },

  /** The player's paycheck now, under the same rules as the timer. */
  paycheck(source: number, target: number): Result {
    if (!isOnline(target)) return "ERR_TARGET";
    if (!core.ForcePaycheck(target)) return "ERR_NO_CHARACTER";
    tell(source, Locale("NOTIFY_PAYCHECK", playerLabel(target)));
    actionLog("forced a paycheck", source, target);
    return null;
  },

  /**
   * Shows (no `state`) or sets a character's legal / illegal status; `target` is an online player's server id or a
   * citizenid (a number that is an online server id means that player).
   */
  async illegal(
    source: number,
    target: number | string,
    state: boolean | undefined,
  ): Promise<Result> {
    const character = await characterOf(target);
    if (!character)
      return typeof target === "number" ? "ERR_NO_CHARACTER" : "ERR_CITIZEN";
    if (state === undefined) {
      const now = await illegal.of(character.who);
      if (now === null) return "ERR_CITIZEN";
      tell(
        source,
        Locale(now ? "NOTIFY_IS_ILLEGAL" : "NOTIFY_IS_LEGAL", character.label),
      );
      return null;
    }
    const error = coreError(await illegal.set(character.who, state));
    if (error) return error;
    tell(
      source,
      Locale(state ? "NOTIFY_IS_ILLEGAL" : "NOTIFY_IS_LEGAL", character.label),
    );
    actionLog(
      state ? "marked illegal" : "marked legal",
      source,
      character.source ?? undefined,
      {
        character: character.label,
      },
    );
    return null;
  },

  /** ai-core's admin panel on a character's card (info, money, jobs, bans...), loaded or not. */
  async editPlayer(source: number, citizenid: string): Promise<Result> {
    if (source <= 0) return "ERR_PLAYER_ONLY";
    const found = await findCitizen(citizenid);
    if (!found) return "ERR_CITIZEN";
    emitNet(ADMIN.showEvent, source, {
      section: "players",
      charId: found.charId,
    });
    actionLog("opened a character", source, found.source ?? undefined, {
      citizenid: found.citizenid,
      charId: found.charId,
    });
    return null;
  },
};
