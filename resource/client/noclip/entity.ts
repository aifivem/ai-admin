import { cache, raycast } from "@aicore-fivem/lib/client";

/** Gives the entity and ped back to the world: unfrozen, colliding, visible, noticed. */
export function releaseEntity(entity: number, ped: number): void {
  FreezeEntityPosition(entity, false);
  FreezeEntityPosition(ped, false);
  SetEntityCollision(entity, true, true);
  SetEntityVisible(entity, true, false);
  SetLocalPlayerVisibleLocally(true);
  ResetEntityAlpha(entity);
  ResetEntityAlpha(ped);
  SetEveryoneIgnorePlayer(cache.playerId, false);
  SetPoliceIgnorePlayer(cache.playerId, false);
}

/** Puts the entity on the ground under it (Space while flying, and when noclip ends: no hanging in the air). */
export function putOnGround(entity: number, inVehicle: boolean): void {
  const [x = 0, y = 0, z = 0] = GetEntityCoords(entity, false);
  RequestCollisionAtCoord(x, y, z);
  // A synchronous probe: the async ray's result is not ready in the same frame.
  const hit = raycast(
    { x, y, z },
    { x, y, z: -10000 },
    { flags: 1, ignore: entity },
  );
  const [found, groundZ] = GetGroundZFor_3dCoord(x, y, z, false);
  const ground = hit ? hit.coords.z : found ? groundZ : null;
  if (ground === null) return;
  SetEntityCoords(entity, x, y, ground, false, false, false, false);
  if (inVehicle) SetVehicleOnGroundProperly(entity);
}

/** One flying frame: frozen at its spot, no collision, invisible to others, seen faintly by the player. */
export function holdInFlight(
  entity: number,
  ped: number,
  inVehicle: boolean,
  firstPerson: boolean,
): void {
  const [x = 0, y = 0, z = 0] = GetEntityCoords(entity, false);
  RequestCollisionAtCoord(x, y, z);
  FreezeEntityPosition(entity, true);
  SetEntityCollision(entity, false, false);
  SetEntityVisible(entity, false, false);
  SetEntityInvincible(entity, true);
  SetLocalPlayerVisibleLocally(true);
  const alpha = firstPerson ? 0 : 51;
  SetEntityAlpha(entity, alpha, false);
  if (inVehicle) SetEntityAlpha(ped, alpha, false);
  SetEveryoneIgnorePlayer(cache.playerId, true);
  SetPoliceIgnorePlayer(cache.playerId, true);
}
