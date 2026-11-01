export const MOVE_FORWARDS = 32; // W
export const MOVE_BACKWARDS = 33; // S
export const MOVE_LEFT = 34; // A
export const MOVE_RIGHT = 35; // D
export const MOVE_UP = 44; // Q
export const MOVE_DOWN = 46; // E
export const SPEED_DECREASE = 14; // mouse wheel down
export const SPEED_INCREASE = 15; // mouse wheel up
export const SPEED_RESET = 348; // mouse wheel click
export const SPEED_SLOW = 36; // left Ctrl
export const SPEED_FAST = 21; // left Shift
export const SPEED_FASTER = 19; // left Alt
export const TO_GROUND = 22; // Space
export const SWITCH_VIEW = 236; // V
export const LOOK_X = 220;
export const LOOK_Y = 221;

export const CHAT = 245;
/** lib `controls` reason; the controls noclip leaves enabled. */
export const NOCLIP_CONTROLS = "noclip";
export const KEPT_CONTROLS = [LOOK_X, LOOK_Y, CHAT];

/** Pressed, or pressed while disabled (noclip disables every control). */
export const pressed = (group: number, control: number): boolean =>
  IsControlPressed(group, control) || IsDisabledControlPressed(group, control);
