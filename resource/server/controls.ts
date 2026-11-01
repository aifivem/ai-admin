import { resourceExport, world } from "@aicore-fivem/lib/server";
import { readControls, type Controls } from "common/controls";
import { actions } from "./actions";
import { commitControls, panel } from "./content";
import { worldActions } from "./actions/world";

const core = resourceExport("ai-core");

const WORLD_FIELDS = [
  "weather",
  "hour",
  "minute",
  "freezeTime",
  "blackout",
] as const;

/**
 * The panel's Messages and World tabs: a Send button (`action` widget, `panel.onAction`) sends its form, then the form
 * is cleared; a changed world field is set for everyone on an admin's edit (`panel.editor`). Changes the script
 * stores itself (`commit`) only move the last known state.
 */
class ControlForms {
  private last: Controls = readControls(panel.get("controls"));

  constructor() {
    panel.rule("controls", (_key, next) => this.check(readControls(next)));
    panel.onChange("controls", () => this.edited());
    panel.onAction("announceSend", (admin, raw) => {
      const form = readControls(raw);
      if (!form.announceText) return "ERR_MESSAGE_EMPTY";
      actions.announce(admin, form.announceText);
      commitControls({ announceText: "" });
      return null;
    });
    panel.onAction("warnSend", (admin, raw) => {
      const form = readControls(raw);
      const target = form.warnPlayer
        ? core.GetSourceByCitizenId(form.warnPlayer)
        : null;
      if (target === null || target === admin) return "ERR_TARGET";
      if (!form.warnReason) return "ERR_REASON_EMPTY";
      actions.warn(admin, target, form.warnReason);
      commitControls({ warnReason: "", warnPlayer: "" });
      return null;
    });
  }

  private check(next: Controls): string | null {
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
