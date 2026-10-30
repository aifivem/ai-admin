import {
  AdminWorld,
  keyHints,
  loadLocaleTexts,
  notify,
  triggerServerCallback,
} from "@aicore-fivem/lib/client";
import { isRecord } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { EVENTS, readSettings, type TeleportPoint } from "common/admin";
import { Noclip } from "./noclip";
import { teleportTo, waypoint } from "./teleport";

const world = new AdminWorld(["settings"]);
const texts = loadLocaleTexts();
export const noclip = new Noclip(() => readSettings(world.get("settings")));

/** null for an `{ ok: true }` answer, else the error text to show. */
export function failure(result: unknown): string | null {
  if (isRecord(result) && result.ok === true) return null;
  const key =
    isRecord(result) && typeof result.error === "string"
      ? result.error
      : "ERR_NOT_ALLOWED";
  return texts[key] ?? key;
}

const reportNoclip = (on: boolean) =>
  triggerServerCallback(EVENTS.noclip, [on]).catch(() => null);

/** Noclip on asks the server first (admins only); off is always allowed and reported once the player landed. */
/** The noclip controls in the HUD's key hints while flying. */
const NOCLIP_HINTS = [
  ["WASD", "HINT_NOCLIP_MOVE"],
  ["Q/E", "HINT_NOCLIP_UPDOWN"],
  ["SHIFT", "HINT_NOCLIP_FAST"],
  ["CTRL", "HINT_NOCLIP_SLOW"],
  ["SPACE", "HINT_NOCLIP_GROUND"],
  ["V", "HINT_NOCLIP_VIEW"],
] as const;
function noclipHints(on: boolean): void {
  NOCLIP_HINTS.forEach(([key, label], i) =>
    on
      ? keyHints.show(`noclip${i}`, { key, label: Locale(label) })
      : keyHints.hide(`noclip${i}`),
  );
}

export async function setNoclip(on: boolean): Promise<void> {
  if (!on) {
    noclipHints(false);
    noclip.stop(() => void reportNoclip(false));
    notify(Locale("NOTIFY_NOCLIP_OFF"), "info");
    return;
  }
  const error = failure(await reportNoclip(true));
  if (error) return notify(error, "error");
  noclip.start();
  noclipHints(true);
  notify(Locale("NOTIFY_NOCLIP_ON"), "success");
}

/** A teleport the server approved: to a point, or (null) to the waypoint. Noclip ends first. */
export async function teleport(point: TeleportPoint | null): Promise<void> {
  if (noclip.on) {
    noclip.reset();
    noclipHints(false);
    void reportNoclip(false);
  }
  if (point) return teleportTo(point.x, point.y, point.z);
  const target = waypoint();
  if (!target) return notify(Locale("ERR_NO_WAYPOINT"), "error");
  await teleportTo(target[0], target[1]);
}
