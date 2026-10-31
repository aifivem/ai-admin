# ai-admin

Admin tools: noclip, teleports (waypoint, coordinates, to / from players), heal and revive, vehicle spawn and delete, announcements and player warnings, weather and time, and a quick menu (F9) through ai-core's shared menu. Depends on ai-core (ACE `ai.admin`, menu, input, notifications, logs, admin panel); heal / revive through ai-core's medical layer (lib `medical`, whatever death script runs); vehicle keys go through ai-core's key layer (lib `vehicleKeys`).

## Decisions

- Noclip is the owner's exlife implementation copied unchanged in feel (controls, speed steps, camera); only its speed numbers come from the panel, read once per start. Keep it that way: a change to how noclip moves needs the owner. Its camera stays hand-made (`CreateCamWithParams`, `RenderScriptCams(true, true, 1000, false, false)`): lib `ScriptCamera` always eases in with `easeCoordsAnim` on, which would change the 1 s ease. Its frame runs on a lib `TickLoop` while flying; every control is off through lib `controls.disableAll("noclip", [look x / y, chat])` (given back while the pause menu is open); the start reads `cache.vehicle` / `cache.seat`. Putting the entity on the ground uses lib `raycast` (synchronous; the old async ray was read before its result existed), then `GetGroundZFor_3dCoord`.
- Teleports run lib `player.teleport` with `keepVehicle`: server points (ped positions) with `ground: false`, the waypoint with `ground: "find"`.
- The server decides everything: commands are `addCommand` with `restricted: true`; the menu's one action callback has the `isAdmin()` guard; noclip on is asked from the server, off is always allowed. Clients teleport only on the server's event.
- `weather`, `time`, `blackout`, `freezetime` go through ai-core's world layer (lib `world`), so they work with any weather script that answers the qb-weathersync contract. Commands, the quick menu (Weather and time) and the panel's World tab run the same `server/world.ts` actions; each stores what it set in the `controls` file so the World tab shows the last admin change (the lib has no freeze / blackout getters, and the weather script may change the weather on its own).
- The Messages and World tabs are forms on one `sync: "admin"` settings file (`controls`, `server/controls.ts`): a Send button (`action` widget, `panel.onAction`) sends its form (refuses an empty message, an offline or own player, an empty reason, shown under the button), then the form clears (`commit`); a changed world field applies at once (refused while no weather script runs), only on an admin's edit (`panel.editor`, 0 for the script's own `commit`). Weather values are `WEATHERS` / `isWeather` from `@aicore-fivem/shared`.
- Warnings: `actions.warn` sends `EVENTS.warned` to the player (a notification plus ai-core's input dialog with the reason read-only and an "I understand" button), notifies the admin and logs who, whom and why on `actions`. Also in the quick menu: Players > player > Warn. Announcements use the style and time of the Messages tab (also for `/announce` and the quick menu's Announcement).
- Commands and menu run the same functions (`server/actions.ts`), which return an `ERR_*` lang key or null and log what they changed on channel `actions`.
- QB / ESX default commands with their names and arguments (owner decision: admins coming from those frameworks type what they know), in `server/manage.ts`: `setjob id job grade` (`unemployed` removes every job), `setgang id gang grade` (`none` removes every gang), `job` / `gang` (any player: own job / gang), `givemoney` / `setmoney id account amount` (aliases `giveaccountmoney` / `setaccountmoney`), `dvall` / `dvp` / `dvo` (every server-known vehicle / ped / object; players and occupied vehicles stay), `addpermission` / `removepermission id name` (`add_principal player.<id> group.<name>` until the player leaves, as QB; needs the `resource.ai-admin command.add_principal / remove_principal` lines in permission.cfg), `closeserver [reason]` / `openserver` (non-admins kicked and refused through ai-core's `AddConnectionCheck`; not kept over a restart). `togglepvp` is ai-core's (its `pvp` setting).
- Vehicles come from lib `spawnVehicle` with key purpose `temporary`; lib `vehicleType(model, admin)` checks the model first (ai-core's client answers), before the admin's old car is deleted.
- Item commands (`giveitem`, `removeitem`, `clearinv`, `openinv`) and the menu's item / inventory player actions go through lib `inventory`, so they work with any inventory ai-core adapts. `/items` and the menu's "Give item" open ai-core's item picker (lib `itemPicker`, capped by the target's weight); Take sends the list through `EVENTS.giveItems` (admin guard, at most 50 rows), each row given by the same action as a single item, stopping at the first refusal.
- `givekey [id]` gives the keys of the vehicle the admin sits in or stands next to (lib `vehicleKeys`, purpose `temporary`). Plates in notifications and logs are lib `plateOf` (trimmed, upper case).
- Noclip shows its keys on the HUD's key hints (lib `keyHints`) while it runs. The menu's "always show map" toggle calls ai-hud's `SetMinimapAlways` (optional export).
- Lang keys: `ADMIN_*` are panel texts only; game texts use `ERR_`, `NOTIFY_`, `MENU_`, `CAR_`, `COMMAND_`, `KEYBIND_`, `WEATHER_`, `ANNOUNCE_`, `WARN_`, `TIME_` (ai-core's generic panel texts also start with `ADMIN_`).

## Contracts

- Events and callbacks: `resource/common/admin.ts`. Uses lib `medical` (revive, heal, is down), ai-core's `ADMIN.showEvent` (opens the panel).

## Pitfalls

- Never `medical.heal` a downed player: the ped gets up but the death script keeps the down state. Revive first.
- Menu item icons must exist in ai-core's icon map (`web/src/features/admin/icons.ts`), or they show as a dot.

## Entry points

- Commands `resource/server/commands.ts`, menu callbacks `server/menu.ts`, the actions `server/actions.ts` and `server/world.ts`, panel `server/schema.ts` + `server/schemaControls.ts`, panel forms `server/controls.ts`.
- Client: noclip `resource/client/noclip.ts`, menu `client/menu.ts`, announce / warn inputs and the Weather and time menu `client/worldMenu.ts`.
