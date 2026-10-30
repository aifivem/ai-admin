import { aiLog, notify, world } from "@aicore-fivem/lib/server";
import { createLogger } from "@aicore-fivem/lib/shared";
import { Locale, ResourceName } from "common";
import { isWeather } from "common/controls";
import type { Result } from "./actions";
import { commitControls } from "./content";

const log = createLogger(ResourceName);

/** A world change went through: the admin is told, the panel's World tab shows it, the log keeps it. */
function done(
  source: number,
  ok: boolean,
  text: string,
  change: Record<string, unknown>,
): Result {
  if (!ok) return "ERR_NO_WEATHER";
  if (source > 0) notify(source, text, "success");
  else log.info(text);
  commitControls(change);
  aiLog("actions", "changed the world", {
    source: source > 0 ? source : undefined,
    metadata: change,
  });
  return null;
}

/**
 * Time and weather through ai-core's world layer (whatever weather script runs), behind the commands, the quick
 * menu and the panel's World tab.
 */
export const worldActions = {
  weather(source: number, type: string): Result {
    const weather = type.toUpperCase();
    return done(
      source,
      world.setWeather(weather),
      Locale("NOTIFY_WEATHER", weather),
      { weather: isWeather(weather) ? weather : "" },
    );
  },

  time(source: number, hour: number, minute: number): Result {
    if (
      !Number.isInteger(hour) ||
      hour < 0 ||
      hour > 23 ||
      !Number.isInteger(minute) ||
      minute < 0 ||
      minute > 59
    )
      return "ERR_TIME";
    return done(
      source,
      world.setTime(hour, minute),
      Locale("NOTIFY_TIME", hour, String(minute).padStart(2, "0")),
      { hour, minute },
    );
  },

  freeze(source: number, on: boolean): Result {
    return done(
      source,
      world.freezeTime(on),
      Locale(on ? "NOTIFY_FREEZE_ON" : "NOTIFY_FREEZE_OFF"),
      { freezeTime: on },
    );
  },

  blackout(source: number, on: boolean): Result {
    return done(
      source,
      world.setBlackout(on),
      Locale(on ? "NOTIFY_BLACKOUT_ON" : "NOTIFY_BLACKOUT_OFF"),
      { blackout: on },
    );
  },
};
