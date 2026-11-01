import { isOnline } from "@aicore-fivem/lib/server";
import { Locale } from "common";
import { actionLog } from "../actionLog";
import type { Result } from "../actions/result";
import { playerLabel } from "../playerName";
import { tell } from "./tell";

const PERMISSION = /^[a-z0-9_]{1,24}$/;

/** QB `addpermission` / `removepermission`: the player joins / leaves `group.<name>` until they leave. */
export function permission(
  source: number,
  target: number,
  permission: string,
  add: boolean,
): Result {
  if (!isOnline(target)) return "ERR_TARGET";
  const group = permission.toLowerCase();
  if (!PERMISSION.test(group)) return "ERR_PERMISSION";
  ExecuteCommand(
    `${add ? "add_principal" : "remove_principal"} player.${target} group.${group}`,
  );
  tell(
    source,
    Locale(
      add ? "NOTIFY_PERMISSION_ADDED" : "NOTIFY_PERMISSION_REMOVED",
      playerLabel(target),
      group,
    ),
  );
  actionLog(
    add ? "added a permission" : "removed a permission",
    source,
    target,
    {
      group,
    },
  );
  return null;
}
