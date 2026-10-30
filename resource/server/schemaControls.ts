import type { FileSpec, TabSpec } from "@aicore-fivem/shared";
import { NOTIFY_KINDS, WEATHERS } from "common/controls";

/**
 * The Messages and World tabs: forms whose edits act at once (server/controls.ts). A Send switch sends its form and
 * turns itself off; a world field sets the weather or time for everyone.
 */
export const CONTROLS_FILE: FileSpec = {
  kind: "settings",
  sync: "admin",
  sections: {
    announceText: { type: "text", min: 0, max: 300 },
    announceKind: { type: "enum", values: NOTIFY_KINDS },
    announceSeconds: { type: "number", min: 2, max: 60, integer: true },
    announceSend: { type: "bool" },
    warnPlayer: { type: "text", min: 0, max: 64, lookup: "player" },
    warnReason: { type: "text", min: 0, max: 300 },
    warnSend: { type: "bool" },
    weather: { type: "enum", values: ["", ...WEATHERS] },
    hour: { type: "number", min: 0, max: 23, integer: true },
    minute: { type: "number", min: 0, max: 59, integer: true },
    freezeTime: { type: "bool" },
    blackout: { type: "bool" },
  },
  defaults: {
    announceText: "",
    announceKind: "warning",
    announceSeconds: 10,
    announceSend: false,
    warnPlayer: "",
    warnReason: "",
    warnSend: false,
    weather: "",
    hour: 12,
    minute: 0,
    freezeTime: false,
    blackout: false,
  },
};

const WEATHER_OPTIONS = [
  { value: "", label: "ADMIN_O_WEATHER_NONE" },
  ...WEATHERS.map((w) => ({ value: w, label: `WEATHER_${w}` })),
];

export const CONTROLS_TABS: TabSpec[] = [
  {
    id: "messages",
    file: "controls",
    icon: "comments",
    label: "ADMIN_TAB_MESSAGES",
    desc: "ADMIN_TAB_MESSAGES_DESC",
    cards: [
      {
        icon: "comments",
        title: "ADMIN_C_ANNOUNCE",
        desc: "ADMIN_C_ANNOUNCE_DESC",
        fields: [
          {
            widget: "text",
            path: "announceText",
            label: "ADMIN_F_ANNOUNCE_TEXT",
            hint: "ADMIN_H_ANNOUNCE_TEXT",
            placeholder: "ADMIN_P_ANNOUNCE_TEXT",
          },
          {
            widget: "select",
            path: "announceKind",
            label: "ADMIN_F_ANNOUNCE_KIND",
            hint: "ADMIN_H_ANNOUNCE_KIND",
            options: [
              { value: "info", label: "ADMIN_O_INFO" },
              { value: "success", label: "ADMIN_O_SUCCESS" },
              { value: "warning", label: "ADMIN_O_WARNING" },
              { value: "error", label: "ADMIN_O_ERROR" },
            ],
          },
          {
            widget: "number",
            path: "announceSeconds",
            label: "ADMIN_F_ANNOUNCE_TIME",
            hint: "ADMIN_H_ANNOUNCE_TIME",
            min: 2,
            max: 60,
            step: 1,
            unit: "s",
          },
          {
            widget: "switch",
            path: "announceSend",
            label: "ADMIN_F_ANNOUNCE_SEND",
            hint: "ADMIN_H_ANNOUNCE_SEND",
          },
        ],
      },
      {
        icon: "triangle-exclamation",
        title: "ADMIN_C_WARN",
        desc: "ADMIN_C_WARN_DESC",
        fields: [
          {
            widget: "text",
            path: "warnPlayer",
            lookup: "player",
            label: "ADMIN_F_WARN_PLAYER",
            hint: "ADMIN_H_WARN_PLAYER",
            placeholder: "ADMIN_P_WARN_PLAYER",
          },
          {
            widget: "text",
            path: "warnReason",
            label: "ADMIN_F_WARN_REASON",
            hint: "ADMIN_H_WARN_REASON",
            placeholder: "ADMIN_P_WARN_REASON",
          },
          {
            widget: "switch",
            path: "warnSend",
            label: "ADMIN_F_WARN_SEND",
            hint: "ADMIN_H_WARN_SEND",
          },
        ],
      },
    ],
  },
  {
    id: "world",
    file: "controls",
    icon: "snowflake",
    label: "ADMIN_TAB_WORLD",
    desc: "ADMIN_TAB_WORLD_DESC",
    cards: [
      {
        icon: "snowflake",
        title: "ADMIN_C_WEATHER",
        desc: "ADMIN_C_WEATHER_DESC",
        fields: [
          {
            widget: "select",
            path: "weather",
            label: "ADMIN_F_WEATHER",
            hint: "ADMIN_H_WEATHER",
            options: WEATHER_OPTIONS,
          },
          {
            widget: "switch",
            path: "blackout",
            label: "ADMIN_F_BLACKOUT",
            hint: "ADMIN_H_BLACKOUT",
          },
        ],
      },
      {
        icon: "gauge",
        title: "ADMIN_C_TIME",
        desc: "ADMIN_C_TIME_DESC",
        fields: [
          {
            widget: "number",
            path: "hour",
            label: "ADMIN_F_HOUR",
            hint: "ADMIN_H_HOUR",
            min: 0,
            max: 23,
            step: 1,
            unit: "h",
          },
          {
            widget: "number",
            path: "minute",
            label: "ADMIN_F_MINUTE",
            min: 0,
            max: 59,
            step: 5,
            unit: "min",
          },
          {
            widget: "switch",
            path: "freezeTime",
            label: "ADMIN_F_FREEZE",
            hint: "ADMIN_H_FREEZE",
          },
        ],
      },
    ],
  },
];
