import { addCommand } from "@aicore-fivem/lib/server";
import { Locale } from "common";
import { actions } from "../actions";
import { optionalId } from "../commandParams";
import { answer, self } from "../commandReply";

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
  "givekey",
  { help: Locale("COMMAND_GIVEKEY"), restricted: true, params: [optionalId] },
  (source, args) => answer(source, actions.giveKeys(source, args.id ?? source)),
);
