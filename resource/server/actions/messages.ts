import { isOnline, notify } from "@aicore-fivem/lib/server";
import { Locale } from "common";
import { EVENTS } from "common/admin";
import { actionLog } from "../actionLog";
import { content } from "../content";
import { playerLabel } from "../playerName";
import type { Result } from "./result";

/** Announcements and warnings. */
export const messageActions = {
  /** A notification for everyone, in the style of the panel's Messages tab. */
  announce(source: number, text: string): Result {
    const message = text.trim().slice(0, 300);
    if (!message) return "ERR_MESSAGE_EMPTY";
    const { announceKind, announceSeconds } = content.controls;
    notify(
      -1,
      Locale("NOTIFY_ANNOUNCE", message),
      announceKind,
      announceSeconds * 1000,
    );
    actionLog("announced", source, undefined, { text: message });
    return null;
  },

  /** An admin's warning: the player sees it until they confirm it; the log keeps who warned whom and why. */
  warn(source: number, target: number, reason: string): Result {
    const text = reason.trim().slice(0, 300);
    if (!text) return "ERR_REASON_EMPTY";
    if (target === source || !isOnline(target)) return "ERR_TARGET";
    emitNet(EVENTS.warned, target, text);
    if (source > 0)
      notify(source, Locale("NOTIFY_WARNED", playerLabel(target)), "success");
    actionLog("warned a player", source, target, { reason: text });
    return null;
  },
};
