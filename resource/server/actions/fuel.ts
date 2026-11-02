import { fuel, nearestVehicleTo, notify, plateOf } from "@aifivem/lib/server";
import { Locale } from "common";
import { actionLog } from "../actionLog";
import type { Result } from "./result";

/** Fuel of a vehicle through ai-core's fuel layer (whatever fuel script runs). */
export const fuelActions = {
  /** Sets the fuel (0-100) of the vehicle the admin sits in, else the closest one within 5 m. */
  setFuel(source: number, level: number): Result {
    if (!Number.isFinite(level) || level < 0 || level > 100)
      return "ERR_FUEL_LEVEL";
    if (fuel.provider() === null) return "ERR_NO_FUEL";
    const vehicle = nearestVehicleTo(source, 5);
    if (!vehicle) return "ERR_NO_VEHICLE";
    if (!fuel.set(vehicle, level)) return "ERR_NO_VEHICLE";
    const plate = plateOf(vehicle);
    notify(source, Locale("NOTIFY_FUEL_SET", plate, level), "success");
    actionLog("set a vehicle's fuel", source, undefined, { plate, level });
    return null;
  },
};
