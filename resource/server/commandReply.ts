import { notify } from "@aicore-fivem/lib/server";
import { createLogger } from "@aicore-fivem/lib/shared";
import { Locale, ResourceName } from "common";
import type { Result } from "./actions/result";

const log = createLogger(ResourceName);

/** A command answer: an ai-core notification for a player, a console line for the server. */
export function reply(source: number, error: Result): void {
  if (!error) return;
  if (source > 0) notify(source, Locale(error), "error");
  else log.info(Locale(error));
}

/** Commands that act on the caller's own ped: not from the server console. */
export const self = (
  source: number,
  run: () => Result | Promise<Result>,
): Result | Promise<Result> => (source > 0 ? run() : "ERR_PLAYER_ONLY");
export const answer = async (
  source: number,
  result: Result | Promise<Result>,
) => reply(source, await result);
