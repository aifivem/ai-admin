import { input, notify, onServerEvent } from "@aicore-fivem/lib/client";
import { Locale } from "common";
import { EVENTS } from "common/admin";

// An admin's warning stays on screen until the player confirms it.
onServerEvent(
  EVENTS.warned,
  {
    args: ([reason]) =>
      typeof reason === "string" ? [reason.slice(0, 300)] : null,
  },
  (reason) => {
    notify(Locale("NOTIFY_WARNING"), "error");
    void input({
      title: Locale("WARN_TITLE"),
      confirm: Locale("WARN_CONFIRM"),
      fields: [
        {
          name: "reason",
          label: Locale("WARN_REASON"),
          type: "text",
          multiline: true,
          value: reason,
          readOnly: true,
        },
      ],
    });
  },
);
