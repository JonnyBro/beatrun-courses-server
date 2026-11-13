// Same limits as Beatrun_ValidateCourse in the gamemode, a course past them wouldn't load anyway
const MAX_ELEMENTS = 4096;
const MAX_CHECKPOINTS = 512;
const MAX_SPAWNABLES = 256;
const MAX_COORD = 65536;
const MAX_NAME_LENGTH = 128;

const ENTITY_CLASSES = new Set([
	"br_swingpipe",
	"br_swingrope",
	"br_ladder",
	"br_balance",
	"br_mat",
	"br_laser",
	"br_zipline",
	"tt_cp",
	"br_swingbar",
	"br_hookpoint",
]);

const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isPoint = (v: number[] | undefined) => !!v && v.every(c => Math.abs(c) <= MAX_COORD);

const parseTriple = (value: unknown, open: string, close: string) => {
	if (typeof value !== "string" || !value.startsWith(open) || !value.endsWith(close)) return;

	const parts = value.slice(1, -1).trim().split(/\s+/).map(Number);

	return parts.length === 3 && parts.every(Number.isFinite) ? parts : undefined;
};

/** util.TableToJSON stores vectors as "[x y z]" strings */
export const parseVector = (value: unknown) => parseTriple(value, "[", "]");

/** ...and angles as "{p y r}" */
const parseAngle = (value: unknown) => parseTriple(value, "{", "}");

const isPos = (v: unknown) => isPoint(parseVector(v));
const isAng = (v: unknown) => isPoint(parseAngle(v));
const isOptionalBool = (v: unknown) => v === undefined || typeof v === "boolean";

// Models and spawnables depend on what the game server has installed, so only their shape can be checked here
const isModelPath = (v: unknown) =>
	typeof v === "string" && v.length <= 260 && /^models\/[\w\-./ ]+\.mdl$/i.test(v) && !v.includes("..");
const isSpawnableId = (v: unknown) => typeof v === "string" && /^(vehicle|npc):[\w\-. ]{1,64}$/.test(v);

type Item = Record<string, unknown>;

const isItem = (v: unknown): v is Item => typeof v === "object" && v !== null && !Array.isArray(v);

const checkProp = (p: Item) => {
	if (!isPos(p.pos) || !isAng(p.ang)) return "invalid position or angle";
	if (!isOptionalBool(p.hr)) return "invalid hr flag";

	const model = p.model;
	if (isNumber(model)) {
		return Number.isInteger(model) && model >= 1 && model <= MAX_ELEMENTS ? undefined : "invalid model";
	}

	return isModelPath(model) ? undefined : "invalid model";
};

// Fields the game reads for these classes on top of pos and ang
const positions = { StartPos: isPos, EndPos: isPos };
const length = (v: unknown) => isNumber(v) && Math.abs(v) <= MAX_COORD;

const ENTITY_FIELDS = new Map<string, Record<string, (v: unknown) => boolean>>([
	["br_zipline", positions],
	["br_swingrope", positions],
	["br_ladder", { LadderHeight: length }],
	["br_balance", { BalanceLength: length }],
]);

const checkEntity = (e: Item) => {
	if (typeof e.ent !== "string" || !ENTITY_CLASSES.has(e.ent)) return "unknown class";
	if (!isPos(e.pos) || !isAng(e.ang)) return "invalid position or angle";
	if (!isOptionalBool(e.TwoWay)) return "invalid TwoWay flag";

	for (const [field, check] of Object.entries(ENTITY_FIELDS.get(e.ent) ?? {})) {
		if (!check(e[field])) return `invalid ${field}`;
	}
};

const checkSpawnable = (s: Item) => {
	if (!isSpawnableId(s.id)) return "invalid id";
	if (!isPos(s.pos) || !isAng(s.ang)) return "invalid position or angle";
	if (s.weapon !== undefined && !(typeof s.weapon === "string" && /^\w{0,64}$/.test(s.weapon))) {
		return "invalid weapon";
	}
	if (!isOptionalBool(s.noai)) return "invalid noai flag";
};

const checkList = (list: unknown, name: string, max: number, check: (item: Item) => string | undefined) => {
	if (list === undefined) return;
	if (!Array.isArray(list)) return `${name} is not a list`;
	if (list.length > max) return `Too many ${name} (${list.length}, max ${max})`;

	for (let i = 0; i < list.length; i++) {
		const item: unknown = list[i];
		const error = isItem(item) ? check(item) : "not an object";
		if (error) return `${name} #${i + 1}: ${error}`;
	}
};

/** undefined when the course is fine, otherwise the reason it isn't */
export const validateCourse = (json: unknown): string | undefined => {
	if (!Array.isArray(json) || json.length < 6 || json.length > 8) return "Not a course file";

	const [props, checkpoints, start, angle, name, entities, speed, spawnables] = json as unknown[];

	if (!Array.isArray(props) || !Array.isArray(checkpoints) || !Array.isArray(entities)) return "Not a course file";

	const error =
		checkList(props, "props", MAX_ELEMENTS, checkProp) ??
		checkList(entities, "entities", MAX_ELEMENTS, checkEntity) ??
		checkList(spawnables, "spawnables", MAX_SPAWNABLES, checkSpawnable);
	if (error) return error;

	const total = props.length + entities.length + (Array.isArray(spawnables) ? spawnables.length : 0);
	if (total > MAX_ELEMENTS) return `Too many elements (${total}, max ${MAX_ELEMENTS})`;

	if (!checkpoints.length) return "The course has no checkpoints";
	if (checkpoints.length > MAX_CHECKPOINTS) {
		return `Too many checkpoints (${checkpoints.length}, max ${MAX_CHECKPOINTS})`;
	}

	const badCheckpoint = checkpoints.findIndex(cp => !isPos(cp));
	if (badCheckpoint !== -1) return `Checkpoint #${badCheckpoint + 1} has an invalid position`;

	if (!isPos(start)) return "Invalid start position";
	if (!isNumber(angle)) return "Invalid start angle";

	if (typeof name !== "string") return "Invalid course name";
	if (/[\u0000-\u001f\u007f]/.test(name)) return "Course name can't contain control characters";
	if ([...name].length > MAX_NAME_LENGTH) return `Course name is too long (max ${MAX_NAME_LENGTH} characters)`;

	// 0 means no limit, the game clamps the rest to 325-1000. Some versions saved it as a string, tonumber() takes both
	const isSpeed = isNumber(speed) ? speed >= 0 : typeof speed === "string" && /^\d{1,9}(\.\d+)?$/.test(speed);
	if (speed !== undefined && speed !== null && !isSpeed) return "Invalid speed limit";
};

/** game.GetMap() is the .bsp file name, so anything a file name can hold except a way out of the folder */
export const isMapName = (v: unknown): v is string =>
	typeof v === "string" && /^[^/\\:*?"<>|\u0000-\u001f]{1,64}$/.test(v) && !v.includes("..");
