import type { Settings } from "common/admin";
import {
  pressed,
  SPEED_DECREASE,
  SPEED_FAST,
  SPEED_FASTER,
  SPEED_INCREASE,
  SPEED_RESET,
  SPEED_SLOW,
} from "./controls";

/** The mouse wheel steps the base speed (click: back to the panel's start speed). */
export function adjustSpeed(speed: number, c: Settings): number {
  if (pressed(2, SPEED_DECREASE))
    return Math.max(c.noclipStep, speed - c.noclipStep);
  if (pressed(2, SPEED_INCREASE))
    return Math.min(c.noclipMaxSpeed, speed + c.noclipStep);
  if (IsDisabledControlJustReleased(0, SPEED_RESET)) return c.noclipSpeed;
  return speed;
}

/** Shift / Alt / Ctrl held: the panel's fast, faster or slow factor. */
export const speedMultiplier = (c: Settings): number =>
  pressed(0, SPEED_FAST)
    ? c.noclipFast
    : pressed(0, SPEED_FASTER)
      ? c.noclipFaster
      : pressed(0, SPEED_SLOW)
        ? c.noclipSlow
        : 1;
