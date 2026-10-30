import { cache } from "@aicore-fivem/lib/client";
import { sleep, waitFor } from "@aicore-fivem/lib/shared";

/** GTA's waypoint blip sprite. */
const WAYPOINT_SPRITE = 8;
/** Heights tried for the ground under a point, bottom to top. */
const PROBE_STEP = 25;
const PROBE_TOP = 1000;

/** The waypoint on the map (x, y), or null. */
export function waypoint(): [number, number] | null {
  const blip = GetFirstBlipInfoId(WAYPOINT_SPRITE);
  if (!DoesBlipExist(blip)) return null;
  const [x = 0, y = 0] = GetBlipInfoIdCoord(blip);
  return [x, y];
}

/**
 * Puts the player (with the vehicle they drive) at (x, y, z), behind a fade. Without `z` the player lands on the
 * ground: the area is streamed by standing at rising heights until the game knows the ground there.
 */
export async function teleportTo(
  x: number,
  y: number,
  z?: number,
): Promise<void> {
  const ped = cache.ped;
  DoScreenFadeOut(250);
  await sleep(300);
  FreezeEntityPosition(ped, true);
  if (z !== undefined) {
    SetPedCoordsKeepVehicle(ped, x, y, z);
    RequestCollisionAtCoord(x, y, z);
    await waitFor(
      () => HasCollisionLoadedAroundEntity(ped) || undefined,
      3000,
    ).catch(() => false);
  } else {
    let ground: number | null = null;
    for (
      let height = 0;
      height <= PROBE_TOP && ground === null;
      height += PROBE_STEP
    ) {
      SetPedCoordsKeepVehicle(ped, x, y, height);
      RequestCollisionAtCoord(x, y, height);
      await sleep(50);
      const [found, groundZ] = GetGroundZFor_3dCoord(x, y, height, false);
      if (found) ground = groundZ;
    }
    SetPedCoordsKeepVehicle(ped, x, y, (ground ?? 0) + 1);
  }
  FreezeEntityPosition(ped, false);
  DoScreenFadeIn(400);
}
