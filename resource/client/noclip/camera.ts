import { LOOK_X, LOOK_Y } from "./controls";

const MIN_PITCH = -89;
const MAX_PITCH = 89;
/** First person in a vehicle (off: the camera sits behind and above). */
const VEHICLE_FIRST_PERSON = false;

export function attachCamera(
  camera: number,
  entity: number,
  inVehicle: boolean,
  firstPerson: boolean,
): void {
  if (inVehicle) {
    AttachCamToEntity(
      camera,
      entity,
      0,
      VEHICLE_FIRST_PERSON ? 0.5 : -4.5,
      VEHICLE_FIRST_PERSON ? 1 : 2,
      true,
    );
  } else if (firstPerson) AttachCamToEntity(camera, entity, 0, 0, 1, true);
  else AttachCamToEntity(camera, entity, 0, -2, 1, true);
}

/** A scripted camera at the entity, eased in over 1 s (attach it next). */
export function createCamera(entity: number): number {
  const [x = 0, y = 0, z = 0] = GetEntityCoords(entity, false);
  const [, , heading = 0] = GetEntityRotation(entity, 2);
  const camera = CreateCamWithParams(
    "DEFAULT_SCRIPTED_CAMERA",
    x,
    y,
    z,
    0,
    0,
    heading,
    75,
    false,
    0,
  );
  SetCamActive(camera, true);
  RenderScriptCams(true, true, 1000, false, false);
  return camera;
}

export function destroyCamera(camera: number, entity: number): void {
  SetGameplayCamRelativeHeading(0);
  RenderScriptCams(false, true, 1000, true, true);
  DetachEntity(entity, true, true);
  SetCamActive(camera, false);
  DestroyCam(camera, true);
}

/** The mouse turns the camera (pitch clamped) and the entity follows its heading. */
export function rotateCamera(camera: number, entity: number): void {
  const [pitch = 0, roll = 0, yaw = 0] = GetCamRot(camera, 2);
  const nextPitch = pitch + GetControlNormal(0, LOOK_Y) * -5;
  const nextYaw = yaw + GetControlNormal(0, LOOK_X) * -10;
  if (nextPitch > MIN_PITCH && nextPitch < MAX_PITCH)
    SetCamRot(camera, nextPitch, roll, nextYaw, 2);
  SetEntityHeading(entity, Math.max(0, ((yaw % 360) + 360) % 360));
}
