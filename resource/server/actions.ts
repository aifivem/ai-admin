import {
  aiLog,
  coordsOf,
  EntityState,
  inventory,
  isOnline,
  medical,
  nearestVehicleTo,
  notify,
  plateOf,
  spawnVehicle,
  stateBoolean,
  vehicleKeys,
  vehicleOf,
  vehicleType,
} from "@aicore-fivem/lib/server";
import { ADMIN, VEHICLE_BAGS } from "@aicore-fivem/shared";
import { Locale } from "common";
import { EVENTS, type ErrorKey, type TeleportPoint } from "common/admin";
import { content } from "./content";

const owned = new EntityState(VEHICLE_BAGS.owned, stateBoolean);

/**
 * Admin actions behind the commands and the quick menu. The caller already checked the admin; each returns null
 * when it ran, else the lang key of the error. Every action that changes something is logged.
 */
export type Result = ErrorKey | null;

const ped = (source: number) => GetPlayerPed(String(source));
/** A player's position as log metadata and teleport point. */
const pos = (source: number) => ({ ...coordsOf(source) });
const name = (source: number) =>
  GetPlayerName(String(source)) || String(source);
const targetName = (target: number) => `${name(target)} (${target})`;
const log = (
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

  /** Full health; a downed player needs revive (the death script keeps the down state). */
  heal(source: number, target: number): Result {
    if (medical.provider() === null) return "ERR_NO_DEATH";
    if (!isOnline(target)) return "ERR_TARGET";
    if (medical.isDead(target)) return "ERR_DOWN";
    medical.heal(target);
    if (target !== source)
      notify(target, Locale("NOTIFY_HEALED_BY"), "success");
    if (source > 0)
      notify(source, Locale("NOTIFY_HEALED", name(target)), "success");
    log("healed a player", source, target);
    return null;
  },

  /** Gets a downed player up where they lie; a player who is not down is healed. */
  revive(source: number, target: number): Result {
    if (medical.provider() === null) return "ERR_NO_DEATH";
    if (!isOnline(target)) return "ERR_TARGET";
    if (!medical.revive(target)) medical.heal(target);
    if (target !== source)
      notify(target, Locale("NOTIFY_REVIVED_BY"), "success");
    if (source > 0)
      notify(source, Locale("NOTIFY_REVIVED", name(target)), "success");
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
    const current = vehicleOf(source, { driver: true });
    // The admin's own spawned car is replaced; an owned vehicle is never deleted here.
    if (current && owned.get(current) !== true) DeleteEntity(current);
    const p = pos(source);
    const coords = { ...p, heading: GetEntityHeading(admin) };
    const vehicle = await spawnVehicle({
      model: hashName,
      type,
      coords,
      fuel: content.settings.carFuel,
      setup: {
        maxed: content.settings.carMaxed || undefined,
        engineOn: content.settings.carEngineOn || undefined,
        dirt: 0,
      },
      driver: source,
      keysTo: source,
      purpose: "temporary",
      persistent: false,
    });
    if (vehicle === null) return "ERR_VEHICLE";
    notify(source, Locale("NOTIFY_CAR_SPAWNED", hashName), "success");
    log("spawned a vehicle", source, undefined, { model: hashName, ...p });
    return null;
  },

  /** Deletes the vehicle the admin sits in, else the closest one within 5 m (an owned one goes to the impound). */
  dv(source: number): Result {
    const vehicle = nearestVehicleTo(source, 5);
    if (!vehicle) return "ERR_NO_VEHICLE";
    const metadata = {
      model: GetEntityModel(vehicle),
      plate: plateOf(vehicle),
      ...pos(source),
    };
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

  /** A notification for everyone, in the style of the panel's Messages tab. */
  announce(source: number, text: string): Result {
    const message = text.trim().slice(0, 300);
    if (!message) return "ERR_MESSAGE_EMPTY";
    const { announceKind, announceSeconds } = content.controls;
    notify(
      -1,
      Locale("NOTIFY_ANNOUNCE", message),
      announceKind,
      announceSeconds * 1000,
    );
    log("announced", source, undefined, { text: message });
    return null;
  },

  /** An admin's warning: the player sees it until they confirm it; the log keeps who warned whom and why. */
  warn(source: number, target: number, reason: string): Result {
    const text = reason.trim().slice(0, 300);
    if (!text) return "ERR_REASON_EMPTY";
    if (target === source || !isOnline(target)) return "ERR_TARGET";
    emitNet(EVENTS.warned, target, text);
    if (source > 0)
      notify(source, Locale("NOTIFY_WARNED", targetName(target)), "success");
    log("warned a player", source, target, { reason: text });
    return null;
  },

  /** Gives an item through ai-core's inventory layer (whatever inventory runs); the item must exist there. */
  giveItem(
    source: number,
    target: number,
    item: string,
    count: number,
  ): Result {
    const name = item.toLowerCase();
    if (!/^[a-z0-9_-]{1,48}$/.test(name) || !inventory.getItemDefinition(name))
      return "ERR_ITEM";
    if (!Number.isInteger(count) || count < 1 || count > 10_000)
      return "ERR_COUNT";
    if (!inventory.addItem(target, name, count)) return "ERR_ITEM_FULL";
    notify(
      source,
      Locale("NOTIFY_ITEM_GIVEN", count, name, targetName(target)),
      "success",
    );
    log("gave an item", source, target, { item: name, count });
    return null;
  },

  /** Takes an item away (as many as asked, or every one with count 0). */
  removeItem(
    source: number,
    target: number,
    item: string,
    count: number,
  ): Result {
    const name = item.toLowerCase();
    const has = inventory.getItemCount(target, name);
    if (has <= 0) return "ERR_ITEM_NONE";
    const take = count > 0 ? Math.min(count, has) : has;
    if (!inventory.removeItem(target, name, take)) return "ERR_ITEM_NONE";
    notify(
      source,
      Locale("NOTIFY_ITEM_REMOVED", take, name, targetName(target)),
      "success",
    );
    log("removed an item", source, target, { item: name, count: take });
    return null;
  },

  /** Empties a player's inventory. */
  clearInventory(source: number, target: number): Result {
    inventory.clearInventory(target);
    notify(
      source,
      Locale("NOTIFY_INVENTORY_CLEARED", targetName(target)),
      "success",
    );
    log("cleared an inventory", source, target);
    return null;
  },

  /** Opens a player's inventory on the admin's screen. */
  /** Gives a player the keys of the vehicle the admin sits in, else the closest one within 5 m. */
  giveKeys(source: number, target: number): Result {
    if (source <= 0) return "ERR_PLAYER_ONLY";
    const vehicle = nearestVehicleTo(source, 5);
    if (!vehicle) return "ERR_NO_VEHICLE";
    vehicleKeys.give(target, vehicle, "temporary");
    const plate = plateOf(vehicle);
    notify(
      source,
      Locale("NOTIFY_KEYS_GIVEN", plate, targetName(target)),
      "success",
    );
    log("gave vehicle keys", source, target, { plate });
    return null;
  },

  openInventory(source: number, target: number): Result {
    if (source <= 0) return "ERR_PLAYER_ONLY";
    if (!inventory.openInventory(source, target)) return "ERR_INVENTORY";
    log("opened an inventory", source, target);
    return null;
  },
};
