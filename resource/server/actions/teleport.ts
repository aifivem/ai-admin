import { isOnline, notify } from "@aicore-fivem/lib/server";
import { Locale } from "common";
import { EVENTS, type TeleportPoint } from "common/admin";
import { actionLog } from "../actionLog";
import { pos } from "./position";
import type { Result } from "./result";

/** Noclip, teleports and the coordinates print. */
export const teleportActions = {
  noclip(source: number): Result {
    emitNet(EVENTS.toggleNoclip, source);
    return null;
  },

  tpm(source: number): Result {
    emitNet(EVENTS.teleport, source, null);
    actionLog("teleported to the waypoint", source);
    return null;
  },

  tp(source: number, point: TeleportPoint): Result {
    emitNet(EVENTS.teleport, source, point);
    actionLog("teleported to coordinates", source, undefined, { ...point });
    return null;
  },

  goto(source: number, target: number): Result {
    if (target === source || !isOnline(target)) return "ERR_TARGET";
    const point = pos(target);
    emitNet(EVENTS.teleport, source, point);
    actionLog("went to a player", source, target, point);
    return null;
  },

  bring(source: number, target: number): Result {
    if (target === source || !isOnline(target)) return "ERR_TARGET";
    const point = pos(source);
    emitNet(EVENTS.teleport, target, point);
    notify(target, Locale("NOTIFY_BROUGHT"), "info");
    actionLog("brought a player", source, target, point);
    return null;
  },

  coords(source: number): Result {
    emitNet(EVENTS.coords, source);
    return null;
  },
};
