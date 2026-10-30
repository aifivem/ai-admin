import { bool, int, record, str } from "@aicore-fivem/lib/shared";
import {
  isWeather,
  type NotificationKind,
  type Weather,
} from "@aicore-fivem/shared";

export const NOTIFY_KINDS: NotificationKind[] = [
  "info",
  "success",
  "warning",
  "error",
];

/**
 * The panel's Messages and World tabs (`data/controls.json`, admins only): the announcement style, the message and
 * warning forms (their Send buttons send and clear them) and what an admin last set for the world.
 */
export interface Controls {
  announceText: string;
  announceKind: NotificationKind;
  /** Seconds an announcement stays on screen. */
  announceSeconds: number;
  /** Citizen id of an online player. */
  warnPlayer: string;
  warnReason: string;
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
    warnPlayer: str(c.warnPlayer, "", 64),
    warnReason: str(c.warnReason, "", 300),
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
