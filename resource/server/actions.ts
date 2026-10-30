import { aiLog, isOnline, notify, optionalExport, spawnVehicle, vehicleType } from "@aicore-fivem/lib/server";
import { ADMIN, VEHICLE_BAGS } from "@aicore-fivem/shared";
import { Locale } from "common";
import { EVENTS, type ErrorKey, type TeleportPoint } from "common/admin";
import { content } from "./content";

/**
 * Admin actions behind the commands and the quick menu. The caller already checked the admin; each returns null
 * when it ran, else the lang key of the error. Every action that changes something is logged.
 */
export type Result = ErrorKey | null;

const ped = (source: number) => GetPlayerPed(String(source));
const pos = (source: number) => {
  const [x = 0, y = 0, z = 0] = GetEntityCoords(ped(source));
  return { x, y, z };
};
const name = (source: number) => GetPlayerName(String(source)) || String(source);
const log = (message: string, source: number, target?: number, metadata?: Record<string, unknown>) =>
  aiLog("actions", message, { source: source > 0 ? source : undefined, target, metadata });

function nearestVehicle(source: number, metres: number): number {
  const p = pos(source);
  let best = 0;
  let bestDistance = metres;
  for (const vehicle of GetAllVehicles() as number[]) {
    const [x = 0, y = 0, z = 0] = GetEntityCoords(vehicle);
    const d = Math.hypot(x - p.x, y - p.y, z - p.z);
    if (d < bestDistance) [best, bestDistance] = [vehicle, d];
  }
  return best;
}

export const actions = {
  noclip(source: number): Result {
    emitNet(EVENTS.toggleNoclip, source);
    return null;
  },

  tpm(source: number): Result {
    emitNet(EVENTS.teleport, source, null);
    log("teleported to the waypoint", source);
    return null;
  },

  tp(source: number, point: TeleportPoint): Result {
    emitNet(EVENTS.teleport, source, point);
    log("teleported to coordinates", source, undefined, { ...point });
    return null;
  },

  goto(source: number, target: number): Result {
    if (target === source || !isOnline(target)) return "ERR_TARGET";
    const point = pos(target);
    emitNet(EVENTS.teleport, source, point);
    log("went to a player", source, target, point);
    return null;
  },

  bring(source: number, target: number): Result {
    if (target === source || !isOnline(target)) return "ERR_TARGET";
    const point = pos(source);
    emitNet(EVENTS.teleport, target, point);
    notify(target, Locale("NOTIFY_BROUGHT"), "info");
    log("brought a player", source, target, point);
    return null;
  },

  /** Full health; a downed player needs revive (ai-death keeps the down state). */
  heal(source: number, target: number): Result {
    const death = optionalExport("ai-death");
    if (!death) return "ERR_NO_DEATH";
    if (!isOnline(target)) return "ERR_TARGET";
    if (death.IsDead(target) === true) return "ERR_DOWN";
    death.Heal(target);
    if (target !== source) notify(target, Locale("NOTIFY_HEALED_BY"), "success");
    if (source > 0) notify(source, Locale("NOTIFY_HEALED", name(target)), "success");
    log("healed a player", source, target);
    return null;
  },

  /** Gets a downed player up where they lie; a player who is not down is healed. */
  revive(source: number, target: number): Result {
    const death = optionalExport("ai-death");
    if (!death) return "ERR_NO_DEATH";
    if (!isOnline(target)) return "ERR_TARGET";
    if (death.Revive(target) !== true) death.Heal(target);
    if (target !== source) notify(target, Locale("NOTIFY_REVIVED_BY"), "success");
    if (source > 0) notify(source, Locale("NOTIFY_REVIVED", name(target)), "success");
    log("revived a player", source, target);
    return null;
  },

  /** A vehicle created on the server at the admin, who is put in the driver seat and gets the keys. */
  async car(source: number, model: string): Promise<Result> {
    const hashName = model.toLowerCase();
    if (!/^[a-z0-9_]{1,32}$/.test(hashName)) return "ERR_MODEL";
    const type = await vehicleType(hashName, source);
    if (!type || !isOnline(source)) return "ERR_MODEL";
    const admin = ped(source);
    const current = GetVehiclePedIsIn(admin, false);
    // The admin's own spawned car is replaced; an owned vehicle is never deleted here.
    if (current && GetPedInVehicleSeat(current, -1) === admin && Entity(current).state[VEHICLE_BAGS.owned] !== true)
      DeleteEntity(current);
    const p = pos(source);
    const coords = { ...p, heading: GetEntityHeading(admin) };
    const vehicle = await spawnVehicle({ model: hashName, type, coords, fuel: 100, driver: source, keysTo: source, purpose: "temporary", persistent: false });
    if (vehicle === null) return "ERR_VEHICLE";
    notify(source, Locale("NOTIFY_CAR_SPAWNED", hashName), "success");
    log("spawned a vehicle", source, undefined, { model: hashName, ...p });
    return null;
  },

  /** Deletes the vehicle the admin sits in, else the closest one within 5 m (an owned one goes to the impound). */
  dv(source: number): Result {
    const vehicle = GetVehiclePedIsIn(ped(source), false) || nearestVehicle(source, 5);
    if (!vehicle) return "ERR_NO_VEHICLE";
    const metadata = { model: GetEntityModel(vehicle), plate: GetVehicleNumberPlateText(vehicle), ...pos(source) };
    DeleteEntity(vehicle);
    notify(source, Locale("NOTIFY_DV_DONE"), "success");
    log("deleted a vehicle", source, undefined, metadata);
    return null;
  },

  coords(source: number): Result {
    emitNet(EVENTS.coords, source);
    return null;
  },

  /** ai-core's admin panel (the same as /aiadmin). */
  panel(source: number): Result {
    emitNet(ADMIN.showEvent, source);
    return null;
  },

  announce(source: number, text: string): Result {
    const { announceKind, announceSeconds } = content.settings;
    notify(-1, Locale("NOTIFY_ANNOUNCE", text), announceKind, announceSeconds * 1000);
    log("announced", source, undefined, { text });
    return null;
  },
};
