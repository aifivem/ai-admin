import { addCommand } from "@aifivem/lib/server";
import { Locale } from "common";
import { actions } from "../actions";
import { optionalId, radius } from "../commandParams";
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
addCommand(
  "dv",
  {
    help: Locale("COMMAND_DV"),
    restricted: true,
    params: [radius],
  },
  (source, args) =>
    answer(
      source,
      self(source, () => actions.dv(source, args.radius)),
    ),
);
addCommand(
  "vehdel",
  {
    help: Locale("COMMAND_VEHDEL"),
    restricted: true,
    params: [
      {
        name: "target",
        type: "longString",
        help: Locale("COMMAND_P_VEHDEL"),
        optional: true,
      },
    ],
  },
  (source, args) => answer(source, actions.vehdel(source, args.target)),
);
addCommand(
  "givekey",
  { help: Locale("COMMAND_GIVEKEY"), restricted: true, params: [optionalId] },
  (source, args) => answer(source, actions.giveKeys(source, args.id ?? source)),
);
