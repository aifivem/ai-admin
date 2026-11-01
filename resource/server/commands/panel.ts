import { addCommand } from "@aicore-fivem/lib/server";
import { Locale } from "common";
import { EVENTS } from "common/admin";
import { actions } from "../actions";
import { answer, self } from "../commandReply";

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
