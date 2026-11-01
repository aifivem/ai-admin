import { addCommand } from "@aicore-fivem/lib/server";
import { Locale } from "common";
import { id } from "../commandParams";
import { reply } from "../commandReply";
import { deleteAll } from "./cleanup";
import { jobActions } from "./jobs";
import { money } from "./money";
import { permission } from "./permissions";
import { serverLock } from "./serverLock";

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
    reply(source, jobActions.setJob(source, args.id, args.job, args.grade)),
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
    reply(source, jobActions.setGang(source, args.id, args.gang, args.grade)),
);
addCommand("job", { help: Locale("COMMAND_JOB") }, (source) =>
  reply(source, source > 0 ? jobActions.showJob(source) : "ERR_PLAYER_ONLY"),
);
addCommand("gang", { help: Locale("COMMAND_GANG") }, (source) =>
  reply(source, source > 0 ? jobActions.showGang(source) : "ERR_PLAYER_ONLY"),
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
    reply(source, money(source, args.id, args.account, args.amount, false)),
);
addCommand(
  ["setmoney", "setaccountmoney"],
  { help: Locale("COMMAND_SETMONEY"), restricted: true, params: moneyParams },
  (source, args) =>
    reply(source, money(source, args.id, args.account, args.amount, true)),
);
addCommand(
  "dvall",
  { help: Locale("COMMAND_DVALL"), restricted: true },
  (source) => reply(source, deleteAll(source, "vehicles")),
);
addCommand("dvp", { help: Locale("COMMAND_DVP"), restricted: true }, (source) =>
  reply(source, deleteAll(source, "peds")),
);
addCommand("dvo", { help: Locale("COMMAND_DVO"), restricted: true }, (source) =>
  reply(source, deleteAll(source, "objects")),
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
    reply(source, permission(source, args.id, args.permission, true)),
);
addCommand(
  "removepermission",
  {
    help: Locale("COMMAND_REMOVEPERMISSION"),
    restricted: true,
    params: permissionParams,
  },
  (source, args) =>
    reply(source, permission(source, args.id, args.permission, false)),
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
  (source, args) => reply(source, serverLock.close(source, args.reason)),
);
addCommand(
  "openserver",
  { help: Locale("COMMAND_OPENSERVER"), restricted: true },
  (source) => reply(source, serverLock.open(source)),
);
