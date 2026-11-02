import { addCommand, isOnline } from "@aifivem/lib/server";
import { Locale } from "common";
import { actions } from "../actions";
import { id } from "../commandParams";
import { answer } from "../commandReply";

addCommand(
  "setstatus",
  {
    help: Locale("COMMAND_SETSTATUS"),
    restricted: true,
    params: [
      id,
      { name: "type", type: "string", help: Locale("COMMAND_P_NEED") },
      { name: "value", type: "number", help: Locale("COMMAND_P_NEED_VALUE") },
    ],
  },
  (source, args) =>
    answer(source, actions.setStatus(source, args.id, args.type, args.value)),
);
addCommand(
  "forcepaycheck",
  { help: Locale("COMMAND_FORCEPAYCHECK"), restricted: true, params: [id] },
  (source, args) => answer(source, actions.paycheck(source, args.id)),
);
addCommand(
  "illegalset",
  {
    help: Locale("COMMAND_ILLEGALSET"),
    restricted: true,
    params: [
      { name: "target", type: "string", help: Locale("COMMAND_P_CHARACTER") },
      {
        name: "state",
        type: "string",
        help: Locale("COMMAND_P_ILLEGAL"),
        optional: true,
      },
    ],
  },
  (source, args) => {
    const state =
      args.state === undefined
        ? undefined
        : args.state === "1"
          ? true
          : args.state === "0"
            ? false
            : null;
    if (state === null) return answer(source, "ERR_ILLEGAL_VALUE");
    const number = /^\d+$/.test(args.target) ? Number(args.target) : 0;
    // A number that is an online player's server id means that player; anything else is a citizenid.
    const target = isOnline(number) ? number : args.target;
    return answer(source, actions.illegal(source, target, state));
  },
);
addCommand(
  "editplayer",
  {
    help: Locale("COMMAND_EDITPLAYER"),
    restricted: true,
    params: [
      {
        name: "citizenid",
        type: "string",
        help: Locale("COMMAND_P_CITIZENID"),
      },
    ],
  },
  (source, args) => answer(source, actions.editPlayer(source, args.citizenid)),
);
