import { addCommand } from "@aicore-fivem/lib/server";
import { Locale } from "common";
import { actions } from "../actions";
import { answer } from "../commandReply";

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
