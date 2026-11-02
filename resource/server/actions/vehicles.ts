import {
  coordsOf,
  EntityState,
  isOnline,
  nearestVehicleTo,
  notify,
  optionalExport,
  plateOf,
  spawnVehicle,
  stateBoolean,
  vehicleKeys,
  vehicleOf,
  vehicleType,
} from "@aifivem/lib/server";
import { normalizePlate } from "@aifivem/lib/shared";
import { type DeleteByPlateResult, VEHICLE_BAGS } from "@aifivem/shared";
import { Locale } from "common";
import { actionLog } from "../actionLog";
import { content } from "../content";
import { deleteEntities } from "../entities";
import { tell } from "../framework/tell";
import { playerLabel } from "../playerName";
import { isRadius } from "./entities";
import { pos } from "./position";
import type { Result } from "./result";

const owned = new EntityState(VEHICLE_BAGS.owned, stateBoolean);

const ped = (source: number) => GetPlayerPed(String(source));

/** Spawning and deleting vehicles, giving keys. */
export const vehicleActions = {
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
    actionLog("spawned a vehicle", source, undefined, {
      model: hashName,
      ...p,
    });
    return null;
  },

  /**
   * Deletes the vehicle the admin sits in, else the closest one within 5 m; with a radius every vehicle within it
   * that no player sits in.
   */
  dv(source: number, radius?: number): Result {
    if (radius !== undefined) {
      if (!isRadius(radius)) return "ERR_RADIUS";
      const count = deleteEntities("vehicles", {
        center: coordsOf(source),
        radius,
      });
      notify(source, Locale("NOTIFY_DELETED_ALL", count), "success");
      actionLog("deleted vehicles nearby", source, undefined, {
        count,
        radius,
      });
      return null;
    }
    const vehicle = nearestVehicleTo(source, 5);
    if (!vehicle) return "ERR_NO_VEHICLE";
    const metadata = {
      model: GetEntityModel(vehicle),
      plate: plateOf(vehicle),
      ...pos(source),
    };
    DeleteEntity(vehicle);
    notify(source, Locale("NOTIFY_DV_DONE"), "success");
    actionLog("deleted a vehicle", source, undefined, metadata);
    return null;
  },

  /** Gives a player the keys of the vehicle the admin sits in, else the closest one within 5 m. */
  giveKeys(source: number, target: number): Result {
    if (source <= 0) return "ERR_PLAYER_ONLY";
    const vehicle = nearestVehicleTo(source, 5);
    if (!vehicle) return "ERR_NO_VEHICLE";
    vehicleKeys.give(target, vehicle, "temporary");
    const plate = plateOf(vehicle);
    notify(
      source,
      Locale("NOTIFY_KEYS_GIVEN", plate, playerLabel(target)),
      "success",
    );
    actionLog("gave vehicle keys", source, target, { plate });
    return null;
  },

  /**
   * Deletes an owned vehicle completely (its record and every world copy) through ai-vehicles: no `ref` = the one
   * the admin sits in, an online player's server id = the one that player sits in, else a plate.
   */
  async vehdel(source: number, ref: string | undefined): Promise<Result> {
    const vehicles = optionalExport("ai-vehicles");
    if (!vehicles) return "ERR_NO_VEHICLES";
    const text = ref?.trim() ?? "";
    const id = /^\d+$/.test(text) ? Number(text) : 0;
    const rider = !text ? source : isOnline(id) ? id : 0;
    if (!text && source <= 0) return "ERR_PLATE";
    const vehicle = rider > 0 ? vehicleOf(rider) : 0;
    if (rider > 0 && !vehicle)
      return rider === source ? "ERR_NOT_IN_VEHICLE" : "ERR_TARGET_ON_FOOT";
    const plate = vehicle ? plateOf(vehicle) : normalizePlate(text);
    const reply = await new Promise<DeleteByPlateResult>((resolve) =>
      vehicles.DeleteVehicleByPlate(plate, resolve),
    );
    if (!reply.ok)
      return reply.error === "not_found"
        ? "ERR_NOT_OWNED"
        : reply.error === "invalid_plate"
          ? "ERR_PLATE"
          : "ERR_VEHDEL";
    const { entities } = reply;
    tell(source, Locale("NOTIFY_VEHDEL", plate, entities));
    const target = rider > 0 && rider !== source ? rider : undefined;
    actionLog("deleted an owned vehicle", source, target, {
      plate,
      id: reply.id,
      entities,
    });
    return null;
  },
};
