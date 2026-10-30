/** GTA's waypoint blip sprite. */
const WAYPOINT_SPRITE = 8;

/** The waypoint on the map (x, y), or null. */
export function waypoint(): [number, number] | null {
  const blip = GetFirstBlipInfoId(WAYPOINT_SPRITE);
  if (!DoesBlipExist(blip)) return null;
  const [x = 0, y = 0] = GetBlipInfoIdCoord(blip);
  return [x, y];
}
