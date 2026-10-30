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
function waitFor(check, timeoutMs = 1e4) {
	return new Promise((resolve, reject) => {
		let started = Date.now(), poll = () => {
			let value = check();
			if (value !== void 0) return resolve(value);
			if (timeoutMs !== !1 && Date.now() - started > timeoutMs) return reject(Error(`waitFor timed out after ${timeoutMs} ms`));
			setTimeout(poll, 0);
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
function record(value) {
	return typeof value == "object" && value && !Array.isArray(value) ? value : {};
}
// ../../../packages/lib/src/shared/index.ts
function isRecord(value) {
	return typeof value == "object" && !!value && !Array.isArray(value);
}
function logSafe(text, max) {
	return text.replace(/\r?\n/g, " | ").replace(/[\u0000-\u001f\u007f]/g, "").replace(/\^\d/g, "").slice(0, max);
}
function formatText(template, args) {
	return template.replace(/\{(\d+)\}/g, (match, index) => {
		let value = args[Number(index)];
		return value === void 0 ? match : String(value);
	});
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
	playerUnloadedEvent: "ai-core:playerUnloaded",
	moneyChangedEvent: "ai-core:moneyChanged",
	jobsChangedEvent: "ai-core:jobsChanged",
	dutyChangedEvent: "ai-core:dutyChanged",
	gangsChangedEvent: "ai-core:gangsChanged",
	activeGangChangedEvent: "ai-core:activeGangChanged",
	characterScreenEvent: "ai-core:characterScreen",
	inventoryChangedEvent: "ai-core:inventoryChanged",
	itemUsedEvent: "ai-core:itemUsed",
	playerDiedEvent: "ai-core:playerDied",
	clientPlayerLoadedEvent: "ai-core:client:playerLoaded",
	clientPlayerUnloadedEvent: "ai-core:client:playerUnloaded",
	clientCharacterPortraitEvent: "ai-core:client:characterPortrait",
	clientCharacterLookEvent: "ai-core:client:characterLook",
	clientPromptPressedEvent: "ai-core:client:promptPressed",
	clientCacheEvent: "ai-core:client:cache",
	clientHudVisibleEvent: "ai-core:client:hudVisible",
	vehicleTypeCallback: "ai-core:vehicleType",
	interactionStateKey: "ai:interaction",
	charactersCallback: "ai-core:characters",
	createCharacterCallback: "ai-core:createCharacter",
	deleteCharacterCallback: "ai-core:deleteCharacter",
	selectCharacterCallback: "ai-core:selectCharacter",
	clientNotifyEvent: "ai-core:client:notify",
	spawnEvent: "ai-core:client:spawn",
	openCharactersEvent: "ai-core:client:openCharacters"
}, ADMIN = {
	ace: "ai.admin",
	openCallback: "ai-core:admin:open",
	applyCallback: "ai-core:admin:apply",
	closeEvent: "ai-core:admin:close",
	showEvent: "ai-core:admin:show",
	deltaEvent: "ai-core:admin:delta",
	worldEvent: (resource) => `${resource}:admin:world`,
	worldChangesCallback: (resource) => `${resource}:admin:worldChanges`
}, VEHICLE_BAGS = {
	owned: "ai:owned",
	id: "ai:vid",
	props: "ai:props",
	fuel: "fuel"
};
// ../../../packages/lib/src/fivem/exports.ts
function registerExport(name, handler) {
	globalThis.exports(name, handler);
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
resourceExport(CORE.resource);
const log$6 = createLogger(GetCurrentResourceName()), isAdmin = (ace = ADMIN.ace) => (source) => !!IsPlayerAceAllowed(String(source), ace) || `not allowed (${ace})`, gates = new Set();
on("playerDropped", () => {
	let source = Number(globalThis.source);
	for (let gate of gates) gate.release(source);
});
var ClientGate = class {
	name;
	options;
	limit;
	lock;
	constructor(name, options, defaultRate) {
		this.name = name, this.options = options, this.limit = new RateLimit(options.rate?.count ?? defaultRate, options.rate?.windowMs ?? 1e3), this.lock = options.lock ? new SourceLock() : null, gates.add(this);
	}
	check(source, raw) {
		if (!(source > 0) || !GetPlayerName(String(source)) || !this.limit.take(source)) return null;
		for (let guard of this.options.guards ?? []) {
			let verdict = guard(source);
			if (verdict !== !0) return typeof verdict == "string" && this.refuse(source, verdict), null;
		}
		if (!this.options.args) return [];
		let args = this.options.args(raw);
		return args === null && this.refuse(source, `invalid arguments ${logSafe(JSON.stringify(raw) ?? "", 200)}`), args;
	}
	run(source, busy, task) {
		return this.lock ? this.lock.run(source, busy, async () => task()) : Promise.resolve(task());
	}
	release(source) {
		this.limit.release(source), this.lock?.release(source);
	}
	refuse(source, reason) {
		log$6.warn(`${this.name} refused for ${GetPlayerName(String(source))} (${source}): ${reason}`);
	}
};
// ../../../packages/lib/src/server/callback.ts
const log$5 = createLogger(GetCurrentResourceName()), resource$1 = GetCurrentResourceName(), REFUSED = Symbol("refused");
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
			log$5.error(`callback ${name} failed for ${source}`, error), emitNet(responseEvent(caller), source, id, !1, null);
		}
	});
}
const pending = new Map();
let nextId = 0;
onNet(responseEvent(resource$1), (id, ok, result) => {
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
		}), emitNet(requestEvent(name), source, resource$1, id, ...args);
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
const clone = (value) => value === void 0 ? value : JSON.parse(JSON.stringify(value)), core$7 = resourceExport(CORE.resource), ERR = {
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
			list = core$7.GetLookupValues(source);
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
// ../../../packages/lib/src/server/admin/jsonSchema.ts
const SCHEMA_KEY = {
	type: "string",
	description: "This file's JSON Schema (for editors)."
};
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
		let path = prefix + field.path, label = lang[field.label] ?? field.label, hint = field.hint ? lang[field.hint] ?? field.hint : "";
		out.has(path) || out.set(path, hint ? `${label}: ${hint}` : label), field.widget === "list" && collect(field.rows, `${path}[].`, lang, out);
	}
}
function describe(schema, file, lang) {
	let out = new Map();
	for (let tab of schema.tabs) if (tab.file === file) for (let card of tab.cards) collect(card.fields, "", lang, out);
	return out;
}
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
// ../../../packages/lib/src/server/admin/panel.ts
const core$6 = resourceExport(CORE.resource), DEFAULT_KEY = "^[a-z0-9_]{2,32}$";
function imported(spec, value) {
	let base = clone(spec.newRecord ?? {}), out = {};
	for (let name of Object.keys(spec.sections)) {
		let v = name in value ? value[name] : base[name];
		v !== void 0 && (out[name] = clone(v));
	}
	return out;
}
var AdminPanel = class {
	schema;
	data = new Map();
	dataFiles = new Map();
	handlers = new Map();
	rules = new Map();
	worldChanges = new Map();
	resource = GetCurrentResourceName();
	log = createLogger(this.resource);
	constructor(schema) {
		this.schema = schema;
		for (let [name, spec] of Object.entries(schema.files)) this.load(name, spec);
		registerExport("AdminPanelSnapshot", () => this.snapshot()), registerExport("AdminPanelApply", (admin, patch) => this.apply(admin, patch)), onClientCallback(ADMIN.worldChangesCallback(this.resource), () => Object.fromEntries(this.worldChanges)), setImmediate(() => core$6.RegisterAdminPanel(this.resource));
	}
	get(file) {
		return this.data.get(file) ?? {};
	}
	onChange(file, handler) {
		this.handlers.set(file, [...this.handlers.get(file) ?? [], handler]);
	}
	rule(file, rule) {
		this.rules.set(file, rule);
	}
	snapshot() {
		return {
			resource: this.resource,
			schema: this.schema,
			texts: loadLocaleTexts(),
			data: clone(Object.fromEntries(this.data))
		};
	}
	apply(admin, raw) {
		let patch = toPatch(raw), spec = patch ? this.schema.files[patch.file] : void 0;
		if (!patch || !spec || spec.memory) return {
			ok: !1,
			error: ERR.type
		};
		let error = this.check(patch, spec);
		return error ? (this.log.warn(`admin ${admin} edit refused (${error}): ${JSON.stringify(patch).slice(0, 300)}`), {
			ok: !1,
			error
		}) : (this.store(patch, spec), { ok: !0 });
	}
	commit(file, key, value) {
		let data = this.data.get(file);
		data && (key === void 0 ? isRecord(value) && this.data.set(file, clone(value)) : value === null ? delete data[key] : data[key] = clone(value), this.changed(file, key));
	}
	check(patch, spec) {
		let data = this.get(patch.file);
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
				}
				let ruled = this.rules.get(patch.file)?.(key, record);
				if (ruled) return ruled;
			}
			return null;
		}
		let section = spec.sections[patch.section];
		if (!section || spec.kind === "records" && (!patch.key || !(patch.key in data))) return ERR.type;
		let refusal = validate(section, patch.value, patch.section);
		if (refusal) return refusal.error;
		let current = spec.kind === "records" ? data[patch.key ?? ""] : data, next = {
			...isRecord(current) ? current : {},
			[patch.section]: patch.value
		};
		return this.rules.get(patch.file)?.(patch.key, next) ?? null;
	}
	store(patch, spec) {
		let data = this.data.get(patch.file) ?? {};
		if (patch.action === "create") {
			let record = clone(spec.newRecord ?? {});
			spec.labelPath && (record[spec.labelPath] = patch.label), data[patch.key] = record;
		} else if (patch.action === "delete") delete data[patch.key];
		else if (patch.action === "import") {
			for (let [key, value] of Object.entries(patch.records)) data[key] = imported(spec, value);
			this.data.set(patch.file, data);
			for (let key of Object.keys(patch.records)) this.changed(patch.file, key);
			return;
		} else {
			let target = spec.kind === "records" ? data[patch.key ?? ""] : data;
			if (!isRecord(target)) return;
			patch.value === void 0 || patch.value === null ? delete target[patch.section] : target[patch.section] = clone(patch.value);
		}
		this.data.set(patch.file, data), this.changed(patch.file, spec.kind === "records" ? patch.key : void 0);
	}
	changed(file, key) {
		let spec = this.schema.files[file], data = this.get(file), value = key === void 0 ? data : data[key] ?? null;
		this.dataFiles.get(file)?.write(data);
		for (let handler of this.handlers.get(file) ?? []) handler(key, value);
		if (core$6.AdminPanelChanged({
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
// ../../../packages/lib/src/server/log.ts
function aiLog(channel, message, options) {
	optionalExport("ai-core")?.Log(channel, message, options);
}
function aiLogChannels(channels) {
	optionalExport("ai-core")?.LogChannels(channels);
}
// ../../../packages/lib/src/server/notify.ts
function notify(source, text, kind = "info", duration) {
	let notification = {
		text,
		kind,
		duration
	};
	emitNet(CORE.clientNotifyEvent, source, notification);
}
resourceExport(CORE.resource);
// ../../../packages/lib/src/server/online.ts
const core$4 = resourceExport(CORE.resource);
var OnlinePlayers = class {
	players = new Map();
	onDuty = new Map();
	started = !1;
	start() {
		if (this.started) return;
		this.started = !0;
		let load = (source, character) => {
			this.put(source, character, (core$4.GetJobs(source) ?? []).map((m) => m.job), (core$4.GetGangs(source) ?? []).map((m) => m.gang)), this.setDuty(source, core$4.GetDutyJob(source));
		};
		on(CORE.playerLoadedEvent, load), on(CORE.playerUnloadedEvent, (source) => this.drop(source)), on(CORE.jobsChangedEvent, (source, jobs) => {
			let player = this.players.get(source);
			player && (player.jobs = jobs.map((m) => m.job));
		}), on(CORE.gangsChangedEvent, (source, gangs) => {
			let player = this.players.get(source);
			player && (player.gangs = gangs.map((m) => m.gang));
		}), on(CORE.dutyChangedEvent, (source, job) => this.setDuty(source, job));
		for (let source of core$4.GetLoadedSources()) {
			let character = core$4.GetCharacter(source);
			character && load(source, character);
		}
	}
	put(source, character, jobs, gangs) {
		this.drop(source), this.players.set(source, {
			character,
			jobs,
			gangs,
			duty: null
		});
	}
	drop(source) {
		this.setDuty(source, null), this.players.delete(source);
	}
	setDuty(source, job) {
		let player = this.players.get(source);
		if (!player || (player.duty && this.onDuty.get(player.duty)?.delete(source), player.duty = job, !job)) return;
		let set = this.onDuty.get(job);
		set || this.onDuty.set(job, set = new Set()), set.add(source);
	}
	sources() {
		return this.start(), this.players.keys();
	}
	get size() {
		return this.start(), this.players.size;
	}
	character(source) {
		return this.start(), this.players.get(source)?.character ?? null;
	}
	jobs(source) {
		return this.start(), this.players.get(source)?.jobs ?? [];
	}
	gangs(source) {
		return this.start(), this.players.get(source)?.gangs ?? [];
	}
	dutyJob(source) {
		return this.start(), this.players.get(source)?.duty ?? null;
	}
	onDutyFor(job) {
		return this.start(), this.onDuty.get(job) ?? EMPTY;
	}
};
const EMPTY = new Set();
new OnlinePlayers();
// ../../../packages/lib/src/server/vehicleKeys.ts
const core$3 = resourceExport(CORE.resource), vehicleKeys = {
	give: (source, vehicle, purpose = "temporary") => core$3.GiveVehicleKeys(source, vehicle, purpose),
	remove: (source, vehicle) => core$3.RemoveVehicleKeys(source, vehicle),
	has: (source, vehicle) => core$3.HasVehicleKeys(source, vehicle)
}, TYPES = new Set([
	"automobile",
	"bike",
	"boat",
	"heli",
	"plane",
	"submarine",
	"trailer",
	"train"
]), types = new Map();
async function vehicleType(model, asker) {
	let known = types.get(model);
	if (known !== void 0) return known;
	let answer = await triggerClientCallback(CORE.vehicleTypeCallback, asker, [model]).catch(() => null);
	return typeof answer != "string" || !TYPES.has(answer) ? null : (types.set(model, answer), answer);
}
async function spawnVehicle(options) {
	let type = options.asker === void 0 ? options.type ?? "automobile" : await vehicleType(options.model, options.asker);
	if (!type) return null;
	let { x, y, z, heading } = options.coords, vehicle = CreateVehicleServerSetter(GetHashKey(options.model), type, x, y, z, heading);
	if (!await waitFor(() => DoesEntityExist(vehicle) || void 0, 5e3).catch(() => !1)) return null;
	options.persistent !== !1 && SetEntityOrphanMode(vehicle, 2), options.plate && SetVehicleNumberPlateText(vehicle, options.plate.slice(0, 8));
	let state = Entity(vehicle).state;
	options.fuel !== void 0 && state.set(VEHICLE_BAGS.fuel, options.fuel, !0);
	for (let [key, value] of Object.entries(options.bags ?? {})) state.set(key, value, !0);
	return options.driver !== void 0 && SetPedIntoVehicle(GetPlayerPed(String(options.driver)), vehicle, -1), options.keysTo !== void 0 && vehicleKeys.give(options.keysTo, vehicle, options.purpose ?? "temporary"), vehicle;
}
function nearestVehicleTo(source, metres) {
	let ped = GetPlayerPed(String(source)), own = GetVehiclePedIsIn(ped, !1);
	if (own) return own;
	let [x = 0, y = 0, z = 0] = GetEntityCoords(ped), best = 0, bestDistance = metres;
	for (let vehicle of GetAllVehicles()) {
		let [vx = 0, vy = 0, vz = 0] = GetEntityCoords(vehicle), d = Math.hypot(vx - x, vy - y, vz - z);
		d < bestDistance && ([best, bestDistance] = [vehicle, d]);
	}
	return best;
}
resourceExport(CORE.resource);
// ../../../packages/lib/src/server/command.ts
const resource = GetCurrentResourceName(), log$4 = createLogger(resource);
let texts = null;
const t = (key, ...args) => formatText((texts ??= loadLocaleTexts(CORE.resource))[key] ?? key, args);
function reply$1(source, text, kind) {
	source > 0 ? notify(source, text, kind) : log$4.info(text);
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
		let fail = (error) => log$4.error(`command /${name} failed`, error);
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
const commands = new class {
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
function addCommand(name, options, handler) {
	let names = (Array.isArray(name) ? name : [name]).map((n) => n.toLowerCase());
	if (names.length === 0) throw Error("addCommand needs a name");
	let restricted = options.restricted ?? !1, aces = restricted === !1 ? null : restricted === !0 ? [ADMIN.ace] : Array.isArray(restricted) ? [...restricted] : [restricted], command = new Command(names, options.params ?? [], options.help ?? "", aces, handler);
	for (let n of names) RegisterCommand(n, (source, raw, line) => command.run(Number(source), n, raw, line), !1);
	commands.add(command);
}
createLogger(GetCurrentResourceName()), createLogger("aicore-lib");
// ../../../packages/lib/src/fivem/state.ts
const stateBoolean = (v) => typeof v == "boolean" ? v : void 0, isServer = IsDuplicityVersion();
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
}, EntityState$1 = class extends Mirror {
	handles = new Map();
	constructor(key, parse) {
		super(key, parse), AddStateBagChangeHandler(key, "", (bag, _key, value) => {
			if (!bag.startsWith("entity:")) return;
			let netId = Number(bag.slice(7));
			this.handles.set(netId, GetEntityFromStateBagName(bag)), this.store(netId, value);
		}), isServer ? on("entityRemoved", (entity) => this.forget(NetworkGetNetworkIdFromEntity(entity))) : setInterval(() => this.prune(), 3e4);
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
}, EntityState = class extends EntityState$1 {
	set(entity, value) {
		DoesEntityExist(entity) && (Entity(entity).state.set(this.key, value ?? null, !0), this.put(entity, value));
	}
};
// ../../../packages/lib/src/server/world.ts
const core$1 = resourceExport(CORE.resource), world = {
	getWeather: () => core$1.GetWeather(),
	setWeather: (type) => core$1.SetWeather(type),
	getTime: () => core$1.GetTime(),
	setTime: (hour, minute = 0) => core$1.SetTime(hour, minute),
	setBlackout: (on) => core$1.SetBlackout(on),
	freezeTime: (on) => core$1.FreezeTime(on)
};
resourceExport(CORE.resource);
// ../../../packages/lib/src/server/index.ts
function isOnline(source) {
	return !!GetPlayerName(String(source));
}
// resource/common/locale.ts
const Locale = createLocale(), ResourceName = GetCurrentResourceName();
IsDuplicityVersion();
// resource/common/admin.ts
const EVENTS = {
	access: "ai-admin:access",
	noclip: "ai-admin:noclip",
	players: "ai-admin:players",
	action: "ai-admin:action",
	toggleNoclip: "ai-admin:client:toggleNoclip",
	teleport: "ai-admin:client:teleport",
	openMenu: "ai-admin:client:openMenu",
	coords: "ai-admin:client:coords"
}, MENU_ACTIONS = [
	"tpm",
	"heal",
	"revive",
	"car",
	"dv",
	"goto",
	"bring",
	"panel"
], isMenuAction = (v) => typeof v == "string" && MENU_ACTIONS.includes(v), KINDS = [
	"info",
	"success",
	"warning",
	"error"
];
function readSettings(raw) {
	let s = record(raw), kind = KINDS.find((k) => k === s.announceKind) ?? "warning";
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
// resource/server/content.ts
const panel = new AdminPanel({
	title: "ADMIN_TITLE",
	icon: "user",
	files: { settings: {
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
			announceKind: {
				type: "enum",
				values: [
					"info",
					"success",
					"warning",
					"error"
				]
			},
			announceSeconds: {
				type: "number",
				min: 2,
				max: 60,
				integer: !0
			}
		},
		defaults: {
			noclipSpeed: 1,
			noclipMaxSpeed: 16,
			noclipStep: .5,
			noclipFast: 2,
			noclipFaster: 4,
			noclipSlow: .05,
			announceKind: "warning",
			announceSeconds: 10
		}
	} },
	tabs: [{
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
			icon: "comments",
			title: "ADMIN_C_ANNOUNCE",
			desc: "ADMIN_C_ANNOUNCE_DESC",
			fields: [{
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
			}, {
				widget: "number",
				path: "announceSeconds",
				label: "ADMIN_F_ANNOUNCE_TIME",
				hint: "ADMIN_H_ANNOUNCE_TIME",
				min: 2,
				max: 60,
				step: 1,
				unit: "s"
			}]
		}]
	}]
}), content = { settings: readSettings(panel.get("settings")) };
panel.onChange("settings", () => content.settings = readSettings(panel.get("settings")));
// resource/server/actions.ts
const owned = new EntityState(VEHICLE_BAGS.owned, stateBoolean), ped = (source) => GetPlayerPed(String(source)), pos = (source) => {
	let [x = 0, y = 0, z = 0] = GetEntityCoords(ped(source));
	return {
		x,
		y,
		z
	};
}, name = (source) => GetPlayerName(String(source)) || String(source), log$1 = (message, source, target, metadata) => aiLog("actions", message, {
	source: source > 0 ? source : void 0,
	target,
	metadata
}), actions = {
	noclip(source) {
		return emitNet(EVENTS.toggleNoclip, source), null;
	},
	tpm(source) {
		return emitNet(EVENTS.teleport, source, null), log$1("teleported to the waypoint", source), null;
	},
	tp(source, point) {
		return emitNet(EVENTS.teleport, source, point), log$1("teleported to coordinates", source, void 0, { ...point }), null;
	},
	goto(source, target) {
		if (target === source || !isOnline(target)) return "ERR_TARGET";
		let point = pos(target);
		return emitNet(EVENTS.teleport, source, point), log$1("went to a player", source, target, point), null;
	},
	bring(source, target) {
		if (target === source || !isOnline(target)) return "ERR_TARGET";
		let point = pos(source);
		return emitNet(EVENTS.teleport, target, point), notify(target, Locale("NOTIFY_BROUGHT"), "info"), log$1("brought a player", source, target, point), null;
	},
	heal(source, target) {
		let death = optionalExport("ai-death");
		return death ? isOnline(target) ? death.IsDead(target) === !0 ? "ERR_DOWN" : (death.Heal(target), target !== source && notify(target, Locale("NOTIFY_HEALED_BY"), "success"), source > 0 && notify(source, Locale("NOTIFY_HEALED", name(target)), "success"), log$1("healed a player", source, target), null) : "ERR_TARGET" : "ERR_NO_DEATH";
	},
	revive(source, target) {
		let death = optionalExport("ai-death");
		return death ? isOnline(target) ? (death.Revive(target) !== !0 && death.Heal(target), target !== source && notify(target, Locale("NOTIFY_REVIVED_BY"), "success"), source > 0 && notify(source, Locale("NOTIFY_REVIVED", name(target)), "success"), log$1("revived a player", source, target), null) : "ERR_TARGET" : "ERR_NO_DEATH";
	},
	async car(source, model) {
		let hashName = model.toLowerCase();
		if (!/^[a-z0-9_]{1,32}$/.test(hashName)) return "ERR_MODEL";
		let type = await vehicleType(hashName, source);
		if (!type || !isOnline(source)) return "ERR_MODEL";
		let admin = ped(source), current = GetVehiclePedIsIn(admin, !1);
		current && GetPedInVehicleSeat(current, -1) === admin && owned.get(current) !== !0 && DeleteEntity(current);
		let p = pos(source);
		return await spawnVehicle({
			model: hashName,
			type,
			coords: {
				...p,
				heading: GetEntityHeading(admin)
			},
			fuel: 100,
			driver: source,
			keysTo: source,
			purpose: "temporary",
			persistent: !1
		}) === null ? "ERR_VEHICLE" : (notify(source, Locale("NOTIFY_CAR_SPAWNED", hashName), "success"), log$1("spawned a vehicle", source, void 0, {
			model: hashName,
			...p
		}), null);
	},
	dv(source) {
		let vehicle = nearestVehicleTo(source, 5);
		if (!vehicle) return "ERR_NO_VEHICLE";
		let metadata = {
			model: GetEntityModel(vehicle),
			plate: GetVehicleNumberPlateText(vehicle),
			...pos(source)
		};
		return DeleteEntity(vehicle), notify(source, Locale("NOTIFY_DV_DONE"), "success"), log$1("deleted a vehicle", source, void 0, metadata), null;
	},
	coords(source) {
		return emitNet(EVENTS.coords, source), null;
	},
	panel(source) {
		return emitNet(ADMIN.showEvent, source), null;
	},
	announce(source, text) {
		let { announceKind, announceSeconds } = content.settings;
		return notify(-1, Locale("NOTIFY_ANNOUNCE", text), announceKind, announceSeconds * 1e3), log$1("announced", source, void 0, { text }), null;
	}
}, log = createLogger(ResourceName);
function reply(source, error) {
	error && (source > 0 ? notify(source, Locale(error), "error") : log.info(Locale(error)));
}
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
const id = {
	name: "id",
	type: "playerId",
	help: Locale("COMMAND_P_ID")
}, optionalId = {
	...id,
	help: Locale("COMMAND_P_ID_SELF"),
	optional: !0
}, self = (source, run) => source > 0 ? run() : "ERR_PLAYER_ONLY", answer = async (source, result) => reply(source, await result);
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
}, (source, args) => answer(source, self(source, () => actions.bring(source, args.id)))), addCommand("heal", {
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
}, (source) => answer(source, self(source, () => actions.dv(source)))), addCommand("coords", {
	help: Locale("COMMAND_COORDS"),
	restricted: !0
}, (source) => answer(source, self(source, () => actions.coords(source)))), addCommand("admin", {
	help: Locale("COMMAND_ADMIN"),
	restricted: !0
}, (source) => answer(source, self(source, () => actions.panel(source)))), addCommand("adminmenu", {
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
}, (source, args) => answer(source, actions.announce(source, args.message.slice(0, 300))));
const done = (source, ok, text) => {
	if (!ok) return reply(source, "ERR_NO_WEATHER");
	source > 0 ? notify(source, text, "success") : log.info(text);
};
addCommand("weather", {
	help: Locale("COMMAND_WEATHER"),
	params: [{
		name: "type",
		type: "string",
		help: Locale("COMMAND_P_WEATHER")
	}],
	restricted: !0
}, (source, args) => done(source, world.setWeather(args.type), Locale("NOTIFY_WEATHER", args.type.toUpperCase()))), addCommand("time", {
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
}, (source, args) => done(source, world.setTime(args.hour, args.minute ?? 0), Locale("NOTIFY_TIME", args.hour, args.minute ?? 0))), addCommand("blackout", {
	help: Locale("COMMAND_BLACKOUT"),
	params: [{
		name: "on",
		type: "number",
		help: Locale("COMMAND_P_ON")
	}],
	restricted: !0
}, (source, args) => done(source, world.setBlackout(args.on === 1), Locale(args.on === 1 ? "NOTIFY_BLACKOUT_ON" : "NOTIFY_BLACKOUT_OFF"))), addCommand("freezetime", {
	help: Locale("COMMAND_FREEZETIME"),
	params: [{
		name: "on",
		type: "number",
		help: Locale("COMMAND_P_ON")
	}],
	restricted: !0
}, (source, args) => done(source, world.freezeTime(args.on === 1), Locale(args.on === 1 ? "NOTIFY_FREEZE_ON" : "NOTIFY_FREEZE_OFF"))), onClientCallback(EVENTS.access, (source) => !!IsPlayerAceAllowed(String(source), ADMIN.ace)), onClientCallback(EVENTS.noclip, { args: ([on]) => typeof on == "boolean" ? [on] : null }, (source, on) => on && !IsPlayerAceAllowed(String(source), ADMIN.ace) ? {
	ok: !1,
	error: "ERR_NOT_ALLOWED"
} : (aiLog("actions", on ? "noclip on" : "noclip off", { source }), { ok: !0 })), onClientCallback(EVENTS.players, () => getPlayers().map((p) => ({
	id: Number(p),
	name: GetPlayerName(p)
})).sort((a, b) => a.id - b.id), {
	guards: [isAdmin()],
	rate: {
		count: 2,
		windowMs: 1e3
	}
});
const parseAction = ([action, target, value]) => !isMenuAction(action) || target != null && !(typeof target == "number" && Number.isInteger(target) && target > 0) || value != null && !(typeof value == "string" && value.length <= 32) ? null : [
	action,
	target ?? null,
	value ?? null
];
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
		default: return action;
	}
}
// resource/server/index.ts
onClientCallback(EVENTS.action, {
	args: parseAction,
	guards: [isAdmin()],
	lock: !0
}, async (source, action, target, value) => {
	let error = await runAction(source, action, target, value);
	return error ? {
		ok: !1,
		error
	} : { ok: !0 };
}), aiLogChannels({ actions: {} });
