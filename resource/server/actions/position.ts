import { coordsOf } from "@aicore-fivem/lib/server";

/** A player's position as log metadata and teleport point. */
export const pos = (source: number) => ({ ...coordsOf(source) });
