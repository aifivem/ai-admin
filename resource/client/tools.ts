import {
  AdminWorld,
  callAction,
  keyHints,
  notify,
  player,
  triggerServerCallback,
  waypoint,
} from "@aicore-fivem/lib/client";
import { Locale } from "common";
import {
  EVENTS,
  readSettings,
  type MenuAction,
  type TeleportPoint,
} from "common/admin";
import { Noclip } from "./noclip";

const world = new AdminWorld(["settings"]);
const settings = world.view("settings", readSettings);
export const noclip = new Noclip(() => settings.value);

/** Asks the server to run an action (it checks the admin again and logs); only failures are shown here. */
export async function run(
  action: MenuAction,
  target: number | null = null,
  value: string | null = null,
): Promise<void> {
  await callAction(EVENTS.action, [action, target, value], {
    fallback: "ERR_NOT_ALLOWED",
  });
}

/** Noclip off is only reported (the server logs it); on is asked through `callAction`. */
const reportNoclip = (on: boolean) =>
  triggerServerCallback(EVENTS.noclip, [on]).catch(() => null);

/** Noclip on asks the server first (admins only); off is always allowed and reported once the player landed. */
/** The noclip controls in the HUD's key hints while flying. */
const NOCLIP_HINTS = [
  ["WASD", "HINT_NOCLIP_MOVE", "arrows-up-down-left-right"],
  ["Q/E", "HINT_NOCLIP_UPDOWN", "up-down"],
  ["SHIFT", "HINT_NOCLIP_FAST", "forward"],
  ["CTRL", "HINT_NOCLIP_SLOW", "backward"],
  ["SPACE", "HINT_NOCLIP_GROUND", "arrow-down"],
  ["V", "HINT_NOCLIP_VIEW", "eye"],
] as const;
function noclipHints(on: boolean): void {
  NOCLIP_HINTS.forEach(([key, label, icon], i) =>
    on
      ? keyHints.show(`noclip${i}`, { key, label: Locale(label), icon })
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
  const allowed = await callAction(EVENTS.noclip, [true], {
    fallback: "ERR_NOT_ALLOWED",
  });
  if (!allowed) return;
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
  // Server points are ped positions (z = the ped's root); the waypoint has no z: the ground under it is found.
  if (point)
    return player.teleport(point, { ground: false, keepVehicle: true });
  const target = waypoint();
  if (!target) return notify(Locale("ERR_NO_WAYPOINT"), "error");
  await player.teleport(target, { ground: "find", keepVehicle: true });
}
