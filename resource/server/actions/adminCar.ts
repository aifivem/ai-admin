import {
  notify,
  online,
  optionalExport,
  plateOf,
  triggerClientCallback,
  vehicleKeys,
  vehicleOf,
} from "@aifivem/lib/server";
import type { AdoptVehicleResult } from "@aifivem/shared";
import { Locale } from "common";
import { EVENTS, toAdminCarRead } from "common/admin";
import { actionLog } from "../actionLog";
import type { Result } from "./result";

const REFUSALS = {
  owned: "ERR_ADMINCAR_OWNED",
  plate_owned: "ERR_ADMINCAR_PLATE",
  model: "ERR_ADMINCAR_READ",
  invalid: "ERR_ADMINCAR_READ",
  failed: "ERR_ADMINCAR",
} as const satisfies Record<
  Exclude<AdoptVehicleResult, { ok: true }>["error"],
  NonNullable<Result>
>;

/** QB's `/admincar`. */
export const adminCarActions = {
  /**
   * The vehicle the admin sits in (any seat) becomes the admin's character's own, "out", with its look and plate
   * (ai-vehicles' `AdoptVehicle`; the model name and props are read on the admin's client); the admin gets the keys.
   */
  async adminCar(source: number): Promise<Result> {
    const vehicles = optionalExport("ai-vehicles");
    if (!vehicles) return "ERR_NO_VEHICLES";
    const charId = online.charId(source);
    if (charId === undefined) return "ERR_NO_CHARACTER";
    const vehicle = vehicleOf(source);
    if (!vehicle) return "ERR_NOT_IN_VEHICLE";
    const read = toAdminCarRead(
      await triggerClientCallback(EVENTS.readVehicle, source, [
        NetworkGetNetworkIdFromEntity(vehicle),
      ]).catch(() => null),
    );
    if (!read) return "ERR_ADMINCAR_READ";
    const reply = await new Promise<AdoptVehicleResult>((resolve) =>
      vehicles.AdoptVehicle(
        { type: "character", id: String(charId) },
        vehicle,
        read.model,
        read.props,
        resolve,
      ),
    );
    if (!reply.ok) return REFUSALS[reply.error];
    // A changed plate reaches the server's entity only after the owner client's next sync: keys by plate then.
    const synced = DoesEntityExist(vehicle) && plateOf(vehicle) === reply.plate;
    vehicleKeys.give(source, synced ? vehicle : reply.plate, "purchase");
    notify(source, Locale("NOTIFY_ADMINCAR", reply.plate), "success");
    actionLog("made a vehicle their own", source, undefined, {
      id: reply.id,
      plate: reply.plate,
      model: read.model,
    });
    return null;
  },
};
