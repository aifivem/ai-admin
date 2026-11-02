import { addCommand } from "@aifivem/lib/server";
import { Locale } from "common";
import { actions } from "../actions";
import { radius } from "../commandParams";
import { answer } from "../commandReply";

addCommand(
  "deleteped",
  { help: Locale("COMMAND_DELETEPED"), restricted: true, params: [radius] },
  (source, args) =>
    answer(source, actions.deleteNear(source, "peds", args.radius)),
);
addCommand(
  "deleteobject",
  { help: Locale("COMMAND_DELETEOBJECT"), restricted: true, params: [radius] },
  (source, args) =>
    answer(source, actions.deleteNear(source, "objects", args.radius)),
);
addCommand("npc", { help: Locale("COMMAND_NPC"), restricted: true }, (source) =>
  answer(source, actions.npc(source)),
);
