/*aicore-client-errors*/(function(){var n=GetCurrentResourceName(),s={},c=0;var r=function(t){t=String(t).replace(/\^\d/g,"");var k=t.slice(0,300);if(s[k]||c>=20)return;s[k]=1;c++;try{TriggerServerEvent("ai-core:clientError",n,t.slice(0,4000))}catch(e){}};globalThis.__aicoreReportError=r;var l=console.log;console.log=function(){var a=arguments[0];if(typeof a==="string"&&a.indexOf("SCRIPT ERROR")!==-1)r(a);return l.apply(console,arguments)}})();
try{
(function() {

// ../../../packages/lib/src/fivem/callbackNames.ts
/**
	* Callback wire format, the same on both sides:
	*   request  `aicore:cb:<name>`              (callerResource, id, ...args)
	*   response `aicore:cbr:<callerResource>`   (id, ok, result)
	* The response goes only to the resource that asked, so two resources never see each other's replies.
	*/
	const requestEvent = (name) => `aicore:cb:${name}`;
	const responseEvent = (resource) => `aicore:cbr:${resource}`;
	/** Default time a caller waits for an answer before the promise rejects. */
	const DEFAULT_CALLBACK_TIMEOUT = 3e4;

// ../../../packages/lib/src/shared/wait.ts
/** Resolves after `ms` milliseconds. */
	function sleep(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
	/**
	* Resolves with the first value `check` returns that is not undefined, checking once per tick.
	* Rejects after `timeoutMs` (default 10 s); pass `false` to wait forever.
	* Return `cond || undefined` from `check` to wait for a truthy condition.
	*/
	function waitFor(check, timeoutMs = 1e4) {
		return new Promise((resolve, reject) => {
			const started = Date.now();
			const poll = () => {
				const value = check();
				if (value !== void 0) return resolve(value);
				if (timeoutMs !== false && Date.now() - started > timeoutMs) return reject(/* @__PURE__ */ new Error(`waitFor timed out after ${timeoutMs} ms`));
				setTimeout(poll, 0);
			};
			poll();
		});
	}

// ../../../packages/lib/src/shared/read.ts
/** Small readers for panel content (`data/*.json`): every one returns the fallback when the value is missing or wrong. */
	/** A finite number clamped to `[min, max]`, else the fallback. */
	function num(value, fallback, min = -Infinity, max = Infinity) {
		return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
	}
	/** `num` rounded to an integer. */
	function int(value, fallback, min = -Infinity, max = Infinity) {
		return Math.round(num(value, fallback, min, max));
	}
	/** A trimmed non-empty string cut to `max`, else the fallback. */
	function str(value, fallback, max = 64) {
		return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
	}
	/** The value as a plain object, or an empty one. */
	function record(value) {
		return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
	}

// ../../../packages/lib/src/shared/index.ts
	function isRecord(value) {
		return typeof value === "object" && value !== null && !Array.isArray(value);
	}
	/** Fills `{0}`, `{1}`... with the arguments by position (a translation may reorder or repeat them). */
	function formatText(template, args) {
		return template.replace(/\{(\d+)\}/g, (match, index) => {
			const value = args[Number(index)];
			return value === void 0 ? match : String(value);
		});
	}
	/** GTA vehicle class (`GetVehicleClassFromName`) -> the type `CreateVehicleServerSetter` wants. */
	function vehicleTypeOfClass(vehicleClass) {
		switch (vehicleClass) {
			case 8:
			case 13: return "bike";
			case 14: return "boat";
			case 15: return "heli";
			case 16: return "plane";
			case 21: return "train";
			default: return "automobile";
		}
	}
	/** Console output prefixed with the resource name, so server logs show where a line came from. */
	function createLogger(resource) {
		const prefix = `[${resource}]`;
		return {
			info: (message, ...details) => console.log(`${prefix} ${message}`, ...details),
			warn: (message, ...details) => console.warn(`${prefix} ^3${message}^7`, ...details),
			error: (message, ...details) => console.error(`${prefix} ^1${message}^7`, ...details)
		};
	}

// ../../../packages/lib/src/client/netEvent.ts
	const log$4 = createLogger(GetCurrentResourceName());
	/**
	* Whether the net event being handled came from the server (read it before the first `await`). On a client only
	* events from the server carry a source (65535 in the docs); a local emit by any resource carries none.
	*/
	const fromServer = () => Boolean(globalThis.source);
	function onServerEvent(name, first, second) {
		const [handler, parse] = typeof first === "function" ? [first, null] : [second, first.args];
		onNet(name, (...raw) => {
			if (!fromServer() || !handler) return;
			const args = parse ? parse(raw) : [];
			if (!args) return log$4.warn(`event ${name} from the server had invalid arguments`);
			Promise.resolve().then(() => handler(...args)).catch((error) => log$4.error(`event ${name} failed`, error));
		});
	}

// ../../../packages/lib/src/client/callback.ts
	const resource$1 = GetCurrentResourceName();
	const log$3 = createLogger(resource$1);
	const pending = /* @__PURE__ */ new Map();
	let nextId = 0;
	onNet(responseEvent(resource$1), (id, ok, result) => {
		if (!fromServer()) return;
		const entry = typeof id === "number" ? pending.get(id) : void 0;
		if (!entry) return;
		pending.delete(id);
		clearTimeout(entry.timer);
		if (ok === true) entry.resolve(result);
		else entry.reject(/* @__PURE__ */ new Error("server callback failed"));
	});
	/**
	* Asks the server (`onClientCallback(name, ...)` there) and resolves with its answer. The answer is unknown:
	* parse it. Rejects when the server reports an error or does not answer within `timeoutMs`.
	*/
	function triggerServerCallback(name, args = [], timeoutMs = DEFAULT_CALLBACK_TIMEOUT) {
		const id = ++nextId;
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				pending.delete(id);
				reject(/* @__PURE__ */ new Error(`server callback ${name} timed out`));
			}, timeoutMs);
			pending.set(id, {
				resolve,
				reject,
				timer
			});
			emitNet(requestEvent(name), resource$1, id, ...args);
		});
	}
	/** Answers the server's `triggerClientCallback(name, source, ...)`. Arguments are unknown: parse before use. */
	function onServerCallback(name, handler) {
		onNet(requestEvent(name), async (caller, id, ...args) => {
			if (!fromServer() || typeof caller !== "string" || typeof id !== "number") return;
			try {
				const result = await handler(...args);
				emitNet(responseEvent(caller), id, true, result ?? null);
			} catch (error) {
				log$3.error(`callback ${name} failed`, error);
				emitNet(responseEvent(caller), id, false, null);
			}
		});
	}

// ../../../packages/shared/src/core.ts
/** Names owned by ai-core that other resources, the bridges and the build step use. */
	const CORE = {
		resource: "ai-core",
		/** Client -> server: (resource: string, text: string). Sent by the reporter every client bundle carries. */
		clientErrorEvent: "ai-core:clientError",
		/** (src, character: CharacterInfo) after a character is loaded and spawned. */
		playerLoadedEvent: "ai-core:playerLoaded",
		/** (src, charId, reason: UnloadReason) before a character's state is dropped. */
		playerUnloadedEvent: "ai-core:playerUnloaded",
		/** (src, account: string, balance: number, delta: number, reason: string) */
		moneyChangedEvent: "ai-core:moneyChanged",
		/** (src, jobs: JobMembership[]) */
		jobsChangedEvent: "ai-core:jobsChanged",
		/** (src, job: string | null) */
		dutyChangedEvent: "ai-core:dutyChanged",
		/** (src, gangs: GangMembership[]) */
		gangsChangedEvent: "ai-core:gangsChanged",
		/** (src, gang: string | null) */
		activeGangChangedEvent: "ai-core:activeGangChanged",
		/** (src, charIds: number[]) each time a player's character screen loads; an appearance resource answers with portraits. */
		characterScreenEvent: "ai-core:characterScreen",
		/** (resource: string | null) the inventory behind ai-core's inventory layer changed (the bridge drops its item cache). */
		inventoryChangedEvent: "ai-core:inventoryChanged",
		/** (src, name: string, status: Record<string, number> | null) a player used an item; status = the needs it gives, from inventories that define them. */
		itemUsedEvent: "ai-core:itemUsed",
		/** (src, killer: number | null, weaponHash: number) a player with a loaded character died; fired from FXServer's `onPedDeath` (needs `PED_DEATH_STATE_KEY`). */
		playerDiedEvent: "ai-core:playerDied",
		clientPlayerLoadedEvent: "ai-core:client:playerLoaded",
		clientPlayerUnloadedEvent: "ai-core:client:playerUnloaded",
		/** (charId: number, url: string) a portrait image of a character on the character screen (e.g. `https://nui-img/<txd>/<txd>`). */
		clientCharacterPortraitEvent: "ai-core:client:characterPortrait",
		/** (charId: number) ai-appearance holds this character's look: ai-core dresses its scene ped with `ApplyCharacterAppearance`. */
		clientCharacterLookEvent: "ai-core:client:characterLook",
		/** (resource: string, id: string) the interaction key was pressed while that resource's prompt was on top. */
		clientPromptPressedEvent: "ai-core:client:promptPressed",
		/** (key: keyof PlayerCache, value) a cached value of the local player changed (one watcher in ai-core for every resource). */
		clientCacheEvent: "ai-core:client:cache",
		/** Server -> client callback: (model: string) the `CreateVehicleServerSetter` type of a model, null when the game has no such vehicle (ai-core's client answers for every resource, lib `spawnVehicle`). */
		vehicleTypeCallback: "ai-core:vehicleType",
		/** GlobalState: "prompt" | "target", how lib `Points` let players interact (ai-core panel setting). */
		interactionStateKey: "ai:interaction",
		charactersCallback: "ai-core:characters",
		createCharacterCallback: "ai-core:createCharacter",
		deleteCharacterCallback: "ai-core:deleteCharacter",
		selectCharacterCallback: "ai-core:selectCharacter",
		/** Server -> client: (notification: Notification) a notification card on the player's screen. */
		clientNotifyEvent: "ai-core:client:notify",
		/** Server -> client: (spawn: SpawnPoint) puts the loaded character into the world. */
		spawnEvent: "ai-core:client:spawn",
		/** Server -> client: () the character was let go (switch); show the character screen again. */
		openCharactersEvent: "ai-core:client:openCharacters"
	};

// ../../../packages/shared/src/admin.ts
/** Event names of the admin panel (owned by ai-core). */
	const ADMIN = {
		/** ACE every panel action checks: `add_ace group.admin ai.admin allow`. */
		ace: "ai.admin",
		/** Callback: (keybinds: KeybindInfo[] the admin's client knows) -> AdminPanelSnapshot[]. */
		openCallback: "ai-core:admin:open",
		applyCallback: "ai-core:admin:apply",
		closeEvent: "ai-core:admin:close",
		/** Server -> client: () open the panel (the `aiadmin` command, checked on the server). */
		showEvent: "ai-core:admin:show",
		/** Server -> admins with the panel open: (delta: AdminDelta). */
		deltaEvent: "ai-core:admin:delta",
		/** Server -> client of a world (`sync: "all"`) file: (file, key | null, value). Prefixed with the resource name. */
		worldEvent: (resource) => `${resource}:admin:world`,
		/** Callback: () -> { [file]: { key: value } } world records changed since the resource started. */
		worldChangesCallback: (resource) => `${resource}:admin:worldChanges`
	};

// ../../../packages/shared/src/menu.ts
	const MENU_EVENTS = {
		/** Client local: (resource, requestId, itemId | null) the player picked an item or closed the menu. */
		menuResult: "ai-core:client:menuResult",
		/** Client local: (resource, requestId, itemId) the pointer or focus is on an item (previews). */
		menuHover: "ai-core:client:menuHover",
		/** Client local: (resource, requestId, values | null) the player confirmed or closed the input dialog. */
		inputResult: "ai-core:client:inputResult"
	};

// ../../../packages/shared/src/commands.ts
/** Client local events between the lib's `Keybind` and ai-core's client. */
	const KEYBIND = {
		/** lib -> ai-core: (info: KeybindInfo) a keybind waits for its default key. */
		announceEvent: "ai-core:client:keybind",
		/** ai-core -> lib: (resource, name, key) the default key to register: the panel's value, else the script's. */
		keyEvent: "ai-core:client:keybindKey"
	};

// ../../../packages/lib/src/client/adminWorld.ts
/**
	* The client copy of a resource's world panel files (`sync: "all"`): the file FiveM cached at start, then the
	* records changed since start (asked once), then live changes. Never polls.
	*/
	var AdminWorld = class {
		data = /* @__PURE__ */ new Map();
		handlers = /* @__PURE__ */ new Map();
		resource = GetCurrentResourceName();
		/** Resolves once the changes since start are applied (or could not be loaded): the data is current from then on. */
		ready;
		/** `files`: the world files this client mirrors (each must be in the resource's `files`). */
		constructor(files) {
			const log = createLogger(this.resource);
			for (const file of files) {
				const raw = LoadResourceFile(this.resource, `data/${file}.json`);
				try {
					const parsed = raw ? JSON.parse(raw) : {};
					this.data.set(file, isRecord(parsed) ? parsed : {});
				} catch (error) {
					log.error(`data/${file}.json is not valid JSON`, error);
					this.data.set(file, {});
				}
			}
			onServerEvent(ADMIN.worldEvent(this.resource), { args: ([file, key, value]) => typeof file === "string" ? [
				file,
				typeof key === "string" && key !== "" ? key : void 0,
				value
			] : null }, (file, key, value) => this.put(file, key, value));
			this.ready = triggerServerCallback(ADMIN.worldChangesCallback(this.resource)).then((changes) => {
				if (!isRecord(changes)) return;
				for (const [file, records] of Object.entries(changes)) {
					if (!isRecord(records)) continue;
					for (const [key, value] of Object.entries(records)) this.put(file, key === "" ? void 0 : key, value);
				}
			}, (error) => log.error("loading the panel changes since start failed", error));
		}
		/** The current content of a file: the settings object, or `{ key: record }`. Read only; parse what you use. */
		get(file) {
			return this.data.get(file) ?? {};
		}
		onChange(file, handler) {
			this.handlers.set(file, [...this.handlers.get(file) ?? [], handler]);
		}
		put(file, key, value) {
			const data = this.data.get(file);
			if (!data) return;
			if (key === void 0) {
				if (isRecord(value)) this.data.set(file, value);
			} else if (value === null) delete data[key];
			else data[key] = value;
			for (const handler of this.handlers.get(file) ?? []) handler(key, value);
		}
	};

// ../../../packages/lib/src/client/cache.ts
/** The unarmed "weapon" hash: cached as `false`. */
	const UNARMED = GetHashKey("WEAPON_UNARMED") | 0;
	/** The weapon in a ped's hand, `false` when unarmed. */
	function readWeapon(ped) {
		const weapon = GetSelectedPedWeapon(ped) | 0;
		return weapon === UNARMED ? false : weapon;
	}
	/** The vehicle, seat and weapon of a ped right now (also ai-core's watcher). */
	function readPlayerState(ped) {
		const vehicle = GetVehiclePedIsIn(ped, false);
		let seat = false;
		if (vehicle) for (let i = -1; i < GetVehicleMaxNumberOfPassengers(vehicle); i++) {
			if (GetPedInVehicleSeat(vehicle, i) !== ped) continue;
			seat = i;
			break;
		}
		return {
			vehicle: vehicle || false,
			seat,
			weapon: readWeapon(ped)
		};
	}
	/**
	* The local player's often read values (ped, player id, server id, vehicle, seat, weapon), like ox_lib's `cache`:
	* read `cache.ped` instead of calling PlayerPedId() in loops. One watcher in ai-core updates every resource through
	* a local event, so no resource polls for these itself. Read only.
	*/
	const ped = PlayerPedId();
	const cache = {
		ped,
		playerId: PlayerId(),
		serverId: GetPlayerServerId(PlayerId()),
		...readPlayerState(ped)
	};
	const handlers = /* @__PURE__ */ new Map();
	const valid = (key, value) => key === "ped" || key === "playerId" || key === "serverId" ? typeof value === "number" : typeof value === "number" || value === false;
	on(CORE.clientCacheEvent, (key, value) => {
		if (typeof key !== "string" || !(key in cache)) return;
		const name = key;
		if (!valid(name, value) || cache[name] === value) return;
		const old = cache[name];
		cache[name] = value;
		for (const handler of handlers.get(name) ?? []) handler(value, old);
	});

// ../../../packages/lib/src/client/zones.ts
/**
	* Zones on this client: inside / outside checks at each zone's own interval, never per frame. Built for any count
	* (measured with 1,000,000 zones): zones sit in a grid of 64 m cells and a check looks only at the player's cell and
	* the zones the player is in.
	*/
	const log$2 = createLogger(GetCurrentResourceName());
	const CELL = 64;
	/** A zone wider than this many cells is kept in one list checked every time instead of in the grid. */
	const MAX_CELLS = 64;
	const cellKey = (cx, cy) => cx + 32768 << 16 | cy + 32768;
	function contains(shape, x, y, z) {
		switch (shape.type) {
			case "sphere": {
				const dx = x - shape.center.x;
				const dy = y - shape.center.y;
				const dz = z - shape.center.z;
				return dx * dx + dy * dy + dz * dz <= shape.radius * shape.radius;
			}
			case "cylinder": {
				const dx = x - shape.center.x;
				const dy = y - shape.center.y;
				return dx * dx + dy * dy <= shape.radius * shape.radius && Math.abs(z - shape.center.z) <= shape.height;
			}
			case "poly": {
				if (z < shape.minZ || z > shape.maxZ) return false;
				let inside = false;
				const p = shape.points;
				for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
					const a = p[i];
					const b = p[j];
					if (a.y > y !== b.y > y && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
				}
				return inside;
			}
			default: return shape;
		}
	}
	/** Ground bounding box of a shape: [minX, minY, maxX, maxY]. */
	function bounds(shape) {
		if (shape.type !== "poly") return [
			shape.center.x - shape.radius,
			shape.center.y - shape.radius,
			shape.center.x + shape.radius,
			shape.center.y + shape.radius
		];
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		for (const p of shape.points) {
			minX = Math.min(minX, p.x);
			minY = Math.min(minY, p.y);
			maxX = Math.max(maxX, p.x);
			maxY = Math.max(maxY, p.y);
		}
		return [
			minX,
			minY,
			maxX,
			maxY
		];
	}
	var Zone = class {
		options;
		inside = false;
		nextCheck = 0;
		interval;
		/** Grid cells the zone is filed under; empty when it is in the large list. */
		cells = [];
		constructor(options) {
			this.options = options;
			this.interval = Math.max(50, options.interval ?? 500);
		}
	};
	/**
	* The zones of one resource. One timer serves them all at the shortest interval any zone asks for; each zone is
	* checked only when its own interval has passed. With no zones the timer stops (an active JS timer costs every frame).
	*/
	var Zones = class {
		zones = /* @__PURE__ */ new Map();
		grid = /* @__PURE__ */ new Map();
		large = /* @__PURE__ */ new Set();
		insideNow = /* @__PURE__ */ new Set();
		/** How many zones use each interval, so the shortest one is found without walking every zone. */
		intervals = /* @__PURE__ */ new Map();
		timer = null;
		period = 0;
		/** Adds (or replaces) a zone. A replaced zone the player was in fires its onExit first. */
		add(id, options) {
			this.remove(id);
			const zone = new Zone(options);
			this.zones.set(id, zone);
			const [minX, minY, maxX, maxY] = bounds(options.shape);
			const x0 = Math.floor(minX / CELL);
			const y0 = Math.floor(minY / CELL);
			const x1 = Math.floor(maxX / CELL);
			const y1 = Math.floor(maxY / CELL);
			if ((x1 - x0 + 1) * (y1 - y0 + 1) > MAX_CELLS) this.large.add(zone);
			else for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
				const key = cellKey(cx, cy);
				let cell = this.grid.get(key);
				if (!cell) this.grid.set(key, cell = /* @__PURE__ */ new Set());
				cell.add(zone);
				zone.cells.push(key);
			}
			this.intervals.set(zone.interval, (this.intervals.get(zone.interval) ?? 0) + 1);
			this.schedule();
		}
		remove(id) {
			const zone = this.zones.get(id);
			if (!zone) return;
			this.zones.delete(id);
			this.large.delete(zone);
			for (const key of zone.cells) {
				const cell = this.grid.get(key);
				cell?.delete(zone);
				if (cell?.size === 0) this.grid.delete(key);
			}
			const left = (this.intervals.get(zone.interval) ?? 1) - 1;
			if (left > 0) this.intervals.set(zone.interval, left);
			else this.intervals.delete(zone.interval);
			if (this.insideNow.delete(zone)) this.fire(zone, false);
			this.schedule();
		}
		/** Removes every zone (exits fire for the ones the player is in). */
		clear() {
			const inside = [...this.insideNow];
			this.zones.clear();
			this.grid.clear();
			this.large.clear();
			this.insideNow.clear();
			this.intervals.clear();
			for (const zone of inside) this.fire(zone, false);
			this.schedule();
		}
		isInside(id) {
			return this.zones.get(id)?.inside ?? false;
		}
		get size() {
			return this.zones.size;
		}
		schedule() {
			let period = 0;
			for (const interval of this.intervals.keys()) period = period === 0 ? interval : Math.min(period, interval);
			if (period === this.period) return;
			if (this.timer) clearInterval(this.timer);
			this.timer = period ? setInterval(() => this.check(), period) : null;
			this.period = period;
		}
		check() {
			const now = GetGameTimer();
			const [x = 0, y = 0, z = 0] = GetEntityCoords(cache.ped, false);
			for (const zone of this.insideNow) this.test(zone, now, x, y, z);
			for (const zone of this.large) this.test(zone, now, x, y, z);
			const cell = this.grid.get(cellKey(Math.floor(x / CELL), Math.floor(y / CELL)));
			if (cell) for (const zone of cell) this.test(zone, now, x, y, z);
		}
		test(zone, now, x, y, z) {
			if (now < zone.nextCheck) return;
			zone.nextCheck = now + zone.interval;
			const inside = contains(zone.options.shape, x, y, z);
			if (inside === zone.inside) return;
			if (inside) this.insideNow.add(zone);
			else this.insideNow.delete(zone);
			this.fire(zone, inside);
		}
		fire(zone, inside) {
			zone.inside = inside;
			try {
				if (inside) zone.options.onEnter?.();
				else zone.options.onExit?.();
			} catch (error) {
				log$2.error("zone handler failed", error);
			}
		}
	};

// ../../../packages/lib/src/fivem/exports.ts
/** Typed access to another resource's exports (types come from CitizenExports in @aicore-fivem/shared). */
	function resourceExport(resource) {
		return globalThis.exports[resource];
	}
	/** Whether a resource is running now. */
	function isResourceStarted(resource) {
		return GetResourceState(resource) === "started";
	}

// ../../../packages/lib/src/client/prompt.ts
	const core$3 = resourceExport(CORE.resource);
	/** The player pressed the interaction key while this resource's prompt `id` was the one on top. */
	function onPromptPressed(handler) {
		const resource = GetCurrentResourceName();
		on(CORE.clientPromptPressedEvent, (owner, id) => {
			if (owner === resource && typeof id === "string") handler(id);
		});
	}

// ../../../packages/lib/src/client/blip.ts
	const LABEL = `AI_BLIP_${GetCurrentResourceName()}`;
	AddTextEntry(LABEL, "~a~");

// ../../../packages/lib/src/client/localPed.ts
	const log$1 = createLogger(GetCurrentResourceName());
	/** One zone set for every local ped of this resource: peds exist only while their player is near. */
	const zones = new Zones();
	on("onResourceStop", (resource) => {
		if (resource === GetCurrentResourceName()) zones.clear();
	});

// ../../../packages/lib/src/client/point.ts
	const log = createLogger(GetCurrentResourceName());
	const TARGET = "ox_target";
	const groups = /* @__PURE__ */ new Set();
	const byPrompt = /* @__PURE__ */ new Map();
	onPromptPressed((id) => byPrompt.get(id)?.press());
	const restyleAll = () => {
		for (const group of groups) group.restyle();
	};
	AddStateBagChangeHandler(CORE.interactionStateKey, "global", () => setTimeout(restyleAll, 0));
	for (const event of ["onClientResourceStart", "onClientResourceStop"]) on(event, (resource) => {
		if (resource === TARGET || resource === "ai-target") setTimeout(restyleAll, 0);
	});

// ../../../packages/lib/src/client/notify.ts
	const core$2 = resourceExport(CORE.resource);
	/** Shows a notification card on this player's screen (ai-core draws it); `text` is already translated. */
	function notify(text, kind = "info", duration) {
		core$2.Notify({
			text,
			kind,
			duration
		});
	}

// ../../../packages/lib/src/client/menu.ts
	const core$1 = resourceExport(CORE.resource);
	/** Menus and input dialogs this resource asked ai-core for, waiting for the player's answer. */
	var Requests = class {
		resource = GetCurrentResourceName();
		waiting = /* @__PURE__ */ new Map();
		hovers = /* @__PURE__ */ new Map();
		nextId = 0;
		constructor() {
			const answer = (owner, id, value) => {
				if (owner !== this.resource || typeof id !== "number") return;
				this.waiting.get(id)?.(value);
				this.waiting.delete(id);
				this.hovers.delete(id);
			};
			on(MENU_EVENTS.menuHover, (owner, id, item) => {
				if (owner === this.resource && typeof id === "number" && typeof item === "string") this.hovers.get(id)?.(item);
			});
			on(MENU_EVENTS.menuResult, answer);
			on(MENU_EVENTS.inputResult, answer);
		}
		ask(open, read, onHover) {
			const id = ++this.nextId;
			this.waiting.set(id, read);
			if (onHover) this.hovers.set(id, onHover);
			open(id);
		}
	};
	const requests = new Requests();
	/**
	* Shows ai-core's menu and resolves with the picked item id, or null when the player closed it; `onHover` hears the
	* item under the pointer or focus (live previews).
	*/
	function menu(request, onHover) {
		return new Promise((resolve) => requests.ask((id) => core$1.OpenMenu(id, request), (value) => resolve(typeof value === "string" ? value : null), onHover));
	}
	/** Shows ai-core's input dialog and resolves with the entered values by field name, or null when closed. */
	function input(request) {
		return new Promise((resolve) => requests.ask((id) => core$1.OpenInput(id, request), (value) => {
			if (typeof value !== "object" || value === null) return resolve(null);
			const out = {};
			for (const [k, v] of Object.entries(value)) if (typeof v === "string" || typeof v === "number") out[k] = v;
			resolve(out);
		}));
	}

// ../../../packages/lib/src/client/inventory.ts
	const core = resourceExport(CORE.resource);

// ../../../packages/lib/src/client/vehicleProps.ts
	const MOD_TYPES = Array.from({ length: 50 }, (_, i) => i);

// ../../../packages/lib/src/client/keybind.ts
	const resource = GetCurrentResourceName();
	/** Keybinds of this resource waiting for ai-core's answer (the panel's default key, else their own). */
	const waiting = /* @__PURE__ */ new Map();
	let listening = false;
	/** Asks ai-core's client for the default key (it knows the panel's keybind defaults); without ai-core the script's own. */
	function requestKey(info, apply) {
		if (resource !== CORE.resource && !isResourceStarted(CORE.resource)) return apply(info.defaultKey);
		if (!listening) {
			listening = true;
			on(KEYBIND.keyEvent, (owner, name, key) => {
				if (owner !== resource || typeof name !== "string" || typeof key !== "string") return;
				const done = waiting.get(name);
				waiting.delete(name);
				done?.(key);
			});
		}
		waiting.set(info.name, apply);
		emit(KEYBIND.announceEvent, info);
		setTimeout(() => {
			if (waiting.get(info.name) !== apply) return;
			waiting.delete(info.name);
			apply(info.defaultKey);
		}, 15e3);
	}
	/**
	* A key the player can rebind in GTA's settings (RegisterKeyMapping); no per-frame key polling. The default key
	* comes from ai-core's admin panel when set there: the mapping command carries the key (`+<name>_<key>`), so a new
	* default makes a new mapping that every player gets. It is registered once ai-core answered (at start).
	*/
	var Keybind = class {
		options;
		name;
		disabled;
		pressed = false;
		hash = 0;
		constructor(options) {
			this.options = options;
			this.name = options.name;
			this.disabled = options.disabled ?? false;
			requestKey({
				resource,
				name: options.name,
				description: options.description,
				defaultKey: options.defaultKey ?? "",
				mapper: options.defaultMapper ?? "keyboard"
			}, (key) => this.register(key.toUpperCase()));
		}
		register(key) {
			const command = key ? `${this.name}_${key}` : this.name;
			this.hash = GetHashKey(`+${command}`) | 2147483648;
			RegisterCommand(`+${command}`, () => this.press(true), false);
			RegisterCommand(`-${command}`, () => this.press(false), false);
			RegisterKeyMapping(`+${command}`, this.options.description, this.options.defaultMapper ?? "keyboard", key);
			setTimeout(() => {
				emit("chat:removeSuggestion", `/+${command}`);
				emit("chat:removeSuggestion", `/-${command}`);
			}, 500);
		}
		press(down) {
			if (this.disabled || !this.options.allowInPauseMenu && IsPauseMenuActive()) return;
			this.pressed = down;
			if (down) this.options.onPressed?.();
			else this.options.onReleased?.();
		}
		/** Whether the key is held now. */
		get isPressed() {
			return this.pressed;
		}
		/** The key the player has bound right now, for HUD hints ("" until the mapping is registered). */
		get currentKey() {
			return this.hash ? GetControlInstructionalButton(0, this.hash, true).substring(2) : "";
		}
		disable(disabled) {
			this.disabled = disabled;
			this.pressed = false;
		}
	};

// ../../../packages/lib/src/fivem/locale.ts
/** Convar holding the language (`setr ai:locale "en"` in misc.cfg); replicated so clients read it too. */
	const LOCALE_CONVAR = "ai:locale";
	function readLocaleFile(resource, lang) {
		const raw = LoadResourceFile(resource, `locales/${lang}.json`);
		if (!raw) return {};
		const parsed = JSON.parse(raw);
		if (!isRecord(parsed)) return {};
		const texts = {};
		for (const [key, value] of Object.entries(parsed)) if (typeof value === "string") texts[key] = value;
		return texts;
	}
	/**
	* The resource's lang texts: `locales/en.json` (complete base) overlaid with `locales/<ai:locale>.json`.
	* `${OTHER_KEY}` inside a text is replaced by that text once at load. Returns `t(key, ...args)` filling
	* `{0}`, `{1}`...; a missing key returns the key itself so it is visible in game.
	*
	*   const t = createLocale<typeof import("../../locales/en.json")>();
	*   t("NOTIFY_NO_MONEY", price);
	*/
	function createLocale() {
		const texts = loadLocaleTexts();
		return (key, ...args) => formatText(texts[key] ?? key, args);
	}
	/**
	* The resource's merged lang table (`en.json` overlaid with the `ai:locale` language, `${KEY}` references
	* resolved). A NUI gets this once and fills `{0}` placeholders itself.
	*/
	function loadLocaleTexts(resource = GetCurrentResourceName()) {
		const lang = GetConvar(LOCALE_CONVAR, "en");
		const texts = {
			...readLocaleFile(resource, "en"),
			...lang === "en" ? {} : readLocaleFile(resource, lang)
		};
		for (const key of Object.keys(texts)) texts[key] = (texts[key] ?? "").replace(/\$\{([A-Z0-9_]+)\}/g, (match, ref) => texts[ref] ?? match);
		return texts;
	}

// resource/common/locale.ts
/** This resource's lang texts: `Locale("NOTIFY_NO_MONEY", price)`; keys typed from locales/en.json. */
	const Locale = createLocale();

// resource/common/resource.ts
	const ResourceName = GetCurrentResourceName();
	const ResourceContext = IsDuplicityVersion() ? "server" : "client";

// resource/common/admin.ts
/** ai-admin's contracts and panel content. No natives. */
	const EVENTS = {
		/** Callback: () -> boolean whether the caller is an admin (the quick menu opens only then). */
		access: "ai-admin:access",
		/** Callback: (on: boolean) -> { ok, error? } noclip on (admins) or off (always allowed: a rank taken away mid-flight). */
		noclip: "ai-admin:noclip",
		/** Callback: () -> PlayerEntry[] everyone online, for the menu's player list (admins). */
		players: "ai-admin:players",
		/** Callback: (action: MenuAction, target: number | null, value: string | null) -> { ok, error? } (admins). */
		action: "ai-admin:action",
		/** Server -> admin: () toggle noclip (the /noclip command, checked on the server). */
		toggleNoclip: "ai-admin:client:toggleNoclip",
		/** Server -> player: (point: TeleportPoint | null) move there; no `z` = onto the ground; null = to the waypoint. */
		teleport: "ai-admin:client:teleport",
		/** Server -> admin: () open the quick menu (the /adminmenu command). */
		openMenu: "ai-admin:client:openMenu",
		/** Server -> admin: () print and show the position (the /coords command). */
		coords: "ai-admin:client:coords",
		/** Server -> client callback: (model) -> CreateVehicleServerSetter type, or null when the model is not a vehicle. */
		vehicleType: "ai-admin:vehicleType"
	};
	/** A teleport target from the server: null (waypoint), a point, or undefined when the value is not one. */
	function toTeleportPoint(v) {
		if (v == null) return null;
		const p = record(v);
		if (typeof p.x !== "number" || typeof p.y !== "number" || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return void 0;
		return typeof p.z === "number" && Number.isFinite(p.z) ? {
			x: p.x,
			y: p.y,
			z: p.z
		} : {
			x: p.x,
			y: p.y
		};
	}
	function toPlayerEntries(v) {
		if (!Array.isArray(v)) return [];
		const out = [];
		for (const raw of v) {
			const p = record(raw);
			if (typeof p.id === "number" && Number.isInteger(p.id)) out.push({
				id: p.id,
				name: str(p.name, String(p.id), 64)
			});
		}
		return out;
	}
	const KINDS = [
		"info",
		"success",
		"warning",
		"error"
	];
	function readSettings(raw) {
		const s = record(raw);
		const kind = KINDS.find((k) => k === s.announceKind) ?? "warning";
		return {
			noclipSpeed: num(s.noclipSpeed, 1, .1, 50),
			noclipMaxSpeed: num(s.noclipMaxSpeed, 16, 1, 100),
			noclipStep: num(s.noclipStep, .5, .1, 10),
			noclipFast: num(s.noclipFast, 2, 1, 20),
			noclipFaster: num(s.noclipFaster, 4, 1, 50),
			noclipSlow: num(s.noclipSlow, .05, .01, 1),
			announceKind: kind,
			announceSeconds: int(s.announceSeconds, 10, 2, 60)
		};
	}

// resource/client/teleport.ts
/** GTA's waypoint blip sprite. */
	const WAYPOINT_SPRITE = 8;
	/** Heights tried for the ground under a point, bottom to top. */
	const PROBE_STEP = 25;
	const PROBE_TOP = 1e3;
	/** The waypoint on the map (x, y), or null. */
	function waypoint() {
		const blip = GetFirstBlipInfoId(WAYPOINT_SPRITE);
		if (!DoesBlipExist(blip)) return null;
		const [x = 0, y = 0] = GetBlipInfoIdCoord(blip);
		return [x, y];
	}
	/**
	* Puts the player (with the vehicle they drive) at (x, y, z), behind a fade. Without `z` the player lands on the
	* ground: the area is streamed by standing at rising heights until the game knows the ground there.
	*/
	async function teleportTo(x, y, z) {
		const ped = cache.ped;
		DoScreenFadeOut(250);
		await sleep(300);
		FreezeEntityPosition(ped, true);
		if (z !== void 0) {
			SetPedCoordsKeepVehicle(ped, x, y, z);
			RequestCollisionAtCoord(x, y, z);
			await waitFor(() => HasCollisionLoadedAroundEntity(ped) || void 0, 3e3).catch(() => false);
		} else {
			let ground = null;
			for (let height = 0; height <= PROBE_TOP && ground === null; height += PROBE_STEP) {
				SetPedCoordsKeepVehicle(ped, x, y, height);
				RequestCollisionAtCoord(x, y, height);
				await sleep(50);
				const [found, groundZ] = GetGroundZFor_3dCoord(x, y, height, false);
				if (found) ground = groundZ;
			}
			SetPedCoordsKeepVehicle(ped, x, y, (ground ?? 0) + 1);
		}
		FreezeEntityPosition(ped, false);
		DoScreenFadeIn(400);
	}

// resource/client/noclip.ts
/**
	* Noclip: a camera on the entity (the vehicle when driving), the mouse turns it, the entity is moved by offsets,
	* frozen, without collision, invisible to others and seen faintly by the player. Speeds come from the panel.
	*/
	const MIN_PITCH = -89;
	const MAX_PITCH = 89;
	const MOVE_FORWARDS = 32;
	const MOVE_BACKWARDS = 33;
	const MOVE_LEFT = 34;
	const MOVE_RIGHT = 35;
	const MOVE_UP = 44;
	const MOVE_DOWN = 46;
	const SPEED_DECREASE = 14;
	const SPEED_INCREASE = 15;
	const SPEED_RESET = 348;
	const SPEED_SLOW = 36;
	const SPEED_FAST = 21;
	const SPEED_FASTER = 19;
	const TO_GROUND = 22;
	const SWITCH_VIEW = 236;
	const LOOK_X = 220;
	const LOOK_Y = 221;
	const pressed = (group, control) => IsControlPressed(group, control) || IsDisabledControlPressed(group, control);
	var Noclip = class {
		settings;
		active = false;
		ped = 0;
		entity = 0;
		inVehicle = false;
		firstPerson = false;
		speed = 1;
		camera = 0;
		frame = null;
		landing = null;
		/** Panel values, read once per start (not per frame). */
		config;
		constructor(settings) {
			this.settings = settings;
			this.config = settings();
		}
		get on() {
			return this.active;
		}
		start() {
			if (this.active) return;
			this.active = true;
			this.config = this.settings();
			this.speed = this.config.noclipSpeed;
			this.ped = cache.ped;
			const vehicle = GetVehiclePedIsIn(this.ped, false);
			this.inVehicle = vehicle !== 0 && GetPedInVehicleSeat(vehicle, -1) === this.ped;
			this.entity = this.inVehicle ? vehicle : this.ped;
			if (this.inVehicle) SetVehicleEngineOn(this.entity, false, true, true);
			else ClearPedTasksImmediately(this.ped);
			this.stopLanding();
			this.setupCamera();
			PlaySoundFromEntity(-1, "SELECT", this.ped, "HUD_LIQUOR_STORE_SOUNDSET", false, 0);
			SetUserRadioControlEnabled(false);
			this.frame = setTick(() => this.step());
		}
		/** Back on the ground; `landed` runs once the ped (or vehicle) stopped falling. */
		stop(landed) {
			if (!this.active) return;
			this.active = false;
			if (this.frame !== null) clearTick(this.frame);
			this.frame = null;
			this.destroyCamera();
			PlaySoundFromEntity(-1, "CANCEL", this.ped, "HUD_LIQUOR_STORE_SOUNDSET", false, 0);
			SetUserRadioControlEnabled(true);
			if (this.inVehicle) SetVehicleEngineOn(this.entity, true, true, false);
			this.release();
			this.toGround();
			const entity = this.entity;
			const vehicle = this.inVehicle;
			this.landing = setInterval(() => {
				if (!(vehicle ? IsVehicleOnAllWheels(entity) : !IsPedFalling(entity) && !IsPedRagdoll(entity)) && DoesEntityExist(entity)) return;
				this.stopLanding();
				SetEntityInvincible(entity, false);
				landed();
			}, 100);
		}
		/** Resource stop or a teleport: everything back right away. */
		reset() {
			if (this.frame !== null) clearTick(this.frame);
			this.frame = null;
			if (this.active) this.destroyCamera();
			this.active = false;
			this.stopLanding();
			if (this.entity) {
				this.release();
				SetEntityInvincible(this.entity, false);
			}
			SetUserRadioControlEnabled(true);
		}
		release() {
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
		stopLanding() {
			if (this.landing !== null) clearInterval(this.landing);
			this.landing = null;
		}
		attachCamera() {
			if (this.inVehicle) {
				this.firstPerson = false;
				AttachCamToEntity(this.camera, this.entity, 0, -4.5, 2, true);
			} else if (this.firstPerson) AttachCamToEntity(this.camera, this.entity, 0, 0, 1, true);
			else AttachCamToEntity(this.camera, this.entity, 0, -2, 1, true);
		}
		setupCamera() {
			const [x = 0, y = 0, z = 0] = GetEntityCoords(this.entity, false);
			const [, , heading = 0] = GetEntityRotation(this.entity, 2);
			this.camera = CreateCamWithParams("DEFAULT_SCRIPTED_CAMERA", x, y, z, 0, 0, heading, 75, false, 0);
			SetCamActive(this.camera, true);
			RenderScriptCams(true, true, 1e3, false, false);
			this.attachCamera();
		}
		destroyCamera() {
			SetGameplayCamRelativeHeading(0);
			RenderScriptCams(false, true, 1e3, true, true);
			DetachEntity(this.entity, true, true);
			SetCamActive(this.camera, false);
			DestroyCam(this.camera, true);
			this.camera = 0;
		}
		rotate() {
			const [pitch = 0, roll = 0, yaw = 0] = GetCamRot(this.camera, 2);
			const nextPitch = pitch + GetControlNormal(0, LOOK_Y) * -5;
			const nextYaw = yaw + GetControlNormal(0, LOOK_X) * -10;
			if (nextPitch > MIN_PITCH && nextPitch < MAX_PITCH) SetCamRot(this.camera, nextPitch, roll, nextYaw, 2);
			SetEntityHeading(this.entity, Math.max(0, (yaw % 360 + 360) % 360));
		}
		move(x, y, z) {
			const [nx = 0, ny = 0, nz = 0] = GetOffsetFromEntityInWorldCoords(this.entity, x, y, z);
			SetEntityCoordsNoOffset(this.entity, nx, ny, nz, false, false, false);
		}
		/** Puts the entity on the ground under it (Space while flying, and when noclip ends: no hanging in the air). */
		toGround() {
			const [x = 0, y = 0, z = 0] = GetEntityCoords(this.entity, false);
			RequestCollisionAtCoord(x, y, z);
			const ray = StartShapeTestRay(x, y, z, x, y, -1e4, 1, this.entity, 0);
			const [, hit, coords] = GetShapeTestResult(ray);
			const [found, groundZ] = GetGroundZFor_3dCoord(x, y, z, false);
			const ground = hit ? coords[2] ?? z : found ? groundZ : null;
			if (ground === null) return;
			SetEntityCoords(this.entity, x, y, ground, false, false, false, false);
			if (this.inVehicle) SetVehicleOnGroundProperly(this.entity);
		}
		step() {
			const c = this.config;
			this.rotate();
			if (!IsPauseMenuActive()) {
				HudWeaponWheelIgnoreSelection();
				DisableAllControlActions(0);
				DisableAllControlActions(1);
				DisableAllControlActions(2);
				EnableControlAction(0, LOOK_X, true);
				EnableControlAction(0, LOOK_Y, true);
				EnableControlAction(0, 245, true);
			}
			if (IsDisabledControlJustPressed(0, SWITCH_VIEW)) {
				this.firstPerson = !this.firstPerson;
				this.attachCamera();
			}
			if (pressed(2, SPEED_DECREASE)) this.speed = Math.max(c.noclipStep, this.speed - c.noclipStep);
			else if (pressed(2, SPEED_INCREASE)) this.speed = Math.min(c.noclipMaxSpeed, this.speed + c.noclipStep);
			else if (IsDisabledControlJustReleased(0, SPEED_RESET)) this.speed = c.noclipSpeed;
			if (IsDisabledControlJustPressed(0, TO_GROUND)) this.toGround();
			const multi = pressed(0, SPEED_FAST) ? c.noclipFast : pressed(0, SPEED_FASTER) ? c.noclipFaster : pressed(0, SPEED_SLOW) ? c.noclipSlow : 1;
			const step = .5 * this.speed * multi;
			const [pitch = 0] = GetCamRot(this.camera, 2);
			const climb = pitch * (this.speed / 2 * multi) / 89;
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
	};

// resource/client/tools.ts
	const world = new AdminWorld(["settings"]);
	const texts = loadLocaleTexts();
	const noclip = new Noclip(() => readSettings(world.get("settings")));
	/** null for an `{ ok: true }` answer, else the error text to show. */
	function failure(result) {
		if (isRecord(result) && result.ok === true) return null;
		const key = isRecord(result) && typeof result.error === "string" ? result.error : "ERR_NOT_ALLOWED";
		return texts[key] ?? key;
	}
	const reportNoclip = (on) => triggerServerCallback(EVENTS.noclip, [on]).catch(() => null);
	/** Noclip on asks the server first (admins only); off is always allowed and reported once the player landed. */
	async function setNoclip(on) {
		if (!on) {
			noclip.stop(() => void reportNoclip(false));
			notify(Locale("NOTIFY_NOCLIP_OFF"), "info");
			return;
		}
		const error = failure(await reportNoclip(true));
		if (error) return notify(error, "error");
		noclip.start();
		notify(Locale("NOTIFY_NOCLIP_ON"), "success");
	}
	/** A teleport the server approved: to a point, or (null) to the waypoint. Noclip ends first. */
	async function teleport(point) {
		if (noclip.on) {
			noclip.reset();
			reportNoclip(false);
		}
		if (point) return teleportTo(point.x, point.y, point.z);
		const target = waypoint();
		if (!target) return notify(Locale("ERR_NO_WAYPOINT"), "error");
		await teleportTo(target[0], target[1]);
	}

// resource/client/menu.ts
/** Asks the server to run an action (it checks the admin again and logs); only failures are shown here. */
	async function run(action, target = null, value = null) {
		const error = failure(await triggerServerCallback(EVENTS.action, [
			action,
			target,
			value
		]).catch(() => null));
		if (error) notify(error, "error");
	}
	async function spawnVehicle() {
		const model = (await input({
			title: Locale("CAR_TITLE"),
			confirm: Locale("CAR_CONFIRM"),
			fields: [{
				name: "model",
				label: Locale("CAR_MODEL"),
				type: "text",
				maxLength: 32,
				placeholder: "adder"
			}]
		}))?.model;
		if (typeof model === "string" && model.trim()) await run("car", null, model.trim());
	}
	const PLAYER_ACTIONS = [
		{
			id: "goto",
			icon: "location-dot",
			label: "MENU_GOTO"
		},
		{
			id: "bring",
			icon: "hand-pointer",
			label: "MENU_BRING"
		},
		{
			id: "heal",
			icon: "heart-pulse",
			label: "MENU_HEAL"
		},
		{
			id: "revive",
			icon: "user",
			label: "MENU_REVIVE"
		}
	];
	/** Everyone online (asked when the list opens), then what to do with the picked player. */
	async function playerMenu() {
		const players = toPlayerEntries(await triggerServerCallback(EVENTS.players).catch(() => null));
		const picked = await menu({
			title: Locale("MENU_PLAYERS"),
			items: players.map((p) => ({
				id: String(p.id),
				label: Locale("MENU_PLAYER", p.id, p.name),
				icon: "user"
			}))
		});
		const player = players.find((p) => String(p.id) === picked);
		if (!player) return;
		const action = await menu({
			title: Locale("MENU_PLAYER", player.id, player.name),
			items: PLAYER_ACTIONS.map((a) => ({
				id: a.id,
				label: Locale(a.label),
				icon: a.icon
			}))
		});
		const chosen = PLAYER_ACTIONS.find((a) => a.id === action);
		if (chosen) await run(chosen.id, player.id);
	}
	/** The quick admin menu (F9 or /adminmenu); opens only when the server says the player is an admin. */
	async function openMenu() {
		if (await triggerServerCallback(EVENTS.access).catch(() => false) !== true) return;
		const picked = await menu({
			title: Locale("MENU_TITLE"),
			items: [
				{
					id: "noclip",
					label: Locale(noclip.on ? "MENU_NOCLIP_OFF" : "MENU_NOCLIP_ON"),
					icon: "eye"
				},
				{
					id: "tpm",
					label: Locale("MENU_TPM"),
					icon: "map-location-dot",
					disabled: waypoint() === null
				},
				{
					id: "heal",
					label: Locale("MENU_HEAL_SELF"),
					icon: "heart-pulse"
				},
				{
					id: "revive",
					label: Locale("MENU_REVIVE_SELF"),
					icon: "user"
				},
				{
					id: "car",
					label: Locale("MENU_CAR"),
					icon: "car"
				},
				{
					id: "dv",
					label: Locale("MENU_DV"),
					icon: "car-rear"
				},
				{
					id: "players",
					label: Locale("MENU_PLAYERS"),
					icon: "users"
				},
				{
					id: "panel",
					label: Locale("MENU_PANEL"),
					icon: "sliders"
				}
			]
		});
		switch (picked) {
			case "noclip": return setNoclip(!noclip.on);
			case "car": return spawnVehicle();
			case "players": return playerMenu();
			case "tpm":
			case "heal":
			case "revive":
			case "dv":
			case "panel": return run(picked);
		}
	}

// resource/client/index.ts
	onServerEvent(EVENTS.teleport, { args: ([p]) => {
		const point = toTeleportPoint(p);
		return point === void 0 ? null : [point];
	} }, (point) => void teleport(point));
	onServerEvent(EVENTS.toggleNoclip, () => void setNoclip(!noclip.on));
	onServerEvent(EVENTS.openMenu, () => void openMenu());
	onServerEvent(EVENTS.coords, () => {
		const [x = 0, y = 0, z = 0] = GetEntityCoords(cache.ped, false);
		const f = (n) => n.toFixed(2);
		const text = `vector4(${f(x)}, ${f(y)}, ${f(z)}, ${f(GetEntityHeading(cache.ped))})`;
		console.log(text);
		notify(Locale("NOTIFY_COORDS", text), "info", 15e3);
	});
	/** The server asks which spawn type a model is; null when the game has no such vehicle. */
	onServerCallback(EVENTS.vehicleType, (model) => {
		if (typeof model !== "string") return null;
		const hash = GetHashKey(model);
		return IsModelInCdimage(hash) && IsModelAVehicle(hash) ? vehicleTypeOfClass(GetVehicleClassFromName(hash)) : null;
	});
	new Keybind({
		name: "admin_menu",
		description: Locale("KEYBIND_MENU"),
		defaultKey: "F9",
		onPressed: () => void openMenu()
	});
	new Keybind({
		name: "admin_noclip",
		description: Locale("KEYBIND_NOCLIP"),
		onPressed: () => void setNoclip(!noclip.on)
	});
	on("onResourceStop", (resource) => {
		if (resource === ResourceName) noclip.reset();
	});

})();
}catch(e){globalThis.__aicoreReportError&&globalThis.__aicoreReportError("load: "+(e&&e.stack||e));throw e}
