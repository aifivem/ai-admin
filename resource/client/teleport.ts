import {
  notify,
  onServerEvent,
  player,
  waypoint,
} from "@aicore-fivem/lib/client";
import { Locale } from "common";
import { EVENTS, toTeleportPoint, type TeleportPoint } from "common/admin";
import { noclipHints } from "./noclip/hints";
import { noclip, reportNoclip } from "./noclip/toggle";

/** A teleport the server approved: to a point, or (null) to the waypoint. Noclip ends first. */
async function teleport(point: TeleportPoint | null): Promise<void> {
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

onServerEvent(
  EVENTS.teleport,
  {
    args: ([p]) => {
      const point = toTeleportPoint(p);
      return point === undefined ? null : [point];
    },
  },
  (point) => void teleport(point),
);
