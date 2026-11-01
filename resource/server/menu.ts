import {
  aiLog,
  isAdmin,
  isOnline,
  onClientCallback,
  world,
} from "@aicore-fivem/lib/server";
import {
  fail,
  isRecord,
  readId,
  readInt,
  readText,
} from "@aicore-fivem/lib/shared";
import { ADMIN } from "@aicore-fivem/shared";
import {
  EVENTS,
  isMenuAction,
  type MenuAction,
  type PlayerEntry,
} from "common/admin";
import type { WorldState } from "common/controls";
import { actions, type Result } from "./actions";
import { worldActions } from "./world";

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
      return fail("ERR_NOT_ALLOWED");
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

onClientCallback(
  EVENTS.worldState,
  (): WorldState => ({ weather: world.getWeather(), time: world.getTime() }),
  { guards: [isAdmin()], rate: { count: 2, windowMs: 1000 } },
);

const parseAction = ([action, target, value]: unknown[]):
  [MenuAction, number | null, string | null] | null => {
  if (!isMenuAction(action)) return null;
  const id = target == null ? null : readId(target);
  if (target != null && id === null) return null;
  if (value != null && !(typeof value === "string" && value.length <= 300))
    return null;
  return [action, id, value ?? null];
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
    case "item": {
      const [item = "", count = "1"] = (value ?? "").split(":");
      return actions.giveItem(source, who, item, Number(count));
    }
    case "inventory":
      return actions.openInventory(source, who);
    case "warn":
      return actions.warn(source, who, value ?? "");
    case "ban": {
      // "<minutes>:<reason>", 0 minutes = permanent.
      const text = value ?? "";
      const at = text.indexOf(":");
      return at < 1
        ? "ERR_BAN_LENGTH"
        : actions.ban(
            source,
            who,
            Number(text.slice(0, at)),
            text.slice(at + 1),
          );
    }
    case "bans":
      return actions.bans(source);
    case "banRecords":
      return actions.banRecords(source, who);
    case "announce":
      return actions.announce(source, value ?? "");
    case "weather":
      return worldActions.weather(source, value ?? "");
    case "time": {
      const [hour = "", minute = "0"] = (value ?? "").split(":");
      return worldActions.time(source, Number(hour), Number(minute));
    }
    case "freeze":
      return worldActions.freeze(source, value === "1");
    case "blackout":
      return worldActions.blackout(source, value === "1");
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
    return error ? fail(error) : { ok: true };
  },
);

const parseItems = ([target, list]: unknown[]):
  [number | null, Array<{ name: string; count: number }>] | null => {
  const id = target == null ? null : readId(target);
  if (target != null && id === null) return null;
  if (!Array.isArray(list) || list.length === 0 || list.length > 50)
    return null;
  const items = list.flatMap((v: unknown) => {
    const name = isRecord(v) ? readText(v.name, 64) : null;
    const count = isRecord(v) ? readInt(v.count, 1, 1_000_000) : null;
    return name !== null && count !== null ? [{ name, count }] : [];
  });
  return items.length === list.length ? [id, items] : null;
};

// The item picker's list: given one by one through the same action as a single item; stops at the first refusal.
onClientCallback(
  EVENTS.giveItems,
  { args: parseItems, guards: [isAdmin()], lock: true },
  (source, target, items) => {
    const who = target ?? source;
    if (!isOnline(who)) return fail("ERR_TARGET");
    for (const { name, count } of items) {
      const error = actions.giveItem(source, who, name, count);
      if (error) return fail(error);
    }
    return { ok: true };
  },
);
