# ai-admin

Admin tools: noclip, teleports (waypoint, coordinates, to / from players), heal and revive, vehicle spawn and delete, announcements, and a quick menu (F9) through ai-core's shared menu. Depends on ai-core (ACE `ai.admin`, menu, input, notifications, logs, admin panel); ai-death for heal / revive and ai-vehiclekeys for keys when they run. Research, decisions and the in-game test list: `docs/research/ai-admin.md`.

## Decisions

- Noclip is the owner's exlife implementation copied unchanged in feel (controls, speed steps, camera); only its speed numbers come from the panel, read once per start. Keep it that way: a change to how noclip moves needs the owner.
- The server decides everything: commands are `addCommand` with `restricted: true`; the menu's one action callback has the `isAdmin()` guard; noclip on is asked from the server, off is always allowed. Clients teleport only on the server's event.
- Commands and menu run the same functions (`server/actions.ts`), which return an `ERR_*` lang key or null and log what they changed on channel `actions`.
- Vehicles are server-created; the admin's client answers the spawn type (and whether the model exists).
- Lang keys: `ADMIN_*` are panel texts only; game texts use `ERR_`, `NOTIFY_`, `MENU_`, `CAR_`, `COMMAND_`, `KEYBIND_` (ai-core's generic panel texts also start with `ADMIN_`).

## Contracts

- Events and callbacks: `resource/common/admin.ts`. Uses ai-death's `Revive` / `IsDead` / `Heal`, ai-vehiclekeys' `GiveKeys`, ai-core's `ADMIN.showEvent` (opens the panel).

## Pitfalls

- Never call ai-death `Heal` on a downed player: the ped gets up but ai-death keeps the down state. Revive first.
- Menu item icons must exist in ai-core's icon map (`web/src/features/admin/icons.ts`), or they show as a dot.

## Entry points

- Commands `resource/server/commands.ts`, menu callbacks `server/menu.ts`, the actions `server/actions.ts`, panel `server/schema.ts`.
- Client: noclip `resource/client/noclip.ts`, teleport `client/teleport.ts`, menu `client/menu.ts`.
