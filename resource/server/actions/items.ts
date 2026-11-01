import { inventory, notify } from "@aicore-fivem/lib/server";
import { Locale } from "common";
import { actionLog } from "../actionLog";
import { playerLabel } from "../playerName";
import type { Result } from "./result";

/** Items and inventories through lib `inventory` (whatever inventory ai-core adapts). */
export const itemActions = {
  /** Gives an item through ai-core's inventory layer (whatever inventory runs); the item must exist there. */
  giveItem(
    source: number,
    target: number,
    item: string,
    count: number,
  ): Result {
    const name = item.toLowerCase();
    if (!/^[a-z0-9_-]{1,48}$/.test(name) || !inventory.getItemDefinition(name))
      return "ERR_ITEM";
    if (!Number.isInteger(count) || count < 1 || count > 10_000)
      return "ERR_COUNT";
    if (!inventory.addItem(target, name, count)) return "ERR_ITEM_FULL";
    notify(
      source,
      Locale("NOTIFY_ITEM_GIVEN", count, name, playerLabel(target)),
      "success",
    );
    actionLog("gave an item", source, target, { item: name, count });
    return null;
  },

  /** Takes an item away (as many as asked, or every one with count 0). */
  removeItem(
    source: number,
    target: number,
    item: string,
    count: number,
  ): Result {
    const name = item.toLowerCase();
    const has = inventory.getItemCount(target, name);
    if (has <= 0) return "ERR_ITEM_NONE";
    const take = count > 0 ? Math.min(count, has) : has;
    if (!inventory.removeItem(target, name, take)) return "ERR_ITEM_NONE";
    notify(
      source,
      Locale("NOTIFY_ITEM_REMOVED", take, name, playerLabel(target)),
      "success",
    );
    actionLog("removed an item", source, target, { item: name, count: take });
    return null;
  },

  /** Empties a player's inventory. */
  clearInventory(source: number, target: number): Result {
    inventory.clearInventory(target);
    notify(
      source,
      Locale("NOTIFY_INVENTORY_CLEARED", playerLabel(target)),
      "success",
    );
    actionLog("cleared an inventory", source, target);
    return null;
  },

  /** Opens a player's inventory on the admin's screen. */

  openInventory(source: number, target: number): Result {
    if (source <= 0) return "ERR_PLAYER_ONLY";
    if (!inventory.openInventory(source, target)) return "ERR_INVENTORY";
    actionLog("opened an inventory", source, target);
    return null;
  },
};
