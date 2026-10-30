import { resourceExport, world } from "@aicore-fivem/lib/server";
import { readControls, type Controls } from "common/controls";
import { actions } from "./actions";
import { commitControls, panel } from "./content";
import { worldActions } from "./world";

const core = resourceExport("ai-core");

const WORLD_FIELDS = [
  "weather",
  "hour",
  "minute",
  "freezeTime",
  "blackout",
] as const;

/**
 * The panel's Messages and World tabs act on an admin's edit (`panel.editor`): a Send switch sends its form, then
 * the form is cleared and the switch turned off; a changed world field is set for everyone. Changes the script stores
 * itself (`commit`) only move the last known state.
 */
class ControlForms {
  private last: Controls = readControls(panel.get("controls"));

  constructor() {
    // A form left half sent by a stop never sends at start.
    commitControls({ announceSend: false, warnSend: false });
    this.last = readControls(panel.get("controls"));
    panel.rule("controls", (_key, next) => this.check(readControls(next)));
    panel.onChange("controls", () => this.edited());
  }

  private check(next: Controls): string | null {
    if (next.announceSend && !this.last.announceSend && !next.announceText)
      return "ERR_MESSAGE_EMPTY";
    if (next.warnSend && !this.last.warnSend) {
      const target = next.warnPlayer
        ? core.GetSourceByCitizenId(next.warnPlayer)
        : null;
      if (target === null || target === panel.editor) return "ERR_TARGET";
      if (!next.warnReason) return "ERR_REASON_EMPTY";
    }
    if (
      WORLD_FIELDS.some((f) => next[f] !== this.last[f]) &&
      world.getWeather() === null
    )
      return "ERR_NO_WEATHER";
    return null;
  }

  private edited(): void {
    const before = this.last;
    const now = readControls(panel.get("controls"));
    this.last = now;
    const admin = panel.editor;
    if (admin === 0) return;
    if (now.announceSend && !before.announceSend) {
      actions.announce(admin, now.announceText);
      // After this change has reached the panel, or its delta would show the switch on again.
      setImmediate(() =>
        commitControls({ announceSend: false, announceText: "" }),
      );
    }
    if (now.warnSend && !before.warnSend) {
      const target = core.GetSourceByCitizenId(now.warnPlayer);
      if (target !== null) actions.warn(admin, target, now.warnReason);
      setImmediate(() =>
        commitControls({ warnSend: false, warnReason: "", warnPlayer: "" }),
      );
    }
    if (now.weather !== before.weather && now.weather)
      worldActions.weather(admin, now.weather);
    if (now.hour !== before.hour || now.minute !== before.minute)
      worldActions.time(admin, now.hour, now.minute);
    if (now.freezeTime !== before.freezeTime)
      worldActions.freeze(admin, now.freezeTime);
    if (now.blackout !== before.blackout)
      worldActions.blackout(admin, now.blackout);
  }
}

new ControlForms();
