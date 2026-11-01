import { addCommand } from "@aicore-fivem/lib/server";
import { Locale } from "common";
import { worldActions } from "../actions/world";
import { reply } from "../commandReply";

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
