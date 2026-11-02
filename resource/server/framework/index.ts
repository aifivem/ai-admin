import { addCommand } from "@aifivem/lib/server";
import { Locale } from "common";
import { id } from "../commandParams";
import { reply } from "../commandReply";
import { deleteAll } from "./cleanup";
import { jobActions } from "./jobs";
import { money, moneyByCitizen } from "./money";
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
const moneyCidParams = [
  { name: "citizenid", type: "string", help: Locale("COMMAND_P_CITIZENID") },
  moneyParams[1],
  moneyParams[2],
] as const;
const moneyCommands = [
  { names: ["givemoney", "giveaccountmoney"], mode: "give" },
  { names: ["setmoney", "setaccountmoney"], mode: "set" },
  { names: ["removemoney"], mode: "remove" },
] as const;
const MONEY_HELP = {
  give: ["COMMAND_GIVEMONEY", "COMMAND_GIVEMONEYCID"],
  set: ["COMMAND_SETMONEY", "COMMAND_SETMONEYCID"],
  remove: ["COMMAND_REMOVEMONEY", "COMMAND_REMOVEMONEYCID"],
} as const;
for (const { names, mode } of moneyCommands) {
  const [help, cidHelp] = MONEY_HELP[mode];
  addCommand(
    [...names],
    { help: Locale(help), restricted: true, params: moneyParams },
    (source, args) =>
      reply(source, money(source, args.id, args.account, args.amount, mode)),
  );
  // Server ids and ai-core citizenids are both numbers: the citizenid form is its own command.
  addCommand(
    `${names[0]}cid`,
    { help: Locale(cidHelp), restricted: true, params: moneyCidParams },
    async (source, args) =>
      reply(
        source,
        await moneyByCitizen(
          source,
          args.citizenid,
          args.account,
          args.amount,
          mode,
        ),
      ),
  );
}
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
