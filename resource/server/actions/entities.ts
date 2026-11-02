import { coordsOf, optionalExport } from "@aifivem/lib/server";
import { Locale } from "common";
import { actionLog } from "../actionLog";
import { deleteEntities } from "../entities";
import { tell } from "../framework/tell";
import type { Result } from "./result";

/** A radius in metres a cleanup command takes. */
export const isRadius = (radius: number) => radius > 0 && radius <= 1000;

/** Peds / objects around the admin, NPCs and props, ambient traffic on / off. */
export const entityActions = {
  /**
   * NPCs (`peds`) or objects within `radius` m of the admin (default 5); from the server console every one, like
   * `dvp` / `dvo`. Player peds and the vehicles players sit in stay.
   */
  deleteNear(
    source: number,
    kind: "peds" | "objects",
    radius: number | undefined,
  ): Result {
    const r = radius ?? 5;
    if (!isRadius(r)) return "ERR_RADIUS";
    const count = deleteEntities(
      kind,
      source > 0 ? { center: coordsOf(source), radius: r } : undefined,
    );
    tell(source, Locale("NOTIFY_DELETED_ALL", count));
    actionLog(`deleted ${kind} nearby`, source, undefined, {
      count,
      radius: source > 0 ? r : null,
    });
    return null;
  },

  /** Ambient pedestrians and traffic off / on for everyone (ai-smallresources' switch). */
  npc(source: number): Result {
    const small = optionalExport("ai-smallresources");
    if (!small) return "ERR_NO_SMALLRESOURCES";
    const off = !small.IsNpcDisabled();
    if (!small.SetNpcDisabled(off)) return "ERR_NO_SMALLRESOURCES";
    tell(source, Locale(off ? "NOTIFY_NPC_OFF" : "NOTIFY_NPC_ON"));
    actionLog(off ? "turned NPCs off" : "turned NPCs on", source);
    return null;
  },
};
