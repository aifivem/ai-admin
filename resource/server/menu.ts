import {
  aiLog,
  isAdmin,
  isOnline,
  onClientCallback,
} from "@aicore-fivem/lib/server";
import { ADMIN } from "@aicore-fivem/shared";
import {
  EVENTS,
  isMenuAction,
  type MenuAction,
  type PlayerEntry,
} from "common/admin";
import { actions, type Result } from "./actions";

/** Whether the quick menu may open (it opens nothing for others; every action is checked again). */
onClientCallback(EVENTS.access, (source) =>
  Boolean(IsPlayerAceAllowed(String(source), ADMIN.ace)),
);

/** Noclip on needs an admin; off is always allowed (a rank taken away mid-flight). */
onClientCallback(
  EVENTS.noclip,
  { args: ([on]) => (typeof on === "boolean" ? [on] : null) },
  (source, on) => {
    if (on && !IsPlayerAceAllowed(String(source), ADMIN.ace))
      return { ok: false, error: "ERR_NOT_ALLOWED" };
    aiLog("actions", on ? "noclip on" : "noclip off", { source });
    return { ok: true };
  },
);

onClientCallback(
  EVENTS.players,
  (): PlayerEntry[] =>
    getPlayers()
      .map((p) => ({ id: Number(p), name: GetPlayerName(p) }))
      .sort((a, b) => a.id - b.id),
  { guards: [isAdmin()], rate: { count: 2, windowMs: 1000 } },
);

const parseAction = ([action, target, value]: unknown[]):
  [MenuAction, number | null, string | null] | null => {
  if (!isMenuAction(action)) return null;
  if (
    target != null &&
    !(typeof target === "number" && Number.isInteger(target) && target > 0)
  )
    return null;
  if (value != null && !(typeof value === "string" && value.length <= 32))
    return null;
  return [action, target ?? null, value ?? null];
};

function runAction(
  source: number,
  action: MenuAction,
  target: number | null,
  value: string | null,
): Result | Promise<Result> {
  const who = target ?? source;
  if (!isOnline(who)) return "ERR_TARGET";
  switch (action) {
    case "tpm":
      return actions.tpm(source);
    case "heal":
      return actions.heal(source, who);
    case "revive":
      return actions.revive(source, who);
    case "car":
      return value ? actions.car(source, value) : "ERR_MODEL";
    case "dv":
      return actions.dv(source);
    case "goto":
      return actions.goto(source, who);
    case "bring":
      return actions.bring(source, who);
    case "panel":
      return actions.panel(source);
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

onClientCallback(
  EVENTS.action,
  { args: parseAction, guards: [isAdmin()], lock: true },
  async (source, action, target, value) => {
    const error = await runAction(source, action, target, value);
    return error ? { ok: false, error } : { ok: true };
  },
);
