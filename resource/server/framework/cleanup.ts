import { Locale } from "common";
import { actionLog } from "../actionLog";
import type { Result } from "../actions/result";
import { deleteEntities, type EntityKind } from "../entities";
import { tell } from "./tell";

/** QB `dvall` / `dvp` / `dvo`: every server-known vehicle / ped / object; players and the cars they sit in stay. */
export function deleteAll(source: number, kind: EntityKind): Result {
  const count = deleteEntities(kind);
  tell(source, Locale("NOTIFY_DELETED_ALL", count));
  actionLog(`deleted every ${kind}`, source, undefined, { count });
  return null;
}
