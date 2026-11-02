import { entityCoords } from "@aifivem/lib/server";
import { distance, type Vec3 } from "@aifivem/lib/shared";

export type EntityKind = "vehicles" | "peds" | "objects";

/** Player peds and the vehicles players sit in: the cleanup commands never delete them. */
function playerEntities(): Set<number> {
  const keep = new Set<number>();
  for (const id of getPlayers()) {
    const ped = GetPlayerPed(id);
    keep.add(ped);
    const vehicle = GetVehiclePedIsIn(ped, false);
    if (vehicle) keep.add(vehicle);
  }
  return keep;
}

/**
 * Deletes every server-known entity of a kind, only those within `radius` m of `center` when given; players and the
 * vehicles they sit in stay. Answers how many were deleted.
 */
export function deleteEntities(
  kind: EntityKind,
  near?: { center: Vec3; radius: number },
): number {
  const keep = playerEntities();
  const list: number[] =
    kind === "vehicles"
      ? GetAllVehicles()
      : kind === "peds"
        ? GetAllPeds()
        : GetAllObjects();
  let count = 0;
  for (const entity of list) {
    if (keep.has(entity)) continue;
    if (near && distance(near.center, entityCoords(entity)) > near.radius)
      continue;
    DeleteEntity(entity);
    count++;
  }
  return count;
}
