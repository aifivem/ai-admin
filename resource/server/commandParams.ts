import { Locale } from "common";

/** The target player of a command. */
export const id = {
  name: "id",
  type: "playerId",
  help: Locale("COMMAND_P_ID"),
} as const;
export const optionalId = {
  ...id,
  help: Locale("COMMAND_P_ID_SELF"),
  optional: true,
} as const;
