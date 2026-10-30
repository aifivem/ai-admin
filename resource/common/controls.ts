import { bool, int, record, str } from "@aicore-fivem/lib/shared";
import type { NotificationKind } from "@aicore-fivem/shared";

/** The weather types of the qb-weathersync contract (what ai-core's world layer passes on). */
export const WEATHERS = [
  "EXTRASUNNY",
  "CLEAR",
  "NEUTRAL",
  "SMOG",
  "FOGGY",
  "OVERCAST",
  "CLOUDS",
  "CLEARING",
  "RAIN",
  "THUNDER",
  "SNOW",
  "BLIZZARD",
  "SNOWLIGHT",
  "XMAS",
  "HALLOWEEN",
] as const;
export type Weather = (typeof WEATHERS)[number];
export const isWeather = (v: unknown): v is Weather =>
  typeof v === "string" && (WEATHERS as readonly string[]).includes(v);

export const NOTIFY_KINDS: NotificationKind[] = [
  "info",
  "success",
  "warning",
  "error",
];

/**
 * The panel's Messages and World tabs (`data/controls.json`, admins only): the announcement style, the message and
 * warning forms (their Send switches send and turn themselves off) and what an admin last set for the world.
 */
export interface Controls {
  announceText: string;
  announceKind: NotificationKind;
  /** Seconds an announcement stays on screen. */
  announceSeconds: number;
  announceSend: boolean;
  /** Citizen id of an online player. */
  warnPlayer: string;
  warnReason: string;
  warnSend: boolean;
  /** "" = no admin set it since the form was cleared. */
  weather: Weather | "";
  hour: number;
  minute: number;
  freezeTime: boolean;
  blackout: boolean;
}

export function readControls(raw: unknown): Controls {
  const c = record(raw);
  return {
    announceText: str(c.announceText, "", 300),
    announceKind: NOTIFY_KINDS.find((k) => k === c.announceKind) ?? "warning",
    announceSeconds: int(c.announceSeconds, 10, 2, 60),
    announceSend: bool(c.announceSend, false),
    warnPlayer: str(c.warnPlayer, "", 64),
    warnReason: str(c.warnReason, "", 300),
    warnSend: bool(c.warnSend, false),
    weather: isWeather(c.weather) ? c.weather : "",
    hour: int(c.hour, 12, 0, 23),
    minute: int(c.minute, 0, 0, 59),
    freezeTime: bool(c.freezeTime, false),
    blackout: bool(c.blackout, false),
  };
}

/** The world as the weather script reports it, for the quick menu. */
export interface WorldState {
  weather: string | null;
  time: { hour: number; minute: number } | null;
}

export function toWorldState(v: unknown): WorldState {
  const r = record(v);
  const t = record(r.time);
  return {
    weather: typeof r.weather === "string" ? r.weather : null,
    time:
      typeof t.hour === "number" && typeof t.minute === "number"
        ? { hour: t.hour, minute: t.minute }
        : null,
  };
}
