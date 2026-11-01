exports = globalThis.exports;
let node_fs_promises = require("node:fs/promises");
// ../../../packages/lib/src/server/rateLimit.ts
var SourceLock = class {
	active = new Set();
	async run(source, busy, task) {
		if (this.active.has(source)) return busy;
		this.active.add(source);
		try {
			return await task();
		} finally {
			this.active.delete(source);
		}
	}
	release(source) {
		this.active.delete(source);
	}
}, RateLimit = class {
	count;
	windowMs;
	hits = new Map();
	constructor(count, windowMs) {
		this.count = count, this.windowMs = windowMs;
	}
	take(source) {
		let now = GetGameTimer(), recent = (this.hits.get(source) ?? []).filter((at) => now - at < this.windowMs);
		return recent.length >= this.count ? (this.hits.set(source, recent), !1) : (recent.push(now), this.hits.set(source, recent), !0);
	}
	release(source) {
		this.hits.delete(source);
	}
};
// ../../../packages/lib/src/shared/wait.ts
function waitFor(check, timeoutMs = 1e4, intervalMs = 0) {
	return new Promise((resolve, reject) => {
		let started = Date.now(), poll = () => {
			let value = check();
			if (value !== void 0) return resolve(value);
			if (timeoutMs !== !1 && Date.now() - started > timeoutMs) return reject(Error(`waitFor timed out after ${timeoutMs} ms`));
			setTimeout(poll, intervalMs);
		};
		poll();
	});
}
// ../../../packages/lib/src/shared/read.ts
function num(value, fallback, min = -Infinity, max = Infinity) {
	return typeof value == "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}
function int(value, fallback, min = -Infinity, max = Infinity) {
	return Math.round(num(value, fallback, min, max));
}
function bool(value, fallback) {
	return typeof value == "boolean" ? value : fallback;
}
function str(value, fallback, max = 64) {
	return typeof value == "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}
function record(value) {
	return typeof value == "object" && value && !Array.isArray(value) ? value : {};
}
// ../../../packages/lib/src/shared/strict.ts
function readInt(value, min, max) {
	return Number.isInteger(value) && value >= min && value <= max ? value : null;
}
const readId = (value) => readInt(value, 1, 2147483647);
function readText(value, max) {
	if (typeof value != "string") return null;
	let text = value.trim();
	return text ? text.slice(0, max) : null;
}
// ../../../packages/lib/src/shared/action.ts
const fail = (error) => ({
	ok: !1,
	error
}), isPublic = (rule) => rule.jobs.length === 0 && rule.gangs.length === 0, isObject = (value) => typeof value == "object" && !!value && !Array.isArray(value);
function readRecords(raw, readOne) {
	let out = new Map();
	if (!isObject(raw)) return out;
	for (let key in raw) {
		let value = raw[key];
		if (!isObject(value)) continue;
		let parsed = readOne(key, value);
		parsed !== null && out.set(key, parsed);
	}
	return out;
}
var FileViews = class {
	read;
	updaters = new Map();
	constructor(read) {
		this.read = read;
	}
	view(file, parse) {
		let box = { value: parse(this.read(file)) };
		return this.on(file, () => box.value = parse(this.read(file))), box;
	}
	records(file, readOne) {
		let live = new LiveRecords(readOne);
		return live.reset(this.read(file)), this.on(file, (key, value) => live.update(key, value, this.read(file))), live.map;
	}
	changed(file, key, value) {
		for (let update of this.updaters.get(file) ?? []) update(key, value);
	}
	on(file, update) {
		let list = this.updaters.get(file);
		list ? list.push(update) : this.updaters.set(file, [update]);
	}
}, LiveRecords = class {
	readOne;
	map = new Map();
	constructor(readOne) {
		this.readOne = readOne;
	}
	reset(raw) {
		this.map.clear();
		for (let [key, value] of readRecords(raw, this.readOne)) this.map.set(key, value);
	}
	update(key, value, whole) {
		if (key === void 0) return this.reset(whole);
		let parsed = isObject(value) ? this.readOne(key, value) : null;
		parsed === null ? this.map.delete(key) : this.map.set(key, parsed);
	}
};
// ../../../packages/lib/src/shared/lang.ts
function formatText(template, args) {
	return template.replace(/\{(\d+)\}/g, (match, index) => {
		let value = args[Number(index)];
		return value === void 0 ? match : String(value);
	});
}
// ../../../packages/lib/src/shared/index.ts
function isRecord(value) {
	return typeof value == "object" && !!value && !Array.isArray(value);
}
function logSafe(text, max) {
	return text.replace(/\r?\n/g, " | ").replace(/[\u0000-\u001f\u007f]/g, "").replace(/\^\d/g, "").slice(0, max);
}
function previewJson(value, max) {
	let out = "", walk = (v, depth) => {
		if (out.length >= max) return;
		if (typeof v == "string") {
			out += JSON.stringify(v.length > max ? v.slice(0, max) : v);
			return;
		}
		if (typeof v != "object" || !v) {
			out += String(v);
			return;
		}
		if (depth > 4) {
			out += Array.isArray(v) ? "[...]" : "{...}";
			return;
		}
		if (Array.isArray(v)) {
			out += "[";
			for (let i = 0; i < v.length && out.length < max; i++) i > 0 && (out += ","), walk(v[i], depth + 1);
			out += "]";
			return;
		}
		out += "{";
		let first = !0;
		for (let key in v) {
			if (out.length >= max) break;
			first || (out += ","), first = !1, out += `${JSON.stringify(key.slice(0, 50))}:`, walk(v[key], depth + 1);
		}
		out += "}";
	};
	return walk(value, 0), out.slice(0, max);
}
function createLogger(resource) {
	let prefix = `[${resource}]`;
	return {
		info: (message, ...details) => console.log(`${prefix} ${message}`, ...details),
		warn: (message, ...details) => console.warn(`${prefix} ^3${message}^7`, ...details),
		error: (message, ...details) => console.error(`${prefix} ^1${message}^7`, ...details)
	};
}
function withoutSchemaKey(value) {
	if (!isRecord(value) || !("$schema" in value)) return value;
	let { $schema: _schema, ...rest } = value;
	return rest;
}
var DataFile = class {
	resource;
	name;
	log;
	writes = Promise.resolve();
	pending = void 0;
	timer = null;
	schemaRef = null;
	constructor(resource, name, log) {
		this.resource = resource, this.name = name, this.log = log;
	}
	hasSchemaRef() {
		return (LoadResourceFile(this.resource, this.path) ?? "").includes("\"$schema\"");
	}
	read() {
		for (let path of [this.path, `${this.path}.bak`]) {
			let raw = LoadResourceFile(this.resource, path);
			if (raw) try {
				return withoutSchemaKey(JSON.parse(raw));
			} catch (error) {
				this.log.error(`${this.resource}/${path} is not valid JSON${path === this.path ? ", trying the backup" : ""}`, error);
			}
		}
		return null;
	}
	write(value) {
		this.pending = value, this.timer ||= setTimeout(() => {
			this.timer = null;
			let data = this.schemaRef && isRecord(this.pending) ? {
				$schema: this.schemaRef,
				...this.pending
			} : this.pending, text = `${JSON.stringify(data, null, 2)}\n`;
			this.writes = this.writes.then(() => this.flush(text)).catch((error) => this.log.error(`saving ${this.resource}/${this.path} failed`, error));
		}, 250);
	}
	get path() {
		return `data/${this.name}.json`;
	}
	async flush(text) {
		let file = `${GetResourcePath(this.resource)}/${this.path}`;
		await (0, node_fs_promises.mkdir)(file.slice(0, file.lastIndexOf("/")), { recursive: !0 }), await (0, node_fs_promises.writeFile)(`${file}.tmp`, text, "utf8"), await (0, node_fs_promises.copyFile)(file, `${file}.bak`).catch(() => void 0), await (0, node_fs_promises.rename)(`${file}.tmp`, file);
	}
};
// ../../../packages/shared/src/core.ts
const CORE = {
	resource: "ai-core",
	clientErrorEvent: "ai-core:clientError",
	playerLoadedEvent: "ai-core:playerLoaded",
	playerSpawnedEvent: "ai-core:playerSpawned",
	playerUnloadedEvent: "ai-core:playerUnloaded",
	moneyChangedEvent: "ai-core:moneyChanged",
	jobsChangedEvent: "ai-core:jobsChanged",
	dutyChangedEvent: "ai-core:dutyChanged",
	gangsChangedEvent: "ai-core:gangsChanged",
	activeGangChangedEvent: "ai-core:activeGangChanged",
	metaChangedEvent: "ai-core:metaChanged",
	definitionsChangedEvent: "ai-core:definitionsChanged",
	characterDeletedEvent: "ai-core:characterDeleted",
	runtimeJobPrefix: "ai:jobdef:",
	runtimeGangPrefix: "ai:gangdef:",
	characterScreenEvent: "ai-core:characterScreen",
	inventoryChangedEvent: "ai-core:inventoryChanged",
	itemUsedEvent: "ai-core:itemUsed",
	playerDiedEvent: "ai-core:playerDied",
	clientPlayerLoadedEvent: "ai-core:client:playerLoaded",
	clientPlayerUnloadedEvent: "ai-core:client:playerUnloaded",
	clientCharacterPortraitEvent: "ai-core:client:characterPortrait",
	characterLooksEvent: "ai-core:client:characterLooks",
	clientCacheEvent: "ai-core:client:cache",
	clientHudVisibleEvent: "ai-core:client:hudVisible",
	clientWorldSyncEvent: "ai-core:client:worldSync",
	clientDefinitionsEvent: "ai-core:client:definitions",
	vehicleTypeCallback: "ai-core:vehicleType",
	interactionStateKey: "ai:interaction",
	pvpStateKey: "ai:pvp",
	medicalStateKey: "ai:medical",
	clientDeadEvent: "ai-core:client:dead",
	mdtStateKey: "ai:mdt",
	billsEvent: "ai-core:client:bills",
	payBillCallback: "ai-core:payBill",
	clientSeatbeltEvent: "ai-core:client:seatbelt",
	stressRelayEvent: "ai-core:client:stress",
	notifyStateKey: "ai:notify",
	charactersCallback: "ai-core:characters",
	createCharacterCallback: "ai-core:createCharacter",
	deleteCharacterCallback: "ai-core:deleteCharacter",
	selectCharacterCallback: "ai-core:selectCharacter",
	spawnEvent: "ai-core:client:spawn",
	chooseSpawnEvent: "ai-core:client:chooseSpawn",
	spawnChoiceCallback: "ai-core:spawnChoice",
	openCharactersEvent: "ai-core:client:openCharacters",
	characterScreenKey: "ai:characterScreen",
	externalLoadedEvent: "ai-core:client:externalLoaded",
	externalSpawnedEvent: "ai-core:externalSpawned",
	externalLogoutEvent: "ai-core:client:externalLogout"
}, ADMIN = {
	ace: "ai.admin",
	openCallback: "ai-core:admin:open",
	panelDataCallback: "ai-core:admin:panelData",
	applyCallback: "ai-core:admin:apply",
	closeEvent: "ai-core:admin:close",
	showEvent: "ai-core:admin:show",
	deltaEvent: "ai-core:admin:delta",
	recommendationEvent: "ai-core:admin:recommendation",
	worldEvent: (resource) => `${resource}:admin:world`,
	worldChangesCallback: (resource) => `${resource}:admin:worldChanges`
}, VEHICLE_BAGS = {
	owned: "ai:owned",
	id: "ai:vid",
	props: "ai:props",
	setup: "ai:setup",
	fuel: "fuel"
}, WEATHERS = [
	"EXTRASUNNY",
	"CLEAR",
	"NEUTRAL",
	"SMOG",
	"FOGGY",
	"OVERCAST",
	"CLOUDS",
	"CLEARING",
	"RAIN",
	"THUNDER",
	"SNOW",
	"BLIZZARD",
	"SNOWLIGHT",
	"XMAS",
	"HALLOWEEN"
], WEATHER_SET = new Set(WEATHERS), isWeather = (value) => typeof value == "string" && WEATHER_SET.has(value), LIB_UI = {
	resource: "ai-lib",
	notifyEvent: "ai-lib:client:notify",
	promptPressedEvent: "ai-lib:client:promptPressed",
	cancelProgressEvent: "ai-lib:client:cancelProgress",
	progressForCallback: "ai-lib:progressFor",
	progressForCancelEvent: "ai-lib:client:progressForCancel",
	minigameForCallback: "ai-lib:minigameFor",
	zoneEvent: "ai-lib:client:zone",
	modelPointEvent: "ai-lib:client:modelPoint"
}, named = new Set();
function registerExport(name, handler) {
	named.add(name), globalThis.exports(name, handler);
	let first = name.charAt(0), twin = (first === first.toUpperCase() ? first.toLowerCase() : first.toUpperCase()) + name.slice(1);
	twin !== name && !named.has(twin) && globalThis.exports(twin, handler);
}
function resourceExport(resource) {
	return globalThis.exports[resource];
}
function isResourceStarted(resource) {
	return GetResourceState(resource) === "started";
}
function optionalExport(resource) {
	return isResourceStarted(resource) ? globalThis.exports[resource] : null;
}
function readLocaleFile(resource, lang) {
	let raw = LoadResourceFile(resource, `locales/${lang}.json`);
	if (!raw) return {};
	let parsed = JSON.parse(raw);
	if (!isRecord(parsed)) return {};
	let texts = {};
	for (let [key, value] of Object.entries(parsed)) typeof value == "string" && (texts[key] = value);
	return texts;
}
function createLocale() {
	let texts = loadLocaleTexts();
	return (key, ...args) => formatText(texts[key] ?? key, args);
}
function loadLocaleTexts(resource = GetCurrentResourceName()) {
	let lang = GetConvar("ai:locale", "en"), texts = {
		...readLocaleFile(resource, "en"),
		...lang === "en" ? {} : readLocaleFile(resource, lang)
	};
	for (let key of Object.keys(texts)) texts[key] = (texts[key] ?? "").replace(/\$\{([A-Z0-9_]+)\}/g, (match, ref) => texts[ref] ?? match);
	return texts;
}
// ../../../packages/lib/src/fivem/callbackNames.ts
const requestEvent = (name) => `aicore:cb:${name}`, responseEvent = (resource) => `aicore:cbr:${resource}`;
// ../../../packages/lib/src/server/position.ts
function entityCoords(entity) {
	let [x = 0, y = 0, z = 0] = GetEntityCoords(entity);
	return {
		x,
		y,
		z
	};
}
const coordsOf = (source) => entityCoords(GetPlayerPed(String(source)));
function vehicleOf(source, options = {}) {
	let ped = GetPlayerPed(String(source)), vehicle = GetVehiclePedIsIn(ped, !1);
	return !vehicle || !options.driver || GetPedInVehicleSeat(vehicle, -1) === ped ? vehicle : 0;
}
resourceExport(CORE.resource);
const log$8 = createLogger(GetCurrentResourceName()), isAdmin$1 = (ace = ADMIN.ace) => (source) => !!IsPlayerAceAllowed(String(source), ace) || `not allowed (${ace})`, gates = new Set();
on("playerDropped", () => {
	let source = Number(globalThis.source);
	for (let gate of gates) gate.release(source);
});
var ClientGate = class {
	name;
	options;
	limit;
	lock;
	refusals = new Map();
	constructor(name, options, defaultRate) {
		this.name = name, this.options = options, this.limit = new RateLimit(options.rate?.count ?? defaultRate, options.rate?.windowMs ?? 1e3), this.lock = options.lock ? new SourceLock() : null, gates.add(this);
	}
	check(source, raw) {
		if (!(source > 0) || !GetPlayerName(String(source))) return null;
		if (!this.limit.take(source)) return this.refuse(source, "rate limit"), null;
		for (let guard of this.options.guards ?? []) {
			let verdict = guard(source);
			if (verdict !== !0) return typeof verdict == "string" && this.refuse(source, verdict), null;
		}
		if (!this.options.args) return [];
		let args = this.options.args(raw);
		return args === null && this.refuse(source, () => `invalid arguments ${logSafe(previewJson(raw, 200), 200)}`), args;
	}
	run(source, busy, task) {
		return this.lock ? this.lock.run(source, busy, async () => task()) : Promise.resolve(task());
	}
	release(source) {
		this.limit.release(source), this.lock?.release(source), this.refusals.delete(source);
	}
	refuse(source, reason) {
		let now = GetGameTimer(), last = this.refusals.get(source);
		if (last && now - last.at < 1e4) {
			last.skipped++;
			return;
		}
		let more = last?.skipped ? ` (+${last.skipped} more refused)` : "";
		this.refusals.set(source, {
			at: now,
			skipped: 0
		}), log$8.warn(`${this.name} refused for ${GetPlayerName(String(source))} (${source}): ${typeof reason == "string" ? reason : reason()}${more}`);
	}
};
// ../../../packages/lib/src/server/callback.ts
const log$7 = createLogger(GetCurrentResourceName()), resource$2 = GetCurrentResourceName(), REFUSED = Symbol("refused");
function onClientCallback(name, first, second) {
	let [handler, options] = typeof first == "function" ? [first, second ?? {}] : [second, first], gate = new ClientGate(name, options, 20);
	onNet(requestEvent(name), async (caller, id, ...raw) => {
		let source = Number(globalThis.source);
		if (typeof caller != "string" || caller.length > 64 || typeof id != "number") return;
		let args = gate.check(source, raw);
		if (!args) return emitNet(responseEvent(caller), source, id, !1, null);
		try {
			let result = await gate.run(source, REFUSED, () => handler(source, ...args));
			result === REFUSED ? emitNet(responseEvent(caller), source, id, !1, null) : emitNet(responseEvent(caller), source, id, !0, result ?? null);
		} catch (error) {
			log$7.error(`callback ${name} failed for ${source}`, error), emitNet(responseEvent(caller), source, id, !1, null);
		}
	});
}
const pending = new Map();
let nextId = 0;
onNet(responseEvent(resource$2), (id, ok, result) => {
	let entry = typeof id == "number" ? pending.get(id) : void 0;
	entry && entry.source === Number(globalThis.source) && (pending.delete(id), clearTimeout(entry.timer), ok === !0 ? entry.resolve(result) : entry.reject(Error("client callback failed")));
});
function triggerClientCallback(name, source, args = [], timeoutMs = 3e4) {
	let id = ++nextId;
	return new Promise((resolve, reject) => {
		let timer = setTimeout(() => {
			pending.delete(id), reject(Error(`client callback ${name} timed out for ${source}`));
		}, timeoutMs);
		pending.set(id, {
			source,
			resolve,
			reject,
			timer
		}), emitNet(requestEvent(name), source, resource$2, id, ...args);
	});
}
// ../../../packages/lib/src/server/admin/patch.ts
function toPatch(value) {
	if (!isRecord(value) || typeof value.file != "string") return null;
	let key = typeof value.key == "string" ? value.key : void 0;
	switch (value.action) {
		case "set": return typeof value.section == "string" ? {
			file: value.file,
			action: "set",
			key,
			section: value.section,
			value: value.value
		} : null;
		case "create": return key && typeof value.label == "string" ? {
			file: value.file,
			action: "create",
			key,
			label: value.label
		} : null;
		case "delete": return key ? {
			file: value.file,
			action: "delete",
			key
		} : null;
		case "run": return typeof value.id == "string" && value.id.length <= 64 ? {
			file: value.file,
			action: "run",
			key,
			id: value.id
		} : null;
		case "import": {
			if (!isRecord(value.records)) return null;
			let records = {};
			for (let [k, v] of Object.entries(value.records)) isRecord(v) && (records[k] = v);
			return Object.keys(records).length > 0 && Object.keys(records).length <= 500 ? {
				file: value.file,
				action: "import",
				records
			} : null;
		}
		default: return null;
	}
}
const clone = (value) => value === void 0 ? value : JSON.parse(JSON.stringify(value)), core$30 = resourceExport(CORE.resource), ERR = {
	type: "ADMIN_ERR_TYPE",
	range: "ADMIN_ERR_RANGE",
	length: "ADMIN_ERR_LENGTH",
	pattern: "ADMIN_ERR_PATTERN",
	required: "ADMIN_ERR_REQUIRED",
	lookup: "ADMIN_ERR_LOOKUP"
}, lookups = new class {
	lists = new Map();
	values(source) {
		let cached = this.lists.get(source);
		if (cached && Date.now() - cached.at < 2e3) return cached.values.size > 0 ? cached.values : null;
		let list = [];
		try {
			list = core$30.GetLookupValues(source);
		} catch {}
		let values = new Set(Array.isArray(list) ? list.filter((v) => typeof v == "string") : []);
		return this.lists.set(source, {
			at: Date.now(),
			values
		}), values.size > 0 ? values : null;
	}
}(), isVec = (value, keys) => isRecord(value) && keys.every((k) => typeof value[k] == "number" && Number.isFinite(value[k]));
function validate(spec, value, path) {
	if (value == null) return spec.optional ? null : {
		error: ERR.required,
		path
	};
	let fail = (error) => ({
		error,
		path
	});
	switch (spec.type) {
		case "text": return typeof value == "string" ? value.length < (spec.min ?? 1) || value.length > (spec.max ?? 120) ? fail(ERR.length) : spec.pattern && !new RegExp(spec.pattern).test(value) ? fail(ERR.pattern) : spec.lookup && value !== "" && lookups.values(spec.lookup)?.has(value) === !1 ? fail(ERR.lookup) : null : fail(ERR.type);
		case "number": return typeof value != "number" || !Number.isFinite(value) || spec.integer && !Number.isInteger(value) ? fail(ERR.type) : spec.min !== void 0 && value < spec.min || spec.max !== void 0 && value > spec.max ? fail(ERR.range) : null;
		case "bool": return typeof value == "boolean" ? null : fail(ERR.type);
		case "enum": return spec.values.includes(value) ? null : fail(ERR.type);
		case "names": {
			if (!Array.isArray(value) || value.length > (spec.max ?? 50)) return fail(ERR.length);
			let pattern = new RegExp(spec.pattern ?? "^[\\w.:-]+$"), seen = new Set();
			for (let name of value) {
				if (typeof name != "string" || name.length > (spec.itemMax ?? 64) || seen.has(name)) return fail(ERR.type);
				if (!pattern.test(name)) return fail(ERR.pattern);
				if (spec.lookup && lookups.values(spec.lookup)?.has(name) === !1) return fail(ERR.lookup);
				seen.add(name);
			}
			return null;
		}
		case "vec3": return isVec(value, [
			"x",
			"y",
			"z"
		]) ? null : fail(ERR.type);
		case "vec4": return isVec(value, [
			"x",
			"y",
			"z",
			"heading"
		]) ? null : fail(ERR.type);
		case "object":
			if (!isRecord(value)) return fail(ERR.type);
			for (let key of Object.keys(value)) if (!(key in spec.fields)) return {
				error: ERR.type,
				path: `${path}.${key}`
			};
			for (let [key, field] of Object.entries(spec.fields)) {
				let refusal = validate(field, value[key], `${path}.${key}`);
				if (refusal) return refusal;
			}
			return null;
		case "list":
			if (!Array.isArray(value)) return fail(ERR.type);
			if (value.length < (spec.min ?? 0) || value.length > (spec.max ?? 100)) return fail(ERR.length);
			for (let i = 0; i < value.length; i++) {
				let refusal = validate(spec.of, value[i], `${path}.${i + 1}`);
				if (refusal) return refusal;
			}
			return null;
		default: return spec;
	}
}
// ../../../packages/lib/src/server/admin/edit.ts
const DEFAULT_KEY = "^[a-z0-9_]{2,32}$";
function imported(spec, value) {
	let base = clone(spec.newRecord ?? {}), out = {};
	for (let name of Object.keys(spec.sections)) {
		let v = name in value ? value[name] : base[name];
		v !== void 0 && (out[name] = clone(v));
	}
	return out;
}
function linked(spec, value, ctx) {
	return spec.type === "text" && spec.records && typeof value == "string" && value !== "" && !(value in ctx.get(spec.records)) ? "ADMIN_ERR_LOOKUP" : null;
}
function checkEdit(patch, spec, ctx) {
	let data = ctx.get(patch.file);
	if (patch.action === "create") return spec.kind !== "records" || !new RegExp(spec.keyPattern ?? DEFAULT_KEY).test(patch.key) ? ERR.pattern : patch.key in data ? "ADMIN_ERR_EXISTS" : null;
	if (patch.action === "delete") return spec.kind !== "records" || !(patch.key in data) ? ERR.type : spec.locked?.includes(patch.key) ? "ADMIN_ERR_LOCKED" : null;
	if (patch.action === "import") {
		if (spec.kind !== "records") return ERR.type;
		let pattern = new RegExp(spec.keyPattern ?? DEFAULT_KEY);
		for (let [key, value] of Object.entries(patch.records)) {
			if (!pattern.test(key)) return ERR.pattern;
			let record = imported(spec, value);
			for (let [name, section] of Object.entries(spec.sections)) {
				let refusal = validate(section, record[name], name);
				if (refusal) return refusal.error;
				let link = linked(section, record[name], ctx);
				if (link) return link;
			}
			let ruled = ctx.rule(patch.file)?.(key, record);
			if (ruled) return ruled;
		}
		return null;
	}
	let section = spec.sections[patch.section];
	if (!section || spec.kind === "records" && (!patch.key || !(patch.key in data))) return ERR.type;
	let refusal = validate(section, patch.value, patch.section);
	if (refusal) return refusal.error;
	let link = linked(section, patch.value, ctx);
	if (link) return link;
	let current = spec.kind === "records" ? data[patch.key ?? ""] : data, next = {
		...isRecord(current) ? current : {},
		[patch.section]: patch.value
	};
	return ctx.rule(patch.file)?.(patch.key, next) ?? null;
}
function applyEdit(data, patch, spec) {
	if (patch.action === "import") {
		for (let [key, value] of Object.entries(patch.records)) data[key] = imported(spec, value);
		return Object.keys(patch.records);
	}
	if (patch.action === "create") {
		let record = clone(spec.newRecord ?? {});
		spec.labelPath && (record[spec.labelPath] = patch.label), data[patch.key] = record;
	} else if (patch.action === "delete") delete data[patch.key];
	else {
		let target = spec.kind === "records" ? data[patch.key ?? ""] : data;
		if (!isRecord(target)) return [];
		patch.value === void 0 || patch.value === null ? delete target[patch.section] : target[patch.section] = clone(patch.value);
	}
	return [spec.kind === "records" ? patch.key : void 0];
}
// ../../../packages/lib/src/server/admin/descriptions.ts
function langFile(resource) {
	try {
		let raw = JSON.parse(LoadResourceFile(resource, "locales/en.json") ?? "{}");
		return isRecord(raw) ? Object.fromEntries(Object.entries(raw).filter((e) => typeof e[1] == "string")) : {};
	} catch {
		return {};
	}
}
function texts$1(resource) {
	return {
		...langFile("ai-core"),
		...langFile(resource)
	};
}
function collect(fields, prefix, lang, out) {
	for (let field of fields) {
		if (field.widget === "action") continue;
		let path = prefix + field.path, label = lang[field.label] ?? field.label, hint = field.hint ? lang[field.hint] ?? field.hint : "";
		out.has(path) || out.set(path, hint ? `${label}: ${hint}` : label), field.widget === "list" && collect(field.rows, `${path}[].`, lang, out);
	}
}
function describe(schema, file, lang) {
	let out = new Map();
	for (let tab of schema.tabs) if (tab.file === file) for (let card of tab.cards) collect(card.fields, "", lang, out);
	return out;
}
// ../../../packages/lib/src/server/admin/jsonSchema.ts
const SCHEMA_KEY = {
	type: "string",
	description: "This file's JSON Schema (for editors)."
};
function toJson(spec, path, desc) {
	let description = desc.get(path), base = description ? { description } : {};
	switch (spec.type) {
		case "text": return {
			...base,
			type: "string",
			minLength: spec.min,
			maxLength: spec.max,
			pattern: spec.pattern
		};
		case "number": return {
			...base,
			type: spec.integer ? "integer" : "number",
			minimum: spec.min,
			maximum: spec.max
		};
		case "bool": return {
			...base,
			type: "boolean"
		};
		case "enum": return {
			...base,
			enum: spec.values
		};
		case "names": return {
			...base,
			type: "array",
			maxItems: spec.max,
			uniqueItems: !0,
			items: {
				type: "string",
				maxLength: spec.itemMax,
				pattern: spec.pattern
			}
		};
		case "vec3":
		case "vec4": {
			let keys = spec.type === "vec3" ? [
				"x",
				"y",
				"z"
			] : [
				"x",
				"y",
				"z",
				"heading"
			];
			return {
				...base,
				type: "object",
				required: keys,
				properties: Object.fromEntries(keys.map((k) => [k, { type: "number" }]))
			};
		}
		case "object": return {
			...base,
			...objectOf(spec.fields, path ? `${path}.` : "", desc)
		};
		case "list": return {
			...base,
			type: "array",
			minItems: spec.min,
			maxItems: spec.max,
			items: toJson(spec.of, `${path}[]`, desc)
		};
		default: return spec;
	}
}
function objectOf(fields, prefix, desc) {
	return {
		type: "object",
		properties: Object.fromEntries(Object.entries(fields).map(([k, s]) => [k, toJson(s, prefix + k, desc)])),
		required: Object.entries(fields).filter(([, s]) => !s.optional).map(([k]) => k)
	};
}
function fileSchema(resource, schema, name, spec) {
	let desc = describe(schema, name, texts$1(resource)), title = `${resource}/data/${name}.json`, body = spec.kind === "settings" ? (() => {
		let obj = objectOf(spec.sections, "", desc), required = obj.required.filter((k) => !(k in (spec.defaults ?? {})));
		return {
			...obj,
			properties: {
				$schema: SCHEMA_KEY,
				...obj.properties
			},
			required
		};
	})() : {
		type: "object",
		properties: { $schema: SCHEMA_KEY },
		patternProperties: { [spec.keyPattern ?? "^[a-z0-9_]{2,32}$"]: objectOf(spec.sections, "", desc) },
		additionalProperties: !1
	};
	return `${JSON.stringify({
		$schema: "http://json-schema.org/draft-07/schema#",
		title,
		...body
	}, null, 2)}\n`;
}
function writeSchema(resource, name, text, log) {
	let path = `data/schemas/${name}.schema.json`;
	if (LoadResourceFile(resource, path) === text) return;
	let dir = `${GetResourcePath(resource)}/data/schemas`;
	(0, node_fs_promises.mkdir)(dir, { recursive: !0 }).then(() => (0, node_fs_promises.writeFile)(`${dir}/${name}.schema.json`, text, "utf8")).catch((error) => log.error(`writing ${resource}/${path} failed`, error));
}
// ../../../packages/lib/src/server/admin/panelFiles.ts
const core$29 = resourceExport(CORE.resource);
var PanelFiles = class {
	schema;
	data = new Map();
	dataFiles = new Map();
	handlers = new Map();
	views = new FileViews((file) => this.get(file));
	worldChanges = new Map();
	resource = GetCurrentResourceName();
	log = createLogger(this.resource);
	constructor(schema) {
		this.schema = schema;
		for (let [name, spec] of Object.entries(schema.files)) this.load(name, spec);
	}
	get(file) {
		return this.data.get(file) ?? {};
	}
	onChange(file, handler) {
		this.handlers.set(file, [...this.handlers.get(file) ?? [], handler]);
	}
	view(file, read) {
		return this.views.view(file, read);
	}
	records(file, readOne) {
		return this.views.records(file, readOne);
	}
	commit(file, key, value) {
		let data = this.data.get(file);
		data && (key === void 0 ? isRecord(value) && this.data.set(file, clone(value)) : value === null ? delete data[key] : data[key] = clone(value), this.changed(file, key));
	}
	commitAfter(file, key, value) {
		setImmediate(() => this.commit(file, key, value));
	}
	store(patch, spec) {
		let data = this.data.get(patch.file) ?? {}, keys = applyEdit(data, patch, spec);
		if (keys.length !== 0) {
			this.data.set(patch.file, data);
			for (let key of keys) this.changed(patch.file, key);
		}
	}
	changed(file, key) {
		let spec = this.schema.files[file], data = this.get(file), value = key === void 0 ? data : data[key] ?? null;
		this.dataFiles.get(file)?.write(data), this.views.changed(file, key, value);
		for (let handler of this.handlers.get(file) ?? []) handler(key, value);
		if (core$29.AdminPanelChanged({
			resource: this.resource,
			file,
			key,
			value: clone(value)
		}), spec?.sync !== "all") return;
		let changes = this.worldChanges.get(file) ?? {};
		changes[key ?? ""] = clone(value), this.worldChanges.set(file, changes), emitNet(ADMIN.worldEvent(this.resource), -1, file, key ?? null, value);
	}
	load(name, spec) {
		if (spec.memory) {
			this.data.set(name, {});
			return;
		}
		let file = new DataFile(this.resource, name, this.log);
		this.dataFiles.set(name, file), file.schemaRef = `./schemas/${name}.schema.json`, writeSchema(this.resource, name, fileSchema(this.resource, this.schema, name, spec), this.log);
		let raw = file.read(), data = isRecord(raw) ? raw : {}, filled = !1;
		if (spec.kind === "settings") for (let [section, value] of Object.entries(spec.defaults ?? {})) section in data || (data[section] = clone(value), filled = !0);
		this.data.set(name, data), (filled || raw === null || !file.hasSchemaRef()) && file.write(data);
	}
};
// ../../../packages/lib/src/server/admin/panel.ts
const core$28 = resourceExport(CORE.resource);
var AdminPanel = class extends PanelFiles {
	rules = new Map();
	actions = new Map();
	editor = 0;
	constructor(schema) {
		super(schema), registerExport("AdminPanelSnapshot", () => this.snapshot()), registerExport("AdminPanelData", () => this.dataSnapshot()), registerExport("AdminPanelSummary", () => this.summary()), registerExport("AdminPanelApply", (admin, patch) => this.apply(admin, patch)), onClientCallback(ADMIN.worldChangesCallback(this.resource), () => Object.fromEntries(this.worldChanges), { rate: {
			count: 4,
			windowMs: 1e4
		} }), setImmediate(() => core$28.RegisterAdminPanel(this.resource));
	}
	rule(file, rule) {
		this.rules.set(file, rule);
	}
	onAction(id, handler) {
		this.actions.set(id, handler);
	}
	snapshot() {
		return {
			resource: this.resource,
			schema: this.schema,
			texts: loadLocaleTexts(),
			data: this.dataSnapshot()
		};
	}
	dataSnapshot() {
		return clone(Object.fromEntries(this.data));
	}
	summary() {
		let data = {}, index = {};
		for (let [file, spec] of Object.entries(this.schema.files)) {
			let content = this.data.get(file);
			if (spec.kind !== "records") {
				data[file] = clone(content ?? {});
				continue;
			}
			let labels = {};
			for (let [key, record] of Object.entries(content ?? {})) labels[key] = labelOf(record, spec.labelPath) ?? key;
			index[file] = labels;
		}
		return {
			resource: this.resource,
			schema: this.schema,
			texts: loadLocaleTexts(),
			data,
			loaded: !1,
			index
		};
	}
	apply(admin, raw) {
		let patch = toPatch(raw), spec = patch ? this.schema.files[patch.file] : void 0;
		if (!patch || !spec) return {
			ok: !1,
			error: ERR.type
		};
		this.editor = admin;
		try {
			if (patch.action === "run") return this.run(admin, patch, spec);
			if (spec.memory) return {
				ok: !1,
				error: ERR.type
			};
			let error = checkEdit(patch, spec, {
				get: (file) => this.get(file),
				rule: (file) => this.rules.get(file)
			});
			return error ? (this.log.warn(`admin ${admin} edit refused (${error}): ${previewJson(patch, 300)}`), {
				ok: !1,
				error
			}) : (this.store(patch, spec), { ok: !0 });
		} finally {
			this.editor = 0;
		}
	}
	run(admin, patch, spec) {
		let handler = this.actions.get(patch.id), data = this.get(patch.file), target = spec.kind === "records" ? data[patch.key ?? ""] : data;
		if (!handler || !isRecord(target)) return {
			ok: !1,
			error: ERR.type
		};
		try {
			let error = handler(admin, clone(target), patch.key);
			return error ? {
				ok: !1,
				error
			} : { ok: !0 };
		} catch (error) {
			return this.log.error(`panel action ${patch.id} failed`, error), {
				ok: !1,
				error: ERR.type
			};
		}
	}
};
function labelOf(record, path) {
	if (!path) return null;
	let at = record;
	for (let part of path.split(".")) {
		if (typeof at != "object" || !at) return null;
		at = at[part];
	}
	return typeof at == "string" && at !== "" ? at : null;
}
// ../../../packages/lib/src/server/log.ts
function aiLog(channel, message, options) {
	optionalExport("ai-core")?.Log(channel, message, options);
}
function aiLogChannels(channels) {
	optionalExport("ai-core")?.LogChannels(channels);
}
// ../../../packages/lib/src/server/notify.ts
function notify(source, text, kind = "info", duration, title) {
	let notification = {
		text,
		kind,
		duration,
		title
	};
	emitNet(LIB_UI.notifyEvent, source, notification);
}
// ../../../packages/lib/src/server/inventory.ts
const core$27 = resourceExport(CORE.resource), inventory = {
	addItem: (inv, item, count = 1, metadata, slot) => core$27.AddItem(inv, item, count, metadata, slot),
	removeItem: (inv, item, count = 1, metadata, slot) => core$27.RemoveItem(inv, item, count, metadata, slot),
	getItemCount: (inv, item, metadata) => core$27.GetItemCount(inv, item, metadata),
	hasItem: (inv, item, count = 1) => core$27.HasItem(inv, item, count),
	canCarryItem: (inv, item, count = 1, metadata) => core$27.CanCarryItem(inv, item, count, metadata),
	getItems: (inv) => core$27.GetItems(inv),
	clearInventory: (inv) => core$27.ClearInventory(inv),
	registerStash: (name, label, slots, maxWeight, jobs = []) => core$27.RegisterStash(name, label, slots, maxWeight, jobs),
	openInventory: (source, inv) => core$27.OpenInventory(source, inv),
	registerUsableItem: (name, handler) => core$27.RegisterUsableItem(name, handler),
	registerShop: (name, label, items) => core$27.RegisterShop(name, label, items),
	openShop: (source, name) => core$27.OpenShop(source, name),
	getItemDefinition: (name) => core$27.GetItemDefinition(name),
	setItemMetadata: (inv, slot, metadata) => core$27.SetItemMetadata(inv, slot, metadata),
	setMaxWeight: (source, grams) => core$27.SetMaxWeight(source, grams),
	usableItems: () => core$27.GetUsableItems()
}, core$26 = resourceExport(CORE.resource);
function reindex(index, source, before, after) {
	for (let name of before) {
		let set = index.get(name);
		set && (set.delete(source), set.size === 0 && index.delete(name));
	}
	for (let name of after) {
		let set = index.get(name);
		set || index.set(name, set = new Set()), set.add(source);
	}
}
var OnlineMirror = class {
	players = new Map();
	onDuty = new Map();
	jobIndex = new Map();
	gangIndex = new Map();
	started = !1;
	start() {
		if (this.started) return;
		this.started = !0;
		let load = (source, character) => {
			this.drop(source), this.players.set(source, {
				character,
				jobs: [],
				jobNames: [],
				gangs: [],
				gangNames: [],
				duty: null
			}), this.setJobs(source, core$26.GetJobs(source) ?? []), this.setGangs(source, core$26.GetGangs(source) ?? []), this.setDuty(source, core$26.GetDutyJob(source));
		};
		on(CORE.playerLoadedEvent, load), on(CORE.playerUnloadedEvent, (source) => this.drop(source)), on(CORE.jobsChangedEvent, (source, jobs) => this.setJobs(source, jobs)), on(CORE.gangsChangedEvent, (source, gangs) => this.setGangs(source, gangs)), on(CORE.dutyChangedEvent, (source, job) => this.setDuty(source, job));
		for (let source of core$26.GetLoadedSources()) {
			let character = core$26.GetCharacter(source);
			character && load(source, character);
		}
	}
	drop(source) {
		let player = this.players.get(source);
		player && (this.setDuty(source, null), reindex(this.jobIndex, source, player.jobNames, []), reindex(this.gangIndex, source, player.gangNames, []), this.players.delete(source));
	}
	setJobs(source, jobs) {
		let player = this.players.get(source);
		if (!player) return;
		let names = jobs.map((m) => m.job);
		reindex(this.jobIndex, source, player.jobNames, names), player.jobs = jobs, player.jobNames = names;
	}
	setGangs(source, gangs) {
		let player = this.players.get(source);
		if (!player) return;
		let names = gangs.map((m) => m.gang);
		reindex(this.gangIndex, source, player.gangNames, names), player.gangs = gangs, player.gangNames = names;
	}
	setDuty(source, job) {
		let player = this.players.get(source);
		if (!player) return;
		if (player.duty) {
			let set = this.onDuty.get(player.duty);
			set?.delete(source), set?.size === 0 && this.onDuty.delete(player.duty);
		}
		if (player.duty = job, !job) return;
		let set = this.onDuty.get(job);
		set || this.onDuty.set(job, set = new Set()), set.add(source);
	}
}, OnlinePlayers = class extends OnlineMirror {
	sources() {
		return this.start(), this.players.keys();
	}
	get size() {
		return this.start(), this.players.size;
	}
	character(source) {
		return this.start(), this.players.get(source)?.character ?? null;
	}
	charId(source) {
		return this.start(), this.players.get(source)?.character.id;
	}
	name(source, options = {}) {
		let c = this.character(source);
		return c ? `${c.firstname} ${c.lastname}` : options.fallback === !1 ? "" : GetPlayerName(String(source));
	}
	jobs(source) {
		return this.start(), this.players.get(source)?.jobNames ?? [];
	}
	gangs(source) {
		return this.start(), this.players.get(source)?.gangNames ?? [];
	}
	jobGrade(source, job) {
		return this.start(), this.players.get(source)?.jobs.find((m) => m.job === job)?.grade ?? null;
	}
	gangGrade(source, gang) {
		return this.start(), this.players.get(source)?.gangs.find((m) => m.gang === gang)?.grade ?? null;
	}
	jobMembers(job) {
		return this.start(), this.jobIndex.get(job) ?? EMPTY;
	}
	gangMembers(gang) {
		return this.start(), this.gangIndex.get(gang) ?? EMPTY;
	}
	dutyJob(source) {
		return this.start(), this.players.get(source)?.duty ?? null;
	}
	onDutyIn(source, jobs) {
		let duty = this.dutyJob(source);
		return duty !== null && jobs.includes(duty);
	}
	allows(source, rule) {
		if (isPublic(rule)) return !0;
		let min = (name) => rule.grades[name] ?? 0;
		for (let gang of rule.gangs) {
			let grade = this.gangGrade(source, gang);
			if (grade !== null && grade >= min(gang)) return !0;
		}
		let duty = rule.onDuty ? this.dutyJob(source) : null;
		for (let job of rule.jobs) {
			let grade = this.jobGrade(source, job);
			if (grade !== null && grade >= min(job) && (!rule.onDuty || duty === job)) return !0;
		}
		return !1;
	}
	countOnDuty(jobs) {
		this.start();
		let count = 0;
		for (let job of jobs) count += this.onDuty.get(job)?.size ?? 0;
		return count;
	}
	onDutyFor(job) {
		return this.start(), this.onDuty.get(job) ?? EMPTY;
	}
};
const EMPTY = new Set(), online = new OnlinePlayers(), core$25 = resourceExport(CORE.resource), vehicleKeys = {
	give: (source, vehicle, purpose = "temporary") => core$25.GiveVehicleKeys(source, vehicle, purpose),
	remove: (source, vehicle) => core$25.RemoveVehicleKeys(source, vehicle),
	has: (source, vehicle) => core$25.HasVehicleKeys(source, vehicle)
}, TYPES = new Set([
	"automobile",
	"bike",
	"boat",
	"heli",
	"plane",
	"submarine",
	"trailer",
	"train"
]), types = new Map(), votes = new Map(), modelHash = (model) => typeof model == "number" ? model | 0 : GetHashKey(model) | 0;
async function vehicleType(model, asker) {
	let hash = modelHash(model), known = types.get(hash);
	if (known !== void 0) return known;
	let answer = await triggerClientCallback(CORE.vehicleTypeCallback, asker, [model]).catch(() => null);
	if (typeof answer != "string" || !TYPES.has(answer)) return null;
	let seen = votes.get(hash) ?? new Map(), first = seen.get(answer);
	return first !== void 0 && first !== asker ? (types.set(hash, answer), votes.delete(hash)) : (seen.set(answer, asker), votes.set(hash, seen)), answer;
}
// ../../../packages/lib/src/server/fuel.ts
const core$24 = resourceExport(CORE.resource), fuel = {
	get: (vehicle) => core$24.GetVehicleFuel(vehicle),
	set: (vehicle, level) => core$24.SetVehicleFuel(vehicle, level),
	provider: () => core$24.GetFuelSystem()
};
function randomPlate(prefix) {
	let digit = () => String(Math.floor(Math.random() * 10));
	if (prefix !== void 0) {
		let plate = prefix.slice(0, 8);
		for (; plate.length < 8;) plate += digit();
		return plate;
	}
	let letter = () => "ABCDEFGHJKLMNPRSTUVWXYZ"[Math.floor(Math.random() * 23)] ?? "A";
	return `${digit()}${digit()}${letter()}${letter()}${letter()}${digit()}${digit()}${digit()}`;
}
// ../../../packages/lib/src/server/vehicle/spawn.ts
async function seatPlayer(vehicle, source, seat) {
	let ped = GetPlayerPed(String(source));
	return ped ? waitFor(() => {
		if (!DoesEntityExist(vehicle)) return !1;
		if (GetPedInVehicleSeat(vehicle, seat) === ped) return !0;
		SetPedIntoVehicle(ped, vehicle, seat);
	}, 2e3, 150).catch(() => !1) : !1;
}
async function spawnVehicle(options) {
	let type = options.asker === void 0 ? options.type ?? "automobile" : await vehicleType(options.model, options.asker);
	if (!type) return null;
	let { x, y, z, heading } = options.coords, vehicle = CreateVehicleServerSetter(modelHash(options.model), type, x, y, z, heading);
	if (!await waitFor(() => DoesEntityExist(vehicle) || void 0, 5e3).catch(() => !1)) return null;
	options.persistent !== !1 && SetEntityOrphanMode(vehicle, 2);
	let plate = (options.plate ?? randomPlate()).slice(0, 8);
	SetVehicleNumberPlateText(vehicle, plate), options.bucket !== void 0 && SetEntityRoutingBucket(vehicle, options.bucket), options.locked && SetVehicleDoorsLocked(vehicle, 2);
	let state = Entity(vehicle).state;
	options.fuel !== void 0 && fuel.set(vehicle, options.fuel), options.props && state.set(VEHICLE_BAGS.props, options.props, !0), options.setup && state.set(VEHICLE_BAGS.setup, options.setup, !0);
	for (let [key, value] of Object.entries(options.bags ?? {})) state.set(key, value, !0);
	if (options.keysTo !== void 0) {
		let synced = await waitFor(() => !DoesEntityExist(vehicle) || GetVehicleNumberPlateText(vehicle).trim() === plate.trim() || void 0, 3e3).catch(() => !1);
		vehicleKeys.give(options.keysTo, synced && DoesEntityExist(vehicle) ? vehicle : plate.trim(), options.purpose ?? "temporary");
	}
	let riders = [...options.driver === void 0 ? [] : [{
		source: options.driver,
		seat: -1
	}], ...options.seats ?? []];
	return await Promise.all(riders.map((r) => seatPlayer(vehicle, r.source, r.seat))), vehicle;
}
// ../../../packages/lib/src/server/vehicle/nearby.ts
function nearestVehicleTo(source, metres, filter) {
	let ped = GetPlayerPed(String(source)), own = GetVehiclePedIsIn(ped, !1);
	if (own && (!filter || filter(own))) return own;
	let [x = 0, y = 0, z = 0] = GetEntityCoords(ped), best = 0, bestDistance = metres;
	for (let vehicle of GetAllVehicles()) {
		let [vx = 0, vy = 0, vz = 0] = GetEntityCoords(vehicle), d = Math.hypot(vx - x, vy - y, vz - z);
		d < bestDistance && (!filter || filter(vehicle)) && ([best, bestDistance] = [vehicle, d]);
	}
	return best;
}
resourceExport(CORE.resource), createLogger(GetCurrentResourceName());
const dropped = new Set();
let listening = !1;
function onDropped(fn) {
	listening || (listening = !0, on("playerDropped", () => {
		let source = Number(globalThis.source);
		for (let handler of dropped) handler(source);
	})), dropped.add(fn);
}
// ../../../packages/lib/src/server/progressFor.ts
const running = new class extends Map {
	constructor(options = {}) {
		super(), onDropped((source) => {
			if (!this.has(source)) return;
			let value = this.get(source);
			this.delete(source), options.onDrop?.(source, value);
		});
	}
}({ onDrop: (_source, settle) => settle(!1) });
on(CORE.playerUnloadedEvent, (source) => {
	let settle = running.get(source);
	settle && settle(!1);
});
// ../../../packages/lib/src/server/definitions.ts
const core$22 = resourceExport("ai-core"), definitions = new class {
	jobs = new Map();
	gangs = new Map();
	constructor() {
		on(CORE.definitionsChangedEvent, (file, name) => {
			typeof name == "string" && (file === "jobs" ? this.jobs.delete(name) : file === "gangs" && this.gangs.delete(name));
		});
	}
	job(name) {
		let def = this.jobs.get(name);
		return def === void 0 && this.jobs.set(name, def = core$22.GetJobDefinition(name) ?? null), def;
	}
	registerJob(name, definition) {
		return core$22.RegisterJobDefinition(name, definition);
	}
	removeJob(name) {
		return core$22.RemoveJobDefinition(name);
	}
	registerGang(name, definition) {
		return core$22.RegisterGangDefinition(name, definition);
	}
	removeGang(name) {
		return core$22.RemoveGangDefinition(name);
	}
	gang(name) {
		let def = this.gangs.get(name);
		return def === void 0 && this.gangs.set(name, def = core$22.GetGangDefinition(name) ?? null), def;
	}
}(), log$5 = createLogger(GetCurrentResourceName());
let texts = null;
const t = (key, ...args) => formatText((texts ??= loadLocaleTexts(CORE.resource))[key] ?? key, args);
function reply$1(source, text, kind) {
	source > 0 ? notify(source, text, kind) : log$5.info(text);
}
var Command = class {
	params;
	handler;
	info;
	usage;
	constructor(names, params, help, aces, handler) {
		this.params = params, this.handler = handler, this.info = {
			names,
			help,
			params: params.map((p) => ({ ...p })),
			aces
		}, this.usage = [`/${names[0]}`, ...params.map((p) => p.optional ? `[${p.name}]` : `<${p.name}>`)].join(" ");
	}
	allowed(source, name) {
		let aces = this.info.aces;
		if (source <= 0 || !aces) return !0;
		let player = String(source);
		return aces.some((ace) => IsPlayerAceAllowed(player, ace)) || !!IsPlayerAceAllowed(player, `command.${name}`);
	}
	suggestion(name) {
		return {
			name: `/${name}`,
			help: this.info.help,
			params: this.params.map((p) => ({
				name: p.name,
				help: p.help ?? ""
			}))
		};
	}
	run(source, name, raw, line) {
		if (!this.allowed(source, name)) return reply$1(source, t("COMMAND_NOT_ALLOWED"), "error");
		let args = this.parse(raw);
		if (typeof args == "string") return reply$1(source, args, "error"), reply$1(source, t("COMMAND_USAGE", this.usage), "info");
		let fail = (error) => log$5.error(`command /${name} failed`, error);
		try {
			let result = this.handler(source, args, line);
			result instanceof Promise && result.catch(fail);
		} catch (error) {
			fail(error);
		}
	}
	parse(raw) {
		let args = {};
		for (let [i, param] of this.params.entries()) {
			let token = param.type === "longString" ? raw.slice(i).join(" ").trim() : raw[i] ?? "";
			if (token === "") {
				if (!param.optional) return t("COMMAND_MISSING", param.name);
			} else {
				if (param.type === "number" || param.type === "playerId") {
					let value = Number(token);
					if (!Number.isFinite(value)) return t("COMMAND_NUMBER", param.name);
					if (param.type === "playerId" && (!Number.isInteger(value) || value <= 0 || !GetPlayerName(String(value)))) return t("COMMAND_PLAYER", token);
					args[param.name] = value;
				} else args[param.name] = token;
				if (param.type === "longString") break;
			}
		}
		return args;
	}
};
// ../../../packages/lib/src/server/command/commandSet.ts
const resource = GetCurrentResourceName(), commands = new class {
	list = [];
	sent = new Map();
	announced = 0;
	queued = !1;
	listening = !1;
	add(command) {
		this.listening || this.listen(), this.list.push(command), this.queued || (this.queued = !0, setImmediate(() => this.flush()));
	}
	refresh(source) {
		let before = this.sent.get(source), now = new Set(), add = [];
		for (let command of this.list) for (let name of command.info.names) command.allowed(source, name) && (now.add(name), before?.has(name) || add.push(command.suggestion(name)));
		if (this.sent.set(source, now), add.length && emitNet("chat:addSuggestions", source, add), before) for (let name of before) now.has(name) || emitNet("chat:removeSuggestion", source, `/${name}`);
	}
	flush() {
		this.queued = !1, optionalExport(CORE.resource)?.RegisterCommands(resource, this.list.slice(this.announced).map((c) => c.info)), this.announced = this.list.length;
		for (let player of getPlayers()) this.refresh(Number(player));
	}
	listen() {
		this.listening = !0;
		let refresh = (source) => this.refresh(Number(source));
		on(CORE.playerLoadedEvent, refresh), on(CORE.jobsChangedEvent, refresh), on(CORE.gangsChangedEvent, refresh), on("playerDropped", () => this.sent.delete(Number(globalThis.source))), on("onResourceStop", (name) => {
			if (name === resource) for (let command of this.list) for (let n of command.info.names) emitNet("chat:removeSuggestion", -1, `/${n}`);
		});
	}
}();
// ../../../packages/lib/src/server/command/addCommand.ts
function addCommand(name, options, handler) {
	let names = (Array.isArray(name) ? name : [name]).map((n) => n.toLowerCase());
	if (names.length === 0) throw Error("addCommand needs a name");
	let restricted = options.restricted ?? !1, aces = restricted === !1 ? null : restricted === !0 ? [ADMIN.ace] : Array.isArray(restricted) ? [...restricted] : [restricted], command = new Command(names, options.params ?? [], options.help ?? "", aces, handler);
	for (let n of names) RegisterCommand(n, (source, raw, line) => command.run(Number(source), n, raw, line), !1);
	commands.add(command);
}
createLogger(GetCurrentResourceName()), createLogger("aicore-lib");
// ../../../packages/lib/src/fivem/byResource.ts
const plateOf = (vehicle) => GetVehicleNumberPlateText(vehicle).trim().toUpperCase();
// ../../../packages/lib/src/fivem/scheduler/group.ts
var Group = class {
	interval;
	jobs = Array(8);
	gens = Array(8).fill(0);
	dues = Array(8).fill(0);
	head = 0;
	mask = 7;
	count = 0;
	constructor(interval) {
		this.interval = interval;
	}
	get front() {
		return this.dues[this.head] ?? 0;
	}
	compactAt = 64;
	push(job, due) {
		this.count >= this.compactAt && this.compact(), this.count > this.mask && this.grow();
		let i = this.head + this.count & this.mask;
		this.jobs[i] = job, this.gens[i] = job.gen, this.dues[i] = due, this.count++;
	}
	run(now) {
		for (let left = this.count; left > 0 && this.count > 0; left--) {
			let i = this.head, due = this.dues[i] ?? 0;
			if (due > now) return;
			let job = this.jobs[i], gen = this.gens[i];
			if (this.jobs[i] = void 0, this.head = i + 1 & this.mask, this.count--, !job || job.gen !== gen) continue;
			let next = due + this.interval;
			next <= now && (next = now + this.interval), this.push(job, next), job.call();
		}
	}
	compact() {
		let kept = 0;
		for (let n = 0; n < this.count; n++) {
			let i = this.head + n & this.mask, job = this.jobs[i];
			if (!job || job.gen !== this.gens[i]) continue;
			let k = this.head + kept & this.mask;
			this.jobs[k] = job, this.gens[k] = this.gens[i] ?? 0, this.dues[k] = this.dues[i] ?? 0, kept++;
		}
		for (let n = kept; n < this.count; n++) this.jobs[this.head + n & this.mask] = void 0;
		this.count = kept, this.compactAt = Math.max(64, kept * 2);
	}
	grow() {
		let size = (this.mask + 1) * 2, jobs = Array(size), gens = Array(size).fill(0), dues = Array(size).fill(0);
		for (let n = 0; n < this.count; n++) {
			let i = this.head + n & this.mask;
			jobs[n] = this.jobs[i], gens[n] = this.gens[i] ?? 0, dues[n] = this.dues[i] ?? 0;
		}
		this.jobs = jobs, this.gens = gens, this.dues = dues, this.head = 0, this.mask = size - 1;
	}
};
const scheduler = new class {
	groups = [];
	byInterval = new Map();
	tick = null;
	active = 0;
	nextDue = Infinity;
	running = !1;
	activate(job) {
		job.gen++, this.active++;
		let due = GetGameTimer() + job.interval, group = this.byInterval.get(job.interval);
		group || (group = new Group(job.interval), this.byInterval.set(job.interval, group), this.groups.push(group)), group.push(job, due), due < this.nextDue && (this.nextDue = due), this.tick ??= setTick(this.onTick);
	}
	deactivate(job) {
		job.gen++, this.active--, this.active === 0 && !this.running && this.halt();
	}
	halt() {
		this.tick !== null && clearTick(this.tick), this.tick = null, this.groups.length = 0, this.byInterval.clear(), this.nextDue = Infinity;
	}
	onTick = () => {
		let now = GetGameTimer();
		if (now < this.nextDue) return;
		let groups = this.groups;
		this.running = !0;
		for (let i = 0; i < groups.length; i++) {
			let group = groups[i];
			group && group.count > 0 && group.front <= now && group.run(now);
		}
		if (this.running = !1, this.active === 0) return this.halt();
		let soonest = Infinity, kept = 0;
		for (let i = 0; i < groups.length; i++) {
			let group = groups[i];
			group && (group.count === 0 ? this.byInterval.delete(group.interval) : (groups[kept++] = group, group.front < soonest && (soonest = group.front)));
		}
		groups.length = kept, this.nextDue = soonest;
	};
}();
let log$2 = null;
var ScheduledJob = class {
	interval;
	fn;
	name;
	gen = 0;
	active = !1;
	stopped = !1;
	quietUntil = 0;
	skipped = 0;
	constructor(interval, fn, name) {
		this.interval = interval, this.fn = fn, this.name = name;
	}
	get running() {
		return this.active;
	}
	set(active) {
		active === this.active || active && this.stopped || (this.active = active, active ? scheduler.activate(this) : scheduler.deactivate(this));
	}
	stop() {
		this.set(!1), this.stopped = !0;
	}
	call() {
		try {
			let result = this.fn();
			result instanceof Promise && result.catch((error) => this.fail(error));
		} catch (error) {
			this.fail(error);
		}
	}
	fail(error) {
		let now = GetGameTimer();
		if (now < this.quietUntil) {
			this.skipped++;
			return;
		}
		this.quietUntil = now + 1e4;
		let more = this.skipped ? ` (+${this.skipped} more)` : "";
		this.skipped = 0, log$2 ??= createLogger(GetCurrentResourceName()), log$2.error(`job "${this.name}" failed${more}`, error instanceof Error ? error.stack ?? error.message : error);
	}
};
function every(ms, fn, options = {}) {
	let job = new ScheduledJob(Math.max(0, Math.floor(ms)), fn, options.name ?? (fn.name || "anonymous"));
	return options.active !== !1 && job.set(!0), job;
}
// ../../../packages/lib/src/fivem/state/mirror.ts
const stateBoolean = (v) => typeof v == "boolean" ? v : void 0;
var Mirror = class {
	key;
	parse;
	values = new Map();
	listeners = new Set();
	constructor(key, parse) {
		this.key = key, this.parse = parse;
	}
	onChange(listener) {
		return this.listeners.add(listener), () => this.listeners.delete(listener);
	}
	store(id, raw) {
		this.apply(id, raw == null ? void 0 : this.parse(raw));
	}
	apply(id, value) {
		let old = this.values.get(id);
		if (this.values.set(id, value), old !== value) for (let listener of this.listeners) listener(id, value, old);
	}
};
// ../../../packages/lib/src/fivem/state/entityState.ts
const isServer$1 = IsDuplicityVersion();
var EntityState$1 = class extends Mirror {
	handles = new Map();
	constructor(key, parse) {
		super(key, parse), AddStateBagChangeHandler(key, "", (bag, _key, value) => {
			if (!bag.startsWith("entity:")) return;
			let netId = Number(bag.slice(7));
			this.handles.set(netId, GetEntityFromStateBagName(bag)), this.store(netId, value);
		}), isServer$1 ? on("entityRemoved", (entity) => this.forget(NetworkGetNetworkIdFromEntity(entity))) : every(3e4, () => this.prune(), { name: `state ${key}` });
	}
	get(entity) {
		if (!entity) return;
		let netId = NetworkGetNetworkIdFromEntity(entity), handle = this.handles.get(netId);
		if (handle === entity) return this.values.get(netId);
		if (handle === 0 && this.values.has(netId)) return this.handles.set(netId, entity), this.values.get(netId);
		this.handles.set(netId, entity);
		let value = this.parseRaw(Entity(entity).state[this.key]);
		return this.values.set(netId, value), value;
	}
	put(entity, value) {
		let netId = NetworkGetNetworkIdFromEntity(entity);
		this.handles.set(netId, entity), this.apply(netId, value);
	}
	getByNetId(netId) {
		return this.values.get(netId);
	}
	forget(netId) {
		this.values.delete(netId), this.handles.delete(netId);
	}
	parseRaw(raw) {
		return raw == null ? void 0 : this.parse(raw);
	}
	prune() {
		for (let netId of this.values.keys()) DoesEntityExist(NetworkGetEntityFromNetworkId(netId)) || this.forget(netId);
	}
};
IsDuplicityVersion();
// ../../../packages/lib/src/server/state.ts
var EntityState = class extends EntityState$1 {
	set(entity, value) {
		DoesEntityExist(entity) && (Entity(entity).state.set(this.key, value ?? null, !0), this.put(entity, value));
	}
};
// ../../../packages/lib/src/server/world.ts
const core$21 = resourceExport(CORE.resource), world = {
	getWeather: () => core$21.GetWeather(),
	setWeather: (type) => core$21.SetWeather(type),
	getTime: () => core$21.GetTime(),
	setTime: (hour, minute = 0) => core$21.SetTime(hour, minute),
	setBlackout: (on) => core$21.SetBlackout(on),
	freezeTime: (on) => core$21.FreezeTime(on)
};
resourceExport(CORE.resource), resourceExport(CORE.resource), resourceExport(CORE.resource), resourceExport(CORE.resource), resourceExport(CORE.resource);
// ../../../packages/lib/src/server/medical.ts
const core$15 = resourceExport(CORE.resource), medical = {
	revive: (source) => core$15.RevivePlayer(source),
	heal: (source) => core$15.HealPlayer(source),
	isDead: (source) => core$15.IsPlayerDead(source),
	provider: () => core$15.GetMedicalSystem()
};
resourceExport(CORE.resource), resourceExport(CORE.resource), resourceExport(CORE.resource), resourceExport(CORE.resource), resourceExport(CORE.resource);
// ../../../packages/lib/src/server/stress.ts
const core$9 = resourceExport(CORE.resource), needs = { refill: (source) => core$9.RefillNeeds(source) };
resourceExport(CORE.resource), resourceExport(CORE.resource), resourceExport(CORE.resource);
// ../../../packages/lib/src/server/bans.ts
const core$5 = resourceExport(CORE.resource), bans = {
	ban: (target, reason, minutes, by) => new Promise((resolve) => {
		core$5.BanPlayer(target, reason, minutes, by, resolve) || resolve(null);
	}),
	unban: (banId, by) => core$5.UnbanPlayer(banId, by),
	edit: (banId, edit, by) => core$5.EditBan(banId, edit, by),
	isBanned: (target) => core$5.IsBanned(target),
	list: (page = 1) => core$5.GetBans(page),
	history: (target) => new Promise((resolve) => core$5.GetBanHistory(target, resolve)),
	search: (query) => new Promise((resolve) => core$5.ListBans(query, resolve))
};
resourceExport(CORE.resource);
// ../../../packages/lib/src/server/index.ts
function isOnline(source) {
	return !!GetPlayerName(String(source));
}
// resource/common/locale.ts
const Locale = createLocale(), ResourceName = GetCurrentResourceName();
IsDuplicityVersion();
// resource/server/playerName.ts
const playerName = (source) => GetPlayerName(String(source)) || String(source), playerLabel = (target) => `${playerName(target)} (${target})`, banActions = {
	panel(source) {
		return emitNet(ADMIN.showEvent, source), null;
	},
	ban(source, target, minutes, reason) {
		let text = reason.trim().slice(0, 255);
		if (!text) return "ERR_REASON_EMPTY";
		if (target === source) return "ERR_BAN_SELF";
		if (!isOnline(target)) return "ERR_TARGET";
		if (!Number.isInteger(minutes) || minutes < 0) return "ERR_BAN_LENGTH";
		let who = playerLabel(target);
		return bans.ban(target, text, minutes || void 0, source || void 0), source > 0 && notify(source, Locale("NOTIFY_BANNED", who), "success"), null;
	},
	bans(source) {
		return source <= 0 ? "ERR_PLAYER_ONLY" : (emitNet(ADMIN.showEvent, source, { section: "bans" }), null);
	},
	banRecords(source, target) {
		if (source <= 0) return "ERR_PLAYER_ONLY";
		let charId = online.charId(target), fivem = GetPlayerIdentifierByType(String(target), "fivem");
		return emitNet(ADMIN.showEvent, source, charId === void 0 ? {
			section: "bans",
			search: fivem || void 0
		} : {
			section: "players",
			charId
		}), null;
	}
};
// resource/server/actionLog.ts
aiLogChannels({ actions: {} });
const actionLog = (message, source, target, metadata) => aiLog("actions", message, {
	source: source > 0 ? source : void 0,
	target,
	metadata
}), healthActions = {
	heal(source, target) {
		return medical.provider() === null ? "ERR_NO_DEATH" : isOnline(target) ? medical.isDead(target) ? "ERR_DOWN" : (medical.heal(target), target !== source && notify(target, Locale("NOTIFY_HEALED_BY"), "success"), source > 0 && notify(source, Locale("NOTIFY_HEALED", playerName(target)), "success"), actionLog("healed a player", source, target), null) : "ERR_TARGET";
	},
	revive(source, target) {
		return medical.provider() === null ? "ERR_NO_DEATH" : isOnline(target) ? (medical.revive(target) || medical.heal(target), needs.refill(target), target !== source && notify(target, Locale("NOTIFY_REVIVED_BY"), "success"), source > 0 && notify(source, Locale("NOTIFY_REVIVED", playerName(target)), "success"), actionLog("revived a player", source, target), null) : "ERR_TARGET";
	}
}, itemActions = {
	giveItem(source, target, item, count) {
		let name = item.toLowerCase();
		return !/^[a-z0-9_-]{1,48}$/.test(name) || !inventory.getItemDefinition(name) ? "ERR_ITEM" : !Number.isInteger(count) || count < 1 || count > 1e4 ? "ERR_COUNT" : inventory.addItem(target, name, count) ? (notify(source, Locale("NOTIFY_ITEM_GIVEN", count, name, playerLabel(target)), "success"), actionLog("gave an item", source, target, {
			item: name,
			count
		}), null) : "ERR_ITEM_FULL";
	},
	removeItem(source, target, item, count) {
		let name = item.toLowerCase(), has = inventory.getItemCount(target, name);
		if (has <= 0) return "ERR_ITEM_NONE";
		let take = count > 0 ? Math.min(count, has) : has;
		return inventory.removeItem(target, name, take) ? (notify(source, Locale("NOTIFY_ITEM_REMOVED", take, name, playerLabel(target)), "success"), actionLog("removed an item", source, target, {
			item: name,
			count: take
		}), null) : "ERR_ITEM_NONE";
	},
	clearInventory(source, target) {
		return inventory.clearInventory(target), notify(source, Locale("NOTIFY_INVENTORY_CLEARED", playerLabel(target)), "success"), actionLog("cleared an inventory", source, target), null;
	},
	openInventory(source, target) {
		return source <= 0 ? "ERR_PLAYER_ONLY" : inventory.openInventory(source, target) ? (actionLog("opened an inventory", source, target), null) : "ERR_INVENTORY";
	}
}, EVENTS = {
	access: "ai-admin:access",
	noclip: "ai-admin:noclip",
	players: "ai-admin:players",
	action: "ai-admin:action",
	giveItems: "ai-admin:giveItems",
	toggleNoclip: "ai-admin:client:toggleNoclip",
	teleport: "ai-admin:client:teleport",
	openMenu: "ai-admin:client:openMenu",
	openItems: "ai-admin:client:openItems",
	coords: "ai-admin:client:coords",
	worldState: "ai-admin:worldState",
	warned: "ai-admin:client:warned"
}, MENU_ACTIONS = [
	"tpm",
	"heal",
	"revive",
	"car",
	"dv",
	"goto",
	"bring",
	"panel",
	"item",
	"inventory",
	"warn",
	"ban",
	"bans",
	"banRecords",
	"announce",
	"weather",
	"time",
	"freeze",
	"blackout"
], isMenuAction = (v) => typeof v == "string" && MENU_ACTIONS.includes(v);
function readSettings(raw) {
	let s = record(raw);
	return {
		noclipSpeed: num(s.noclipSpeed, 1, .1, 50),
		noclipMaxSpeed: num(s.noclipMaxSpeed, 16, 1, 100),
		noclipStep: num(s.noclipStep, .5, .1, 10),
		noclipFast: num(s.noclipFast, 2, 1, 20),
		noclipFaster: num(s.noclipFaster, 4, 1, 50),
		noclipSlow: num(s.noclipSlow, .05, .01, 1),
		carMaxed: bool(s.carMaxed, !1),
		carFuel: int(s.carFuel, 100, 0, 100),
		carEngineOn: bool(s.carEngineOn, !0)
	};
}
// resource/common/controls.ts
const NOTIFY_KINDS = [
	"info",
	"success",
	"warning",
	"error"
];
function readControls(raw) {
	let c = record(raw);
	return {
		announceText: str(c.announceText, "", 300),
		announceKind: NOTIFY_KINDS.find((k) => k === c.announceKind) ?? "warning",
		announceSeconds: int(c.announceSeconds, 10, 2, 60),
		warnPlayer: str(c.warnPlayer, "", 64),
		warnReason: str(c.warnReason, "", 300),
		weather: isWeather(c.weather) ? c.weather : "",
		hour: int(c.hour, 12, 0, 23),
		minute: int(c.minute, 0, 0, 59),
		freezeTime: bool(c.freezeTime, !1),
		blackout: bool(c.blackout, !1)
	};
}
// resource/server/schema/messages.ts
const controlsFile = {
	kind: "settings",
	sync: "admin",
	sections: {
		announceText: {
			type: "text",
			min: 0,
			max: 300
		},
		announceKind: {
			type: "enum",
			values: NOTIFY_KINDS
		},
		announceSeconds: {
			type: "number",
			min: 2,
			max: 60,
			integer: !0
		},
		warnPlayer: {
			type: "text",
			min: 0,
			max: 64,
			lookup: "player"
		},
		warnReason: {
			type: "text",
			min: 0,
			max: 300
		},
		weather: {
			type: "enum",
			values: ["", ...WEATHERS]
		},
		hour: {
			type: "number",
			min: 0,
			max: 23,
			integer: !0
		},
		minute: {
			type: "number",
			min: 0,
			max: 59,
			integer: !0
		},
		freezeTime: { type: "bool" },
		blackout: { type: "bool" }
	},
	defaults: {
		announceText: "",
		announceKind: "warning",
		announceSeconds: 10,
		warnPlayer: "",
		warnReason: "",
		weather: "",
		hour: 12,
		minute: 0,
		freezeTime: !1,
		blackout: !1
	}
}, messagesTab = {
	id: "messages",
	file: "controls",
	icon: "comments",
	label: "ADMIN_TAB_MESSAGES",
	desc: "ADMIN_TAB_MESSAGES_DESC",
	cards: [{
		icon: "comments",
		title: "ADMIN_C_ANNOUNCE",
		desc: "ADMIN_C_ANNOUNCE_DESC",
		fields: [
			{
				widget: "text",
				path: "announceText",
				label: "ADMIN_F_ANNOUNCE_TEXT",
				hint: "ADMIN_H_ANNOUNCE_TEXT",
				placeholder: "ADMIN_P_ANNOUNCE_TEXT"
			},
			{
				widget: "select",
				path: "announceKind",
				label: "ADMIN_F_ANNOUNCE_KIND",
				hint: "ADMIN_H_ANNOUNCE_KIND",
				options: [
					{
						value: "info",
						label: "ADMIN_O_INFO"
					},
					{
						value: "success",
						label: "ADMIN_O_SUCCESS"
					},
					{
						value: "warning",
						label: "ADMIN_O_WARNING"
					},
					{
						value: "error",
						label: "ADMIN_O_ERROR"
					}
				]
			},
			{
				widget: "number",
				path: "announceSeconds",
				label: "ADMIN_F_ANNOUNCE_TIME",
				hint: "ADMIN_H_ANNOUNCE_TIME",
				min: 2,
				max: 60,
				step: 1,
				unit: "s"
			},
			{
				widget: "action",
				path: "announceSend",
				label: "ADMIN_F_ANNOUNCE_SEND",
				hint: "ADMIN_H_ANNOUNCE_SEND",
				button: "ADMIN_B_ANNOUNCE_SEND",
				icon: "comments",
				confirm: "ADMIN_Q_ANNOUNCE_SEND"
			}
		]
	}, {
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
				placeholder: "ADMIN_P_WARN_PLAYER"
			},
			{
				widget: "text",
				path: "warnReason",
				label: "ADMIN_F_WARN_REASON",
				hint: "ADMIN_H_WARN_REASON",
				placeholder: "ADMIN_P_WARN_REASON"
			},
			{
				widget: "action",
				path: "warnSend",
				label: "ADMIN_F_WARN_SEND",
				hint: "ADMIN_H_WARN_SEND",
				button: "ADMIN_B_WARN_SEND",
				icon: "triangle-exclamation",
				danger: !0
			}
		]
	}]
}, settingsFile = {
	kind: "settings",
	sync: "all",
	sections: {
		noclipSpeed: {
			type: "number",
			min: .1,
			max: 50
		},
		noclipMaxSpeed: {
			type: "number",
			min: 1,
			max: 100
		},
		noclipStep: {
			type: "number",
			min: .1,
			max: 10
		},
		noclipFast: {
			type: "number",
			min: 1,
			max: 20
		},
		noclipFaster: {
			type: "number",
			min: 1,
			max: 50
		},
		noclipSlow: {
			type: "number",
			min: .01,
			max: 1
		},
		carMaxed: { type: "bool" },
		carFuel: {
			type: "number",
			min: 0,
			max: 100,
			integer: !0
		},
		carEngineOn: { type: "bool" }
	},
	defaults: {
		noclipSpeed: 1,
		noclipMaxSpeed: 16,
		noclipStep: .5,
		noclipFast: 2,
		noclipFaster: 4,
		noclipSlow: .05,
		carMaxed: !1,
		carFuel: 100,
		carEngineOn: !0
	}
}, settingsTab = {
	id: "settings",
	file: "settings",
	icon: "sliders",
	label: "ADMIN_TAB_SETTINGS",
	desc: "ADMIN_TAB_SETTINGS_DESC",
	cards: [{
		icon: "gauge",
		title: "ADMIN_C_NOCLIP",
		desc: "ADMIN_C_NOCLIP_DESC",
		fields: [
			{
				widget: "number",
				path: "noclipSpeed",
				label: "ADMIN_F_NOCLIP_SPEED",
				hint: "ADMIN_H_NOCLIP_SPEED",
				min: .1,
				max: 50,
				step: .5
			},
			{
				widget: "number",
				path: "noclipMaxSpeed",
				label: "ADMIN_F_NOCLIP_MAX",
				hint: "ADMIN_H_NOCLIP_MAX",
				min: 1,
				max: 100,
				step: 1
			},
			{
				widget: "number",
				path: "noclipStep",
				label: "ADMIN_F_NOCLIP_STEP",
				hint: "ADMIN_H_NOCLIP_STEP",
				min: .1,
				max: 10,
				step: .1
			},
			{
				widget: "number",
				path: "noclipFast",
				label: "ADMIN_F_NOCLIP_FAST",
				hint: "ADMIN_H_NOCLIP_FAST",
				min: 1,
				max: 20,
				step: .5,
				unit: "x"
			},
			{
				widget: "number",
				path: "noclipFaster",
				label: "ADMIN_F_NOCLIP_FASTER",
				hint: "ADMIN_H_NOCLIP_FASTER",
				min: 1,
				max: 50,
				step: .5,
				unit: "x"
			},
			{
				widget: "number",
				path: "noclipSlow",
				label: "ADMIN_F_NOCLIP_SLOW",
				hint: "ADMIN_H_NOCLIP_SLOW",
				min: .01,
				max: 1,
				step: .01,
				unit: "x"
			}
		]
	}, {
		icon: "car",
		title: "ADMIN_C_CAR",
		desc: "ADMIN_C_CAR_DESC",
		fields: [
			{
				widget: "switch",
				path: "carMaxed",
				label: "ADMIN_F_CAR_MAXED",
				hint: "ADMIN_H_CAR_MAXED"
			},
			{
				widget: "number",
				path: "carFuel",
				label: "ADMIN_F_CAR_FUEL",
				min: 0,
				max: 100,
				step: 5,
				unit: "%"
			},
			{
				widget: "switch",
				path: "carEngineOn",
				label: "ADMIN_F_CAR_ENGINE",
				hint: "ADMIN_H_CAR_ENGINE"
			}
		]
	}]
}, worldTab = {
	id: "world",
	file: "controls",
	icon: "snowflake",
	label: "ADMIN_TAB_WORLD",
	desc: "ADMIN_TAB_WORLD_DESC",
	cards: [{
		icon: "snowflake",
		title: "ADMIN_C_WEATHER",
		desc: "ADMIN_C_WEATHER_DESC",
		fields: [{
			widget: "select",
			path: "weather",
			label: "ADMIN_F_WEATHER",
			hint: "ADMIN_H_WEATHER",
			options: [{
				value: "",
				label: "ADMIN_O_WEATHER_NONE"
			}, ...WEATHERS.map((w) => ({
				value: w,
				label: `WEATHER_${w}`
			}))]
		}, {
			widget: "switch",
			path: "blackout",
			label: "ADMIN_F_BLACKOUT",
			hint: "ADMIN_H_BLACKOUT"
		}]
	}, {
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
				unit: "h"
			},
			{
				widget: "number",
				path: "minute",
				label: "ADMIN_F_MINUTE",
				min: 0,
				max: 59,
				step: 5,
				unit: "min"
			},
			{
				widget: "switch",
				path: "freezeTime",
				label: "ADMIN_F_FREEZE",
				hint: "ADMIN_H_FREEZE"
			}
		]
	}]
}, panel = new AdminPanel({
	title: "ADMIN_TITLE",
	icon: "user",
	files: {
		settings: settingsFile,
		controls: controlsFile
	},
	tabs: [
		settingsTab,
		messagesTab,
		worldTab
	]
}), settings = panel.view("settings", readSettings), controls = panel.view("controls", readControls), content = {
	get settings() {
		return settings.value;
	},
	get controls() {
		return controls.value;
	}
};
function commitControls(change) {
	let current = panel.get("controls");
	Object.entries(change).every(([k, v]) => current[k] === v) || panel.commit("controls", void 0, {
		...current,
		...change
	});
}
// resource/server/actions/messages.ts
const messageActions = {
	announce(source, text) {
		let message = text.trim().slice(0, 300);
		if (!message) return "ERR_MESSAGE_EMPTY";
		let { announceKind, announceSeconds } = content.controls;
		return notify(-1, Locale("NOTIFY_ANNOUNCE", message), announceKind, announceSeconds * 1e3), actionLog("announced", source, void 0, { text: message }), null;
	},
	warn(source, target, reason) {
		let text = reason.trim().slice(0, 300);
		return text ? target === source || !isOnline(target) ? "ERR_TARGET" : (emitNet(EVENTS.warned, target, text), source > 0 && notify(source, Locale("NOTIFY_WARNED", playerLabel(target)), "success"), actionLog("warned a player", source, target, { reason: text }), null) : "ERR_REASON_EMPTY";
	}
}, pos = (source) => ({ ...coordsOf(source) }), teleportActions = {
	noclip(source) {
		return emitNet(EVENTS.toggleNoclip, source), null;
	},
	tpm(source) {
		return emitNet(EVENTS.teleport, source, null), actionLog("teleported to the waypoint", source), null;
	},
	tp(source, point) {
		return emitNet(EVENTS.teleport, source, point), actionLog("teleported to coordinates", source, void 0, { ...point }), null;
	},
	goto(source, target) {
		if (target === source || !isOnline(target)) return "ERR_TARGET";
		let point = pos(target);
		return emitNet(EVENTS.teleport, source, point), actionLog("went to a player", source, target, point), null;
	},
	bring(source, target) {
		if (target === source || !isOnline(target)) return "ERR_TARGET";
		let point = pos(source);
		return emitNet(EVENTS.teleport, target, point), notify(target, Locale("NOTIFY_BROUGHT"), "info"), actionLog("brought a player", source, target, point), null;
	},
	coords(source) {
		return emitNet(EVENTS.coords, source), null;
	}
}, owned = new EntityState(VEHICLE_BAGS.owned, stateBoolean), ped = (source) => GetPlayerPed(String(source)), vehicleActions = {
	async car(source, model) {
		let hashName = model.toLowerCase();
		if (!/^[a-z0-9_]{1,32}$/.test(hashName)) return "ERR_MODEL";
		let type = await vehicleType(hashName, source);
		if (!type || !isOnline(source)) return "ERR_MODEL";
		let admin = ped(source), current = vehicleOf(source, { driver: !0 });
		current && owned.get(current) !== !0 && DeleteEntity(current);
		let p = pos(source);
		return await spawnVehicle({
			model: hashName,
			type,
			coords: {
				...p,
				heading: GetEntityHeading(admin)
			},
			fuel: content.settings.carFuel,
			setup: {
				maxed: content.settings.carMaxed || void 0,
				engineOn: content.settings.carEngineOn || void 0,
				dirt: 0
			},
			driver: source,
			keysTo: source,
			purpose: "temporary",
			persistent: !1
		}) === null ? "ERR_VEHICLE" : (notify(source, Locale("NOTIFY_CAR_SPAWNED", hashName), "success"), actionLog("spawned a vehicle", source, void 0, {
			model: hashName,
			...p
		}), null);
	},
	dv(source) {
		let vehicle = nearestVehicleTo(source, 5);
		if (!vehicle) return "ERR_NO_VEHICLE";
		let metadata = {
			model: GetEntityModel(vehicle),
			plate: plateOf(vehicle),
			...pos(source)
		};
		return DeleteEntity(vehicle), notify(source, Locale("NOTIFY_DV_DONE"), "success"), actionLog("deleted a vehicle", source, void 0, metadata), null;
	},
	giveKeys(source, target) {
		if (source <= 0) return "ERR_PLAYER_ONLY";
		let vehicle = nearestVehicleTo(source, 5);
		if (!vehicle) return "ERR_NO_VEHICLE";
		vehicleKeys.give(target, vehicle, "temporary");
		let plate = plateOf(vehicle);
		return notify(source, Locale("NOTIFY_KEYS_GIVEN", plate, playerLabel(target)), "success"), actionLog("gave vehicle keys", source, target, { plate }), null;
	}
}, actions = {
	...teleportActions,
	...healthActions,
	...vehicleActions,
	...banActions,
	...messageActions,
	...itemActions
}, id = {
	name: "id",
	type: "playerId",
	help: Locale("COMMAND_P_ID")
}, optionalId = {
	...id,
	help: Locale("COMMAND_P_ID_SELF"),
	optional: !0
}, log$1 = createLogger(ResourceName);
function reply(source, error) {
	error && (source > 0 ? notify(source, Locale(error), "error") : log$1.info(Locale(error)));
}
const self = (source, run) => source > 0 ? run() : "ERR_PLAYER_ONLY", answer = async (source, result) => reply(source, await result);
// resource/server/commands/teleport.ts
function parsePoint(text) {
	let numbers = (text.replace(/vec(tor)?[234]/gi, "").match(/-?\d+(\.\d+)?/g) ?? []).map(Number), [x, y, z] = numbers;
	return x === void 0 || y === void 0 || numbers.length > 4 ? null : z === void 0 ? {
		x,
		y
	} : {
		x,
		y,
		z
	};
}
addCommand("noclip", {
	help: Locale("COMMAND_NOCLIP"),
	restricted: !0
}, (source) => answer(source, self(source, () => actions.noclip(source)))), addCommand("tpm", {
	help: Locale("COMMAND_TPM"),
	restricted: !0
}, (source) => answer(source, self(source, () => actions.tpm(source)))), addCommand("tp", {
	help: Locale("COMMAND_TP"),
	restricted: !0,
	params: [{
		name: "coords",
		type: "longString",
		help: Locale("COMMAND_P_COORDS")
	}]
}, (source, args) => {
	let point = parsePoint(args.coords);
	return answer(source, point ? self(source, () => actions.tp(source, point)) : "ERR_COORDS");
}), addCommand("goto", {
	help: Locale("COMMAND_GOTO"),
	restricted: !0,
	params: [id]
}, (source, args) => answer(source, self(source, () => actions.goto(source, args.id)))), addCommand("bring", {
	help: Locale("COMMAND_BRING"),
	restricted: !0,
	params: [id]
}, (source, args) => answer(source, self(source, () => actions.bring(source, args.id)))), addCommand("coords", {
	help: Locale("COMMAND_COORDS"),
	restricted: !0
}, (source) => answer(source, self(source, () => actions.coords(source)))), addCommand("heal", {
	help: Locale("COMMAND_HEAL"),
	restricted: !0,
	params: [optionalId]
}, (source, args) => {
	let target = args.id ?? source;
	return answer(source, target > 0 ? actions.heal(source, target) : "ERR_PLAYER_ONLY");
}), addCommand("revive", {
	help: Locale("COMMAND_REVIVE"),
	restricted: !0,
	params: [optionalId]
}, (source, args) => {
	let target = args.id ?? source;
	return answer(source, target > 0 ? actions.revive(source, target) : "ERR_PLAYER_ONLY");
}), addCommand("car", {
	help: Locale("COMMAND_CAR"),
	restricted: !0,
	params: [{
		name: "model",
		type: "string",
		help: Locale("COMMAND_P_MODEL")
	}]
}, (source, args) => answer(source, self(source, () => actions.car(source, args.model)))), addCommand("dv", {
	help: Locale("COMMAND_DV"),
	restricted: !0
}, (source) => answer(source, self(source, () => actions.dv(source)))), addCommand("givekey", {
	help: Locale("COMMAND_GIVEKEY"),
	restricted: !0,
	params: [optionalId]
}, (source, args) => answer(source, actions.giveKeys(source, args.id ?? source))), addCommand("admin", {
	help: Locale("COMMAND_ADMIN"),
	restricted: !0
}, (source) => answer(source, self(source, () => actions.panel(source)))), addCommand("items", {
	help: Locale("COMMAND_ITEMS"),
	restricted: !0
}, (source) => answer(source, self(source, () => (emitNet(EVENTS.openItems, source), null)))), addCommand("adminmenu", {
	help: Locale("COMMAND_ADMINMENU"),
	restricted: !0
}, (source) => answer(source, self(source, () => (emitNet(EVENTS.openMenu, source), null)))), addCommand("announce", {
	help: Locale("COMMAND_ANNOUNCE"),
	restricted: !0,
	params: [{
		name: "message",
		type: "longString",
		help: Locale("COMMAND_P_MESSAGE")
	}]
}, (source, args) => answer(source, actions.announce(source, args.message)));
// resource/server/actions/world.ts
const log = createLogger(ResourceName);
function done(source, ok, text, change) {
	return ok ? (source > 0 ? notify(source, text, "success") : log.info(text), commitControls(change), aiLog("actions", "changed the world", {
		source: source > 0 ? source : void 0,
		metadata: change
	}), null) : "ERR_NO_WEATHER";
}
const worldActions = {
	weather(source, type) {
		let weather = type.toUpperCase();
		return done(source, isWeather(weather) && world.setWeather(weather), Locale("NOTIFY_WEATHER", weather), { weather: isWeather(weather) ? weather : "" });
	},
	time(source, hour, minute) {
		return !Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59 ? "ERR_TIME" : done(source, world.setTime(hour, minute), Locale("NOTIFY_TIME", hour, String(minute).padStart(2, "0")), {
			hour,
			minute
		});
	},
	freeze(source, on) {
		return done(source, world.freezeTime(on), Locale(on ? "NOTIFY_FREEZE_ON" : "NOTIFY_FREEZE_OFF"), { freezeTime: on });
	},
	blackout(source, on) {
		return done(source, world.setBlackout(on), Locale(on ? "NOTIFY_BLACKOUT_ON" : "NOTIFY_BLACKOUT_OFF"), { blackout: on });
	}
};
addCommand("weather", {
	help: Locale("COMMAND_WEATHER"),
	params: [{
		name: "type",
		type: "string",
		help: Locale("COMMAND_P_WEATHER")
	}],
	restricted: !0
}, (source, args) => reply(source, worldActions.weather(source, args.type))), addCommand("time", {
	help: Locale("COMMAND_TIME"),
	params: [{
		name: "hour",
		type: "number",
		help: Locale("COMMAND_P_HOUR")
	}, {
		name: "minute",
		type: "number",
		help: Locale("COMMAND_P_MINUTE"),
		optional: !0
	}],
	restricted: !0
}, (source, args) => reply(source, worldActions.time(source, args.hour, args.minute ?? 0))), addCommand("blackout", {
	help: Locale("COMMAND_BLACKOUT"),
	params: [{
		name: "on",
		type: "number",
		help: Locale("COMMAND_P_ON")
	}],
	restricted: !0
}, (source, args) => reply(source, worldActions.blackout(source, args.on === 1))), addCommand("freezetime", {
	help: Locale("COMMAND_FREEZETIME"),
	params: [{
		name: "on",
		type: "number",
		help: Locale("COMMAND_P_ON")
	}],
	restricted: !0
}, (source, args) => reply(source, worldActions.freeze(source, args.on === 1)));
// resource/server/commands/items.ts
const itemParams = [
	{
		name: "id",
		type: "playerId",
		help: Locale("COMMAND_P_ID")
	},
	{
		name: "item",
		type: "string",
		help: Locale("COMMAND_P_ITEM")
	},
	{
		name: "count",
		type: "number",
		help: Locale("COMMAND_P_COUNT"),
		optional: !0
	}
];
addCommand("giveitem", {
	help: Locale("COMMAND_GIVEITEM"),
	restricted: !0,
	params: itemParams
}, (source, args) => answer(source, actions.giveItem(source, args.id, args.item, args.count ?? 1))), addCommand("removeitem", {
	help: Locale("COMMAND_REMOVEITEM"),
	restricted: !0,
	params: itemParams
}, (source, args) => answer(source, actions.removeItem(source, args.id, args.item, args.count ?? 0))), addCommand("clearinv", {
	help: Locale("COMMAND_CLEARINV"),
	restricted: !0,
	params: [{
		name: "id",
		type: "playerId",
		help: Locale("COMMAND_P_ID")
	}]
}, (source, args) => answer(source, actions.clearInventory(source, args.id))), addCommand("openinv", {
	help: Locale("COMMAND_OPENINV"),
	restricted: !0,
	params: [{
		name: "id",
		type: "playerId",
		help: Locale("COMMAND_P_ID")
	}]
}, (source, args) => answer(source, actions.openInventory(source, args.id)));
// resource/server/framework/tell.ts
const tell = (source, text) => {
	source > 0 ? notify(source, text, "success") : console.log(text);
};
// resource/server/framework/cleanup.ts
function deleteAll(source, kind) {
	let players = new Set(), ridden = new Set();
	for (let id of getPlayers()) {
		let ped = GetPlayerPed(id);
		players.add(ped);
		let vehicle = GetVehiclePedIsIn(ped, !1);
		vehicle && ridden.add(vehicle);
	}
	let list = kind === "vehicles" ? GetAllVehicles() : kind === "peds" ? GetAllPeds() : GetAllObjects(), count = 0;
	for (let entity of list) players.has(entity) || ridden.has(entity) || (DeleteEntity(entity), count++);
	return tell(source, Locale("NOTIFY_DELETED_ALL", count)), actionLog(`deleted every ${kind}`, source, void 0, { count }), null;
}
// resource/server/framework/jobs.ts
const core$3 = resourceExport("ai-core"), jobActions = {
	setJob(source, target, job, grade) {
		if (!isOnline(target)) return "ERR_TARGET";
		if (job === "unemployed") for (let m of core$3.GetJobs(target) ?? []) core$3.RemoveJob(target, m.job);
		else {
			let def = definitions.job(job);
			if (!def) return "ERR_JOB";
			if (!def.grades[grade]) return "ERR_GRADE";
			if (!core$3.SetJob(target, job, grade)) return "ERR_JOB";
		}
		return tell(source, Locale("NOTIFY_JOB_SET", playerLabel(target), job, grade)), actionLog("set a job", source, target, {
			job,
			grade
		}), null;
	},
	setGang(source, target, gang, grade) {
		if (!isOnline(target)) return "ERR_TARGET";
		if (gang === "none") for (let m of core$3.GetGangs(target) ?? []) core$3.RemoveGang(target, m.gang);
		else {
			let def = definitions.gang(gang);
			if (!def) return "ERR_GANG";
			if (!def.grades[grade]) return "ERR_GRADE";
			if (!core$3.SetGang(target, gang, grade)) return "ERR_GANG";
		}
		return tell(source, Locale("NOTIFY_GANG_SET", playerLabel(target), gang, grade)), actionLog("set a gang", source, target, {
			gang,
			grade
		}), null;
	},
	showJob(source) {
		let current = core$3.GetCurrentJob(source);
		if (!current) return "ERR_PLAYER_ONLY";
		let def = definitions.job(current.job), duty = online.dutyJob(source) === current.job;
		return notify(source, Locale("NOTIFY_JOB_INFO", def?.label ?? current.job, def?.grades[current.grade]?.label ?? String(current.grade), Locale(duty ? "NOTIFY_ON_DUTY" : "NOTIFY_OFF_DUTY")), "info"), null;
	},
	showGang(source) {
		let active = core$3.GetActiveGang(source), grade = active ? online.gangGrade(source, active) : null;
		if (!active || grade === null) return notify(source, Locale("NOTIFY_NO_GANG"), "info"), null;
		let def = definitions.gang(active);
		return notify(source, Locale("NOTIFY_GANG_INFO", def?.label ?? active, def?.grades[grade]?.label ?? String(grade)), "info"), null;
	}
}, core$2 = resourceExport("ai-core");
function money(source, target, account, amount, set) {
	return isOnline(target) ? core$2.GetAccountTypes()[account] ? !Number.isInteger(amount) || amount < +!set || amount > 1e9 || !(set ? core$2.SetMoney(target, account, amount, "admin") : core$2.AddMoney(target, account, amount, "admin")) ? "ERR_AMOUNT" : (tell(source, Locale(set ? "NOTIFY_MONEY_SET" : "NOTIFY_MONEY_GIVEN", playerLabel(target), account, amount)), actionLog(set ? "set money" : "gave money", source, target, {
		account,
		amount
	}), null) : "ERR_ACCOUNT" : "ERR_TARGET";
}
// resource/server/framework/permissions.ts
const PERMISSION = /^[a-z0-9_]{1,24}$/;
function permission(source, target, permission, add) {
	if (!isOnline(target)) return "ERR_TARGET";
	let group = permission.toLowerCase();
	return PERMISSION.test(group) ? (ExecuteCommand(`${add ? "add_principal" : "remove_principal"} player.${target} group.${group}`), tell(source, Locale(add ? "NOTIFY_PERMISSION_ADDED" : "NOTIFY_PERMISSION_REMOVED", playerLabel(target), group)), actionLog(add ? "added a permission" : "removed a permission", source, target, { group }), null) : "ERR_PERMISSION";
}
// resource/server/framework/serverLock.ts
const core$1 = resourceExport("ai-core"), isAdmin = (source) => !!IsPlayerAceAllowed(String(source), ADMIN.ace), serverLock = new class {
	closed = null;
	constructor() {
		core$1.AddConnectionCheck("ai-admin:closed", (source) => this.closed !== null && !isAdmin(source) ? Locale("KICK_CLOSED", this.closed) : null);
	}
	close(source, reason) {
		if (this.closed !== null) return "ERR_ALREADY_CLOSED";
		this.closed = reason?.trim().slice(0, 200) || Locale("KICK_NO_REASON");
		for (let id of getPlayers()) isAdmin(Number(id)) || DropPlayer(id, Locale("KICK_CLOSED", this.closed));
		return tell(source, Locale("NOTIFY_SERVER_CLOSED")), actionLog("closed the server", source, void 0, { reason: this.closed }), null;
	}
	open(source) {
		return this.closed === null ? "ERR_ALREADY_OPEN" : (this.closed = null, tell(source, Locale("NOTIFY_SERVER_OPENED")), actionLog("opened the server", source), null);
	}
}(), gradeParam = {
	name: "grade",
	type: "number",
	help: Locale("COMMAND_P_GRADE")
};
addCommand("setjob", {
	help: Locale("COMMAND_SETJOB"),
	restricted: !0,
	params: [
		id,
		{
			name: "job",
			type: "string",
			help: Locale("COMMAND_P_JOB")
		},
		gradeParam
	]
}, (source, args) => reply(source, jobActions.setJob(source, args.id, args.job, args.grade))), addCommand("setgang", {
	help: Locale("COMMAND_SETGANG"),
	restricted: !0,
	params: [
		id,
		{
			name: "gang",
			type: "string",
			help: Locale("COMMAND_P_GANG")
		},
		gradeParam
	]
}, (source, args) => reply(source, jobActions.setGang(source, args.id, args.gang, args.grade))), addCommand("job", { help: Locale("COMMAND_JOB") }, (source) => reply(source, source > 0 ? jobActions.showJob(source) : "ERR_PLAYER_ONLY")), addCommand("gang", { help: Locale("COMMAND_GANG") }, (source) => reply(source, source > 0 ? jobActions.showGang(source) : "ERR_PLAYER_ONLY"));
const moneyParams = [
	id,
	{
		name: "account",
		type: "string",
		help: Locale("COMMAND_P_ACCOUNT")
	},
	{
		name: "amount",
		type: "number",
		help: Locale("COMMAND_P_AMOUNT")
	}
];
addCommand(["givemoney", "giveaccountmoney"], {
	help: Locale("COMMAND_GIVEMONEY"),
	restricted: !0,
	params: moneyParams
}, (source, args) => reply(source, money(source, args.id, args.account, args.amount, !1))), addCommand(["setmoney", "setaccountmoney"], {
	help: Locale("COMMAND_SETMONEY"),
	restricted: !0,
	params: moneyParams
}, (source, args) => reply(source, money(source, args.id, args.account, args.amount, !0))), addCommand("dvall", {
	help: Locale("COMMAND_DVALL"),
	restricted: !0
}, (source) => reply(source, deleteAll(source, "vehicles"))), addCommand("dvp", {
	help: Locale("COMMAND_DVP"),
	restricted: !0
}, (source) => reply(source, deleteAll(source, "peds"))), addCommand("dvo", {
	help: Locale("COMMAND_DVO"),
	restricted: !0
}, (source) => reply(source, deleteAll(source, "objects")));
const permissionParams = [id, {
	name: "permission",
	type: "string",
	help: Locale("COMMAND_P_PERMISSION")
}];
addCommand("addpermission", {
	help: Locale("COMMAND_ADDPERMISSION"),
	restricted: !0,
	params: permissionParams
}, (source, args) => reply(source, permission(source, args.id, args.permission, !0))), addCommand("removepermission", {
	help: Locale("COMMAND_REMOVEPERMISSION"),
	restricted: !0,
	params: permissionParams
}, (source, args) => reply(source, permission(source, args.id, args.permission, !1))), addCommand("closeserver", {
	help: Locale("COMMAND_CLOSESERVER"),
	restricted: !0,
	params: [{
		name: "reason",
		type: "longString",
		help: Locale("COMMAND_P_REASON"),
		optional: !0
	}]
}, (source, args) => reply(source, serverLock.close(source, args.reason))), addCommand("openserver", {
	help: Locale("COMMAND_OPENSERVER"),
	restricted: !0
}, (source) => reply(source, serverLock.open(source)));
// resource/server/controls.ts
const core = resourceExport("ai-core"), WORLD_FIELDS = [
	"weather",
	"hour",
	"minute",
	"freezeTime",
	"blackout"
];
new class {
	last = readControls(panel.get("controls"));
	constructor() {
		panel.rule("controls", (_key, next) => this.check(readControls(next))), panel.onChange("controls", () => this.edited()), panel.onAction("announceSend", (admin, raw) => {
			let form = readControls(raw);
			return form.announceText ? (actions.announce(admin, form.announceText), commitControls({ announceText: "" }), null) : "ERR_MESSAGE_EMPTY";
		}), panel.onAction("warnSend", (admin, raw) => {
			let form = readControls(raw), target = form.warnPlayer ? core.GetSourceByCitizenId(form.warnPlayer) : null;
			return target === null || target === admin ? "ERR_TARGET" : form.warnReason ? (actions.warn(admin, target, form.warnReason), commitControls({
				warnReason: "",
				warnPlayer: ""
			}), null) : "ERR_REASON_EMPTY";
		});
	}
	check(next) {
		return WORLD_FIELDS.some((f) => next[f] !== this.last[f]) && world.getWeather() === null ? "ERR_NO_WEATHER" : null;
	}
	edited() {
		let before = this.last, now = readControls(panel.get("controls"));
		this.last = now;
		let admin = panel.editor;
		admin !== 0 && (now.weather !== before.weather && now.weather && worldActions.weather(admin, now.weather), (now.hour !== before.hour || now.minute !== before.minute) && worldActions.time(admin, now.hour, now.minute), now.freezeTime !== before.freezeTime && worldActions.freeze(admin, now.freezeTime), now.blackout !== before.blackout && worldActions.blackout(admin, now.blackout));
	}
}(), onClientCallback(EVENTS.access, (source) => !!IsPlayerAceAllowed(String(source), ADMIN.ace)), onClientCallback(EVENTS.noclip, { args: ([on]) => typeof on == "boolean" ? [on] : null }, (source, on) => on && !IsPlayerAceAllowed(String(source), ADMIN.ace) ? fail("ERR_NOT_ALLOWED") : (aiLog("actions", on ? "noclip on" : "noclip off", { source }), { ok: !0 })), onClientCallback(EVENTS.players, () => getPlayers().map((p) => ({
	id: Number(p),
	name: GetPlayerName(p)
})).sort((a, b) => a.id - b.id), {
	guards: [isAdmin$1()],
	rate: {
		count: 2,
		windowMs: 1e3
	}
}), onClientCallback(EVENTS.worldState, () => ({
	weather: world.getWeather(),
	time: world.getTime()
}), {
	guards: [isAdmin$1()],
	rate: {
		count: 2,
		windowMs: 1e3
	}
});
const parseAction = ([action, target, value]) => {
	if (!isMenuAction(action)) return null;
	let id = target == null ? null : readId(target);
	return target != null && id === null || value != null && !(typeof value == "string" && value.length <= 300) ? null : [
		action,
		id,
		value ?? null
	];
};
function runAction(source, action, target, value) {
	let who = target ?? source;
	if (!isOnline(who)) return "ERR_TARGET";
	switch (action) {
		case "tpm": return actions.tpm(source);
		case "heal": return actions.heal(source, who);
		case "revive": return actions.revive(source, who);
		case "car": return value ? actions.car(source, value) : "ERR_MODEL";
		case "dv": return actions.dv(source);
		case "goto": return actions.goto(source, who);
		case "bring": return actions.bring(source, who);
		case "panel": return actions.panel(source);
		case "item": {
			let [item = "", count = "1"] = (value ?? "").split(":");
			return actions.giveItem(source, who, item, Number(count));
		}
		case "inventory": return actions.openInventory(source, who);
		case "warn": return actions.warn(source, who, value ?? "");
		case "ban": {
			let text = value ?? "", at = text.indexOf(":");
			return at < 1 ? "ERR_BAN_LENGTH" : actions.ban(source, who, Number(text.slice(0, at)), text.slice(at + 1));
		}
		case "bans": return actions.bans(source);
		case "banRecords": return actions.banRecords(source, who);
		case "announce": return actions.announce(source, value ?? "");
		case "weather": return worldActions.weather(source, value ?? "");
		case "time": {
			let [hour = "", minute = "0"] = (value ?? "").split(":");
			return worldActions.time(source, Number(hour), Number(minute));
		}
		case "freeze": return worldActions.freeze(source, value === "1");
		case "blackout": return worldActions.blackout(source, value === "1");
		default: return action;
	}
}
onClientCallback(EVENTS.action, {
	args: parseAction,
	guards: [isAdmin$1()],
	lock: !0
}, async (source, action, target, value) => {
	let error = await runAction(source, action, target, value);
	return error ? fail(error) : { ok: !0 };
}), onClientCallback(EVENTS.giveItems, {
	args: ([target, list]) => {
		let id = target == null ? null : readId(target);
		if (target != null && id === null || !Array.isArray(list) || list.length === 0 || list.length > 50) return null;
		let items = list.flatMap((v) => {
			let name = isRecord(v) ? readText(v.name, 64) : null, count = isRecord(v) ? readInt(v.count, 1, 1e6) : null;
			return name !== null && count !== null ? [{
				name,
				count
			}] : [];
		});
		return items.length === list.length ? [id, items] : null;
	},
	guards: [isAdmin$1()],
	lock: !0
}, (source, target, items) => {
	let who = target ?? source;
	if (!isOnline(who)) return fail("ERR_TARGET");
	for (let { name, count } of items) {
		let error = actions.giveItem(source, who, name, count);
		if (error) return fail(error);
	}
	return { ok: !0 };
});
