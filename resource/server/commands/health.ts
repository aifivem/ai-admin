import { addCommand } from "@aicore-fivem/lib/server";
import { Locale } from "common";
import { actions } from "../actions";
import { optionalId } from "../commandParams";
import { answer } from "../commandReply";

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
