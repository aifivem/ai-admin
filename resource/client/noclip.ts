import {
  cache,
  controls,
  every,
  type Job,
  raycast,
  TickLoop,
} from "@aicore-fivem/lib/client";
import type { Settings } from "common/admin";

/**
 * Noclip: a camera on the entity (the vehicle when driving), the mouse turns it, the entity is moved by offsets,
 * frozen, without collision, invisible to others and seen faintly by the player. Speeds come from the panel.
 */

const MIN_PITCH = -89;
const MAX_PITCH = 89;
/** First person in a vehicle (off: the camera sits behind and above). */
const VEHICLE_FIRST_PERSON = false;

const MOVE_FORWARDS = 32; // W
const MOVE_BACKWARDS = 33; // S
const MOVE_LEFT = 34; // A
const MOVE_RIGHT = 35; // D
const MOVE_UP = 44; // Q
const MOVE_DOWN = 46; // E
const SPEED_DECREASE = 14; // mouse wheel down
const SPEED_INCREASE = 15; // mouse wheel up
const SPEED_RESET = 348; // mouse wheel click
const SPEED_SLOW = 36; // left Ctrl
const SPEED_FAST = 21; // left Shift
const SPEED_FASTER = 19; // left Alt
const TO_GROUND = 22; // Space
const SWITCH_VIEW = 236; // V
const LOOK_X = 220;
const LOOK_Y = 221;

const CHAT = 245;
/** lib `controls` reason; the controls noclip leaves enabled. */
const NOCLIP_CONTROLS = "noclip";
const KEPT_CONTROLS = [LOOK_X, LOOK_Y, CHAT];

const pressed = (group: number, control: number): boolean =>
  IsControlPressed(group, control) || IsDisabledControlPressed(group, control);

export class Noclip {
  private active = false;
  private ped = 0;
  private entity = 0;
  private inVehicle = false;
  private firstPerson = false;
  private speed = 1;
  private camera = 0;
  private readonly frame = new TickLoop(() => this.step());
  private landing: Job | null = null;
  /** Panel values, read once per start (not per frame). */
  private config: Settings;

  constructor(private readonly settings: () => Settings) {
    this.config = settings();
  }

  get on(): boolean {
    return this.active;
  }

  start(): void {
    if (this.active) return;
    this.active = true;
    this.config = this.settings();
    this.speed = this.config.noclipSpeed;
    this.ped = cache.ped;
    this.inVehicle = cache.vehicle !== false && cache.seat === -1;
    this.entity =
      cache.vehicle !== false && this.inVehicle ? cache.vehicle : this.ped;
    if (this.inVehicle) SetVehicleEngineOn(this.entity, false, true, true);
    else ClearPedTasksImmediately(this.ped);
    this.stopLanding();
    this.setupCamera();
    PlaySoundFromEntity(
      -1,
      "SELECT",
      this.ped,
      "HUD_LIQUOR_STORE_SOUNDSET",
      false,
      0,
    );
    SetUserRadioControlEnabled(false);
    this.frame.set(true);
  }

  /** Back on the ground; `landed` runs once the ped (or vehicle) stopped falling. */
  stop(landed: () => void): void {
    if (!this.active) return;
    this.active = false;
    this.frame.set(false);
    controls.enable(NOCLIP_CONTROLS);
    this.destroyCamera();
    PlaySoundFromEntity(
      -1,
      "CANCEL",
      this.ped,
      "HUD_LIQUOR_STORE_SOUNDSET",
      false,
      0,
    );
    SetUserRadioControlEnabled(true);
    if (this.inVehicle) SetVehicleEngineOn(this.entity, true, true, false);
    this.release();
    this.toGround();
    // Invincible until the fall is over.
    const entity = this.entity;
    const vehicle = this.inVehicle;
    this.landing = every(100, () => {
      const down = vehicle
        ? IsVehicleOnAllWheels(entity)
        : !IsPedFalling(entity) && !IsPedRagdoll(entity);
      if (!down && DoesEntityExist(entity)) return;
      this.stopLanding();
      SetEntityInvincible(entity, false);
      landed();
    });
  }

  /** Resource stop or a teleport: everything back right away. */
  reset(): void {
    this.frame.set(false);
    controls.enable(NOCLIP_CONTROLS);
    if (this.active) this.destroyCamera();
    this.active = false;
    this.stopLanding();
    if (this.entity) {
      this.release();
      SetEntityInvincible(this.entity, false);
    }
    SetUserRadioControlEnabled(true);
  }

  private release(): void {
    FreezeEntityPosition(this.entity, false);
    FreezeEntityPosition(this.ped, false);
    SetEntityCollision(this.entity, true, true);
    SetEntityVisible(this.entity, true, false);
    SetLocalPlayerVisibleLocally(true);
    ResetEntityAlpha(this.entity);
    ResetEntityAlpha(this.ped);
    SetEveryoneIgnorePlayer(cache.playerId, false);
    SetPoliceIgnorePlayer(cache.playerId, false);
  }

  private stopLanding(): void {
    this.landing?.stop();
    this.landing = null;
  }

  private attachCamera(): void {
    if (this.inVehicle) {
      this.firstPerson = false;
      AttachCamToEntity(
        this.camera,
        this.entity,
        0,
        VEHICLE_FIRST_PERSON ? 0.5 : -4.5,
        VEHICLE_FIRST_PERSON ? 1 : 2,
        true,
      );
    } else if (this.firstPerson)
      AttachCamToEntity(this.camera, this.entity, 0, 0, 1, true);
    else AttachCamToEntity(this.camera, this.entity, 0, -2, 1, true);
  }

  private setupCamera(): void {
    const [x = 0, y = 0, z = 0] = GetEntityCoords(this.entity, false);
    const [, , heading = 0] = GetEntityRotation(this.entity, 2);
    this.camera = CreateCamWithParams(
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
    SetCamActive(this.camera, true);
    RenderScriptCams(true, true, 1000, false, false);
    this.attachCamera();
  }

  private destroyCamera(): void {
    SetGameplayCamRelativeHeading(0);
    RenderScriptCams(false, true, 1000, true, true);
    DetachEntity(this.entity, true, true);
    SetCamActive(this.camera, false);
    DestroyCam(this.camera, true);
    this.camera = 0;
  }

  private rotate(): void {
    const [pitch = 0, roll = 0, yaw = 0] = GetCamRot(this.camera, 2);
    const nextPitch = pitch + GetControlNormal(0, LOOK_Y) * -5;
    const nextYaw = yaw + GetControlNormal(0, LOOK_X) * -10;
    if (nextPitch > MIN_PITCH && nextPitch < MAX_PITCH)
      SetCamRot(this.camera, nextPitch, roll, nextYaw, 2);
    SetEntityHeading(this.entity, Math.max(0, ((yaw % 360) + 360) % 360));
  }

  private move(x: number, y: number, z: number): void {
    const [nx = 0, ny = 0, nz = 0] = GetOffsetFromEntityInWorldCoords(
      this.entity,
      x,
      y,
      z,
    );
    SetEntityCoordsNoOffset(this.entity, nx, ny, nz, false, false, false);
  }

  /** Puts the entity on the ground under it (Space while flying, and when noclip ends: no hanging in the air). */
  private toGround(): void {
    const [x = 0, y = 0, z = 0] = GetEntityCoords(this.entity, false);
    RequestCollisionAtCoord(x, y, z);
    // A synchronous probe: the async ray's result is not ready in the same frame.
    const hit = raycast(
      { x, y, z },
      { x, y, z: -10000 },
      { flags: 1, ignore: this.entity },
    );
    const [found, groundZ] = GetGroundZFor_3dCoord(x, y, z, false);
    const ground = hit ? hit.coords.z : found ? groundZ : null;
    if (ground === null) return;
    SetEntityCoords(this.entity, x, y, ground, false, false, false, false);
    if (this.inVehicle) SetVehicleOnGroundProperly(this.entity);
  }

  private step(): void {
    const c = this.config;
    this.rotate();
    // Every control is the noclip's while flying (camera look and chat stay); the pause menu gets them back.
    if (IsPauseMenuActive()) controls.enable(NOCLIP_CONTROLS);
    else {
      HudWeaponWheelIgnoreSelection();
      if (!controls.isDisabled(NOCLIP_CONTROLS))
        controls.disableAll(NOCLIP_CONTROLS, KEPT_CONTROLS);
    }
    if (IsDisabledControlJustPressed(0, SWITCH_VIEW)) {
      this.firstPerson = !this.firstPerson;
      this.attachCamera();
    }
    if (pressed(2, SPEED_DECREASE))
      this.speed = Math.max(c.noclipStep, this.speed - c.noclipStep);
    else if (pressed(2, SPEED_INCREASE))
      this.speed = Math.min(c.noclipMaxSpeed, this.speed + c.noclipStep);
    else if (IsDisabledControlJustReleased(0, SPEED_RESET))
      this.speed = c.noclipSpeed;
    if (IsDisabledControlJustPressed(0, TO_GROUND)) this.toGround();

    const multi = pressed(0, SPEED_FAST)
      ? c.noclipFast
      : pressed(0, SPEED_FASTER)
        ? c.noclipFaster
        : pressed(0, SPEED_SLOW)
          ? c.noclipSlow
          : 1;
    const step = 0.5 * this.speed * multi;
    const [pitch = 0] = GetCamRot(this.camera, 2);
    // Forward follows the camera's pitch.
    const climb = (pitch * ((this.speed / 2) * multi)) / 89;
    if (pressed(0, MOVE_FORWARDS)) this.move(0, step, climb);
    else if (pressed(0, MOVE_BACKWARDS)) this.move(0, -step, -climb);
    if (pressed(0, MOVE_LEFT)) this.move(-step, 0, 0);
    else if (pressed(0, MOVE_RIGHT)) this.move(step, 0, 0);
    if (pressed(0, MOVE_UP)) this.move(0, 0, step);
    else if (pressed(0, MOVE_DOWN)) this.move(0, 0, -step);

    const [x = 0, y = 0, z = 0] = GetEntityCoords(this.entity, false);
    RequestCollisionAtCoord(x, y, z);
    FreezeEntityPosition(this.entity, true);
    SetEntityCollision(this.entity, false, false);
    SetEntityVisible(this.entity, false, false);
    SetEntityInvincible(this.entity, true);
    SetLocalPlayerVisibleLocally(true);
    const alpha = this.firstPerson ? 0 : 51;
    SetEntityAlpha(this.entity, alpha, false);
    if (this.inVehicle) SetEntityAlpha(this.ped, alpha, false);
    SetEveryoneIgnorePlayer(cache.playerId, true);
    SetPoliceIgnorePlayer(cache.playerId, true);
  }
}
