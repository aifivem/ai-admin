import {
  entityFromNetId,
  getVehicleProps,
  onServerCallback,
} from "@aifivem/lib/client";
import { readId } from "@aifivem/lib/shared";
import { EVENTS, type AdminCarRead } from "common/admin";

/** /admincar: the vehicle's model name (the server cannot read archetype names) and look, read on this client. */
onServerCallback(EVENTS.readVehicle, (netId): AdminCarRead | null => {
  const id = readId(netId);
  const vehicle = id === null ? 0 : entityFromNetId(id, 2);
  if (!vehicle) return null;
  return {
    model: GetEntityArchetypeName(vehicle),
    props: getVehicleProps(vehicle),
  };
});
