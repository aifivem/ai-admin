/** The admin commands (ACE checked by addCommand); each runs an action from `actions.ts`. */
import { addCommand, notify, world } from "@aicore-fivem/lib/server";
import { createLogger } from "@aicore-fivem/lib/shared";
import { Locale, ResourceName } from "common";
import { EVENTS, type TeleportPoint } from "common/admin";
import { actions, type Result } from "./actions";

const log = createLogger(ResourceName);

/** A command answer: an ai-core notification for a player, a console line for the server. */
function reply(source: number, error: Result): void {
  if (!error) return;
  if (source > 0) notify(source, Locale(error), "error");
  else log.info(Locale(error));
}

/** "x y z", "x, y, z", "vector3(x, y, z)" or "x y" (onto the ground); a fourth number (heading) is ignored. */
function parsePoint(text: string): TeleportPoint | null {
  const numbers = (
    text.replace(/vec(tor)?[234]/gi, "").match(/-?\d+(\.\d+)?/g) ?? []
  ).map(Number);
  const [x, y, z] = numbers;
  if (x === undefined || y === undefined || numbers.length > 4) return null;
  return z === undefined ? { x, y } : { x, y, z };
}

const id = {
  name: "id",
  type: "playerId",
  help: Locale("COMMAND_P_ID"),
} as const;
const optionalId = {
  ...id,
  help: Locale("COMMAND_P_ID_SELF"),
  optional: true,
} as const;
/** Commands that act on the caller's own ped: not from the server console. */
const self = (
  source: number,
  run: () => Result | Promise<Result>,
): Result | Promise<Result> => (source > 0 ? run() : "ERR_PLAYER_ONLY");
const answer = async (source: number, result: Result | Promise<Result>) =>
  reply(source, await result);

addCommand(
  "noclip",
  { help: Locale("COMMAND_NOCLIP"), restricted: true },
  (source) =>
    answer(
      source,
      self(source, () => actions.noclip(source)),
    ),
);
addCommand("tpm", { help: Locale("COMMAND_TPM"), restricted: true }, (source) =>
  answer(
    source,
    self(source, () => actions.tpm(source)),
  ),
);
addCommand(
  "tp",
  {
    help: Locale("COMMAND_TP"),
    restricted: true,
    params: [
      { name: "coords", type: "longString", help: Locale("COMMAND_P_COORDS") },
    ],
  },
  (source, args) => {
    const point = parsePoint(args.coords);
    return answer(
      source,
      point ? self(source, () => actions.tp(source, point)) : "ERR_COORDS",
    );
  },
);
addCommand(
  "goto",
  { help: Locale("COMMAND_GOTO"), restricted: true, params: [id] },
  (source, args) =>
    answer(
      source,
      self(source, () => actions.goto(source, args.id)),
    ),
);
addCommand(
  "bring",
  { help: Locale("COMMAND_BRING"), restricted: true, params: [id] },
  (source, args) =>
    answer(
      source,
      self(source, () => actions.bring(source, args.id)),
    ),
);
addCommand(
  "heal",
  { help: Locale("COMMAND_HEAL"), restricted: true, params: [optionalId] },
  (source, args) => {
    const target = args.id ?? source;
    return answer(
      source,
      target > 0 ? actions.heal(source, target) : "ERR_PLAYER_ONLY",
    );
  },
);
addCommand(
  "revive",
  { help: Locale("COMMAND_REVIVE"), restricted: true, params: [optionalId] },
  (source, args) => {
    const target = args.id ?? source;
    return answer(
      source,
      target > 0 ? actions.revive(source, target) : "ERR_PLAYER_ONLY",
    );
  },
);
addCommand(
  "car",
  {
    help: Locale("COMMAND_CAR"),
    restricted: true,
    params: [
      { name: "model", type: "string", help: Locale("COMMAND_P_MODEL") },
    ],
  },
  (source, args) =>
    answer(
      source,
      self(source, () => actions.car(source, args.model)),
    ),
);
addCommand("dv", { help: Locale("COMMAND_DV"), restricted: true }, (source) =>
  answer(
    source,
    self(source, () => actions.dv(source)),
  ),
);
addCommand(
  "coords",
  { help: Locale("COMMAND_COORDS"), restricted: true },
  (source) =>
    answer(
      source,
      self(source, () => actions.coords(source)),
    ),
);
// `aiadmin` is ai-core's; this is a shorter name for the same panel.
addCommand(
  "admin",
  { help: Locale("COMMAND_ADMIN"), restricted: true },
  (source) =>
    answer(
      source,
      self(source, () => actions.panel(source)),
    ),
);
addCommand(
  "adminmenu",
  { help: Locale("COMMAND_ADMINMENU"), restricted: true },
  (source) =>
    answer(
      source,
      self(source, () => {
        emitNet(EVENTS.openMenu, source);
        return null;
      }),
    ),
);
addCommand(
  "announce",
  {
    help: Locale("COMMAND_ANNOUNCE"),
    restricted: true,
    params: [
      {
        name: "message",
        type: "longString",
        help: Locale("COMMAND_P_MESSAGE"),
      },
    ],
  },
  (source, args) =>
    answer(source, actions.announce(source, args.message.slice(0, 300))),
);

// Time and weather through ai-core's world layer: they keep working with whatever weather script runs.
const done = (source: number, ok: boolean, text: string) => {
  if (!ok) return reply(source, "ERR_NO_WEATHER");
  if (source > 0) notify(source, text, "success");
  else log.info(text);
};
addCommand(
  "weather",
  {
    help: Locale("COMMAND_WEATHER"),
    params: [
      { name: "type", type: "string", help: Locale("COMMAND_P_WEATHER") },
    ],
    restricted: true,
  },
  (source, args) =>
    done(
      source,
      world.setWeather(args.type),
      Locale("NOTIFY_WEATHER", args.type.toUpperCase()),
    ),
);
addCommand(
  "time",
  {
    help: Locale("COMMAND_TIME"),
    params: [
      { name: "hour", type: "number", help: Locale("COMMAND_P_HOUR") },
      {
        name: "minute",
        type: "number",
        help: Locale("COMMAND_P_MINUTE"),
        optional: true,
      },
    ],
    restricted: true,
  },
  (source, args) =>
    done(
      source,
      world.setTime(args.hour, args.minute ?? 0),
      Locale("NOTIFY_TIME", args.hour, args.minute ?? 0),
    ),
);
addCommand(
  "blackout",
  {
    help: Locale("COMMAND_BLACKOUT"),
    params: [{ name: "on", type: "number", help: Locale("COMMAND_P_ON") }],
    restricted: true,
  },
  (source, args) =>
    done(
      source,
      world.setBlackout(args.on === 1),
      Locale(args.on === 1 ? "NOTIFY_BLACKOUT_ON" : "NOTIFY_BLACKOUT_OFF"),
    ),
);
addCommand(
  "freezetime",
  {
    help: Locale("COMMAND_FREEZETIME"),
    params: [{ name: "on", type: "number", help: Locale("COMMAND_P_ON") }],
    restricted: true,
  },
  (source, args) =>
    done(
      source,
      world.freezeTime(args.on === 1),
      Locale(args.on === 1 ? "NOTIFY_FREEZE_ON" : "NOTIFY_FREEZE_OFF"),
    ),
);

const itemParams = [
  { name: "id", type: "playerId", help: Locale("COMMAND_P_ID") },
  { name: "item", type: "string", help: Locale("COMMAND_P_ITEM") },
  {
    name: "count",
    type: "number",
    help: Locale("COMMAND_P_COUNT"),
    optional: true,
  },
] as const;
addCommand(
  "giveitem",
  { help: Locale("COMMAND_GIVEITEM"), restricted: true, params: itemParams },
  (source, args) =>
    answer(
      source,
      actions.giveItem(source, args.id, args.item, args.count ?? 1),
    ),
);
addCommand(
  "removeitem",
  { help: Locale("COMMAND_REMOVEITEM"), restricted: true, params: itemParams },
  (source, args) =>
    answer(
      source,
      actions.removeItem(source, args.id, args.item, args.count ?? 0),
    ),
);
addCommand(
  "clearinv",
  {
    help: Locale("COMMAND_CLEARINV"),
    restricted: true,
    params: [{ name: "id", type: "playerId", help: Locale("COMMAND_P_ID") }],
  },
  (source, args) => answer(source, actions.clearInventory(source, args.id)),
);
addCommand(
  "openinv",
  {
    help: Locale("COMMAND_OPENINV"),
    restricted: true,
    params: [{ name: "id", type: "playerId", help: Locale("COMMAND_P_ID") }],
  },
  (source, args) => answer(source, actions.openInventory(source, args.id)),
);
