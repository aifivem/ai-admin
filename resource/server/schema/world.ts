import { WEATHERS, type TabSpec } from "@aicore-fivem/shared";

const WEATHER_OPTIONS = [
  { value: "", label: "ADMIN_O_WEATHER_NONE" },
  ...WEATHERS.map((w) => ({ value: w, label: `WEATHER_${w}` })),
];

export const worldTab: TabSpec = {
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
};
