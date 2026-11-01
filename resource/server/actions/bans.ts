import { bans, isOnline, notify, online } from "@aicore-fivem/lib/server";
import { ADMIN } from "@aicore-fivem/shared";
import { Locale } from "common";
import { playerLabel } from "../playerName";
import type { Result } from "./result";

/** Bans through ai-core, and ai-core's admin panel (whole, its Bans section, a player's records). */
export const banActions = {
  /** ai-core's admin panel (the same as /aiadmin). */
  panel(source: number): Result {
    emitNet(ADMIN.showEvent, source);
    return null;
  },

  /**
   * Bans an online player through ai-core (dropped at once; ai-core logs it on `bans` with the admin); `minutes` 0 =
   * permanent.
   */
  ban(source: number, target: number, minutes: number, reason: string): Result {
    const text = reason.trim().slice(0, 255);
    if (!text) return "ERR_REASON_EMPTY";
    if (target === source) return "ERR_BAN_SELF";
    if (!isOnline(target)) return "ERR_TARGET";
    if (!Number.isInteger(minutes) || minutes < 0) return "ERR_BAN_LENGTH";
    const who = playerLabel(target);
    void bans.ban(target, text, minutes || undefined, source || undefined);
    if (source > 0) notify(source, Locale("NOTIFY_BANNED", who), "success");
    return null;
  },

  /** ai-core's panel on its Bans section. */
  bans(source: number): Result {
    if (source <= 0) return "ERR_PLAYER_ONLY";
    emitNet(ADMIN.showEvent, source, { section: "bans" });
    return null;
  },

  /** A player's ban records: the panel on their character (its Bans card), or the Bans section searched by FiveM id. */
  banRecords(source: number, target: number): Result {
    if (source <= 0) return "ERR_PLAYER_ONLY";
    const charId = online.charId(target);
    const fivem = GetPlayerIdentifierByType(String(target), "fivem");
    emitNet(
      ADMIN.showEvent,
      source,
      charId !== undefined
        ? { section: "players", charId }
        : { section: "bans", search: fivem || undefined },
    );
    return null;
  },
};
