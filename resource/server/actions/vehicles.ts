import {
  EntityState,
  isOnline,
  nearestVehicleTo,
  notify,
  plateOf,
  spawnVehicle,
  stateBoolean,
  vehicleKeys,
  vehicleOf,
  vehicleType,
} from "@aicore-fivem/lib/server";
import { VEHICLE_BAGS } from "@aicore-fivem/shared";
import { Locale } from "common";
import { actionLog } from "../actionLog";
import { content } from "../content";
import { playerLabel } from "../playerName";
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
};
