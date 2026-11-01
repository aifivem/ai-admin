import { aiLog, aiLogChannels } from "@aicore-fivem/lib/server";

aiLogChannels({ actions: {} });

/** One line on the `actions` log channel (`source` 0: the server console). */
export const actionLog = (
  message: string,
  source: number,
  target?: number,
  metadata?: Record<string, unknown>,
) =>
  aiLog("actions", message, {
    source: source > 0 ? source : undefined,
    target,
    metadata,
  });
