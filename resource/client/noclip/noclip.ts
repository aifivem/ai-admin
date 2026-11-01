import {
  cache,
  controls,
  drivenVehicle,
  every,
  type Job,
  TickLoop,
} from "@aicore-fivem/lib/client";
import type { Settings } from "common/admin";
import {
  attachCamera,
  createCamera,
  destroyCamera,
  rotateCamera,
} from "./camera";
import {
  KEPT_CONTROLS,
  MOVE_BACKWARDS,
  MOVE_DOWN,
  MOVE_FORWARDS,
  MOVE_LEFT,
  MOVE_RIGHT,
  MOVE_UP,
  NOCLIP_CONTROLS,
  pressed,
  SWITCH_VIEW,
  TO_GROUND,
} from "./controls";
import { holdInFlight, putOnGround, releaseEntity } from "./entity";
import { adjustSpeed, speedMultiplier } from "./speed";

/**
 * Noclip: a camera on the entity (the vehicle when driving), the mouse turns it, the entity is moved by offsets,
 * frozen, without collision, invisible to others and seen faintly by the player. Speeds come from the panel.
 */

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
    const vehicle = drivenVehicle();
    this.inVehicle = vehicle !== false;
    this.entity = vehicle !== false ? vehicle : this.ped;
    if (this.inVehicle) SetVehicleEngineOn(this.entity, false, true, true);
    else ClearPedTasksImmediately(this.ped);
    this.stopLanding();
    this.camera = createCamera(this.entity);
    this.attachCamera();
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
    releaseEntity(this.entity, this.ped);
    putOnGround(this.entity, this.inVehicle);
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
      releaseEntity(this.entity, this.ped);
      SetEntityInvincible(this.entity, false);
    }
    SetUserRadioControlEnabled(true);
  }

  private attachCamera(): void {
    if (this.inVehicle) this.firstPerson = false;
    attachCamera(this.camera, this.entity, this.inVehicle, this.firstPerson);
  }

  private destroyCamera(): void {
    destroyCamera(this.camera, this.entity);
    this.camera = 0;
  }

  private stopLanding(): void {
    this.landing?.stop();
    this.landing = null;
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

  private step(): void {
    const c = this.config;
    rotateCamera(this.camera, this.entity);
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
    this.speed = adjustSpeed(this.speed, c);
    if (IsDisabledControlJustPressed(0, TO_GROUND))
      putOnGround(this.entity, this.inVehicle);

    const multi = speedMultiplier(c);
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

    holdInFlight(this.entity, this.ped, this.inVehicle, this.firstPerson);
  }
}
