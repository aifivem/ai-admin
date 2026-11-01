import { Locale } from "common";
import { actionLog } from "../actionLog";
import type { Result } from "../actions/result";
import { tell } from "./tell";

/** QB `dvall` / `dvp` / `dvo`: every server-known vehicle / ped / object; players and the cars they sit in stay. */
export function deleteAll(
  source: number,
  kind: "vehicles" | "peds" | "objects",
): Result {
  const players = new Set<number>();
  const ridden = new Set<number>();
  for (const id of getPlayers()) {
    const ped = GetPlayerPed(id);
    players.add(ped);
    const vehicle = GetVehiclePedIsIn(ped, false);
    if (vehicle) ridden.add(vehicle);
  }
  const list: number[] =
    kind === "vehicles"
      ? GetAllVehicles()
      : kind === "peds"
        ? GetAllPeds()
        : GetAllObjects();
  let count = 0;
  for (const entity of list) {
    if (players.has(entity) || ridden.has(entity)) continue;
    DeleteEntity(entity);
    count++;
  }
  tell(source, Locale("NOTIFY_DELETED_ALL", count));
  actionLog(`deleted every ${kind}`, source, undefined, { count });
  return null;
}
