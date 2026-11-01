import { banActions } from "./bans";
import { healthActions } from "./health";
import { itemActions } from "./items";
import { messageActions } from "./messages";
import { teleportActions } from "./teleport";
import { vehicleActions } from "./vehicles";

/** Every admin action behind the commands, the quick menu and the panel's forms (`result.ts`: what they return). */
export const actions = {
  ...teleportActions,
  ...healthActions,
  ...vehicleActions,
  ...banActions,
  ...messageActions,
  ...itemActions,
};
