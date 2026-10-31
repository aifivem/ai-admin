/** The admin commands (ACE checked by addCommand); each runs an action from `actions.ts`. */
import { addCommand, notify } from "@aicore-fivem/lib/server";
import { createLogger } from "@aicore-fivem/lib/shared";
import { Locale, ResourceName } from "common";
import { EVENTS, type TeleportPoint } from "common/admin";
import { actions, type Result } from "./actions";
import { manage } from "./manage";
import { worldActions } from "./world";

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
  "items",
  { help: Locale("COMMAND_ITEMS"), restricted: true },
  (source) =>
    answer(
      source,
      self(source, () => {
        emitNet(EVENTS.openItems, source);
        return null;
      }),
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
  (source, args) => answer(source, actions.announce(source, args.message)),
);

// Time and weather through ai-core's world layer: they keep working with whatever weather script runs.
addCommand(
  "weather",
  {
    help: Locale("COMMAND_WEATHER"),
    params: [
      { name: "type", type: "string", help: Locale("COMMAND_P_WEATHER") },
    ],
    restricted: true,
  },
  (source, args) => reply(source, worldActions.weather(source, args.type)),
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
    reply(source, worldActions.time(source, args.hour, args.minute ?? 0)),
);
addCommand(
  "blackout",
  {
    help: Locale("COMMAND_BLACKOUT"),
    params: [{ name: "on", type: "number", help: Locale("COMMAND_P_ON") }],
    restricted: true,
  },
  (source, args) => reply(source, worldActions.blackout(source, args.on === 1)),
);
addCommand(
  "freezetime",
  {
    help: Locale("COMMAND_FREEZETIME"),
    params: [{ name: "on", type: "number", help: Locale("COMMAND_P_ON") }],
    restricted: true,
  },
  (source, args) => reply(source, worldActions.freeze(source, args.on === 1)),
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
addCommand(
  "givekey",
  { help: Locale("COMMAND_GIVEKEY"), restricted: true, params: [optionalId] },
  (source, args) => answer(source, actions.giveKeys(source, args.id ?? source)),
);

// QB / ESX default commands (same names and arguments), on ai-core's jobs, gangs and money.
const gradeParam = {
  name: "grade",
  type: "number",
  help: Locale("COMMAND_P_GRADE"),
} as const;
addCommand(
  "setjob",
  {
    help: Locale("COMMAND_SETJOB"),
    restricted: true,
    params: [
      id,
      { name: "job", type: "string", help: Locale("COMMAND_P_JOB") },
      gradeParam,
    ],
  },
  (source, args) =>
    reply(source, manage.setJob(source, args.id, args.job, args.grade)),
);
addCommand(
  "setgang",
  {
    help: Locale("COMMAND_SETGANG"),
    restricted: true,
    params: [
      id,
      { name: "gang", type: "string", help: Locale("COMMAND_P_GANG") },
      gradeParam,
    ],
  },
  (source, args) =>
    reply(source, manage.setGang(source, args.id, args.gang, args.grade)),
);
addCommand("job", { help: Locale("COMMAND_JOB") }, (source) =>
  reply(source, source > 0 ? manage.showJob(source) : "ERR_PLAYER_ONLY"),
);
addCommand("gang", { help: Locale("COMMAND_GANG") }, (source) =>
  reply(source, source > 0 ? manage.showGang(source) : "ERR_PLAYER_ONLY"),
);
const moneyParams = [
  id,
  { name: "account", type: "string", help: Locale("COMMAND_P_ACCOUNT") },
  { name: "amount", type: "number", help: Locale("COMMAND_P_AMOUNT") },
] as const;
addCommand(
  ["givemoney", "giveaccountmoney"],
  { help: Locale("COMMAND_GIVEMONEY"), restricted: true, params: moneyParams },
  (source, args) =>
    reply(
      source,
      manage.money(source, args.id, args.account, args.amount, false),
    ),
);
addCommand(
  ["setmoney", "setaccountmoney"],
  { help: Locale("COMMAND_SETMONEY"), restricted: true, params: moneyParams },
  (source, args) =>
    reply(
      source,
      manage.money(source, args.id, args.account, args.amount, true),
    ),
);
addCommand(
  "dvall",
  { help: Locale("COMMAND_DVALL"), restricted: true },
  (source) => reply(source, manage.deleteAll(source, "vehicles")),
);
addCommand("dvp", { help: Locale("COMMAND_DVP"), restricted: true }, (source) =>
  reply(source, manage.deleteAll(source, "peds")),
);
addCommand("dvo", { help: Locale("COMMAND_DVO"), restricted: true }, (source) =>
  reply(source, manage.deleteAll(source, "objects")),
);
const permissionParams = [
  id,
  { name: "permission", type: "string", help: Locale("COMMAND_P_PERMISSION") },
] as const;
addCommand(
  "addpermission",
  {
    help: Locale("COMMAND_ADDPERMISSION"),
    restricted: true,
    params: permissionParams,
  },
  (source, args) =>
    reply(source, manage.permission(source, args.id, args.permission, true)),
);
addCommand(
  "removepermission",
  {
    help: Locale("COMMAND_REMOVEPERMISSION"),
    restricted: true,
    params: permissionParams,
  },
  (source, args) =>
    reply(source, manage.permission(source, args.id, args.permission, false)),
);
addCommand(
  "closeserver",
  {
    help: Locale("COMMAND_CLOSESERVER"),
    restricted: true,
    params: [
      {
        name: "reason",
        type: "longString",
        help: Locale("COMMAND_P_REASON"),
        optional: true,
      },
    ],
  },
  (source, args) => reply(source, manage.close(source, args.reason)),
);
addCommand(
  "openserver",
  { help: Locale("COMMAND_OPENSERVER"), restricted: true },
  (source) => reply(source, manage.open(source)),
);
