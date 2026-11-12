import { CourseData, CourseRecord } from "@/types.js";
import { getBannedSteamIds } from "@/utils/web.js";
import { FastifyInstance } from "fastify";

// sv_maxvelocity clamps every axis on its own, so horizontally a player can go sqrt(2) times faster than it
const MAX_HORIZONTAL_SPEED = 3500 * Math.SQRT2;
// tt_cp is a 150x150 box going 10000 units up, the run counts it as soon as the player's box touches it,
// so a checkpoint can be reached from this far away from its center (corner to corner)
const PLAYER_REACH = (75 + 16) * Math.SQRT2;
const VEHICLE_REACH = (75 + 300) * Math.SQRT2;
// CurTime() moves in ticks and the hit is networked, so every split can be off by a bit
const SPLIT_TOLERANCE = 0.1;
const TOTAL_TOLERANCE = 0.05;
const MAX_SPLITS = 512;

export type RunCheck = { ok: true } | { ok: false; reject: string } | { ok: false; flag: string };

/** util.TableToJSON stores vectors as "[x y z]" strings */
const parseVector = (value: unknown) => {
	if (typeof value !== "string") return;

	const match = value.match(/^\[\s*(\S+)\s+(\S+)\s+(\S+)\s*\]$/);
	if (!match) return;

	const xyz = match.slice(1).map(Number);

	return xyz.every(Number.isFinite) ? xyz : undefined;
};

export const parseSplits = (raw: unknown) => {
	if (typeof raw !== "string") return;

	try {
		const splits = JSON.parse(raw) as unknown;

		if (!Array.isArray(splits) || !splits.length || splits.length > MAX_SPLITS) return;
		if (!splits.every(s => typeof s === "number" && Number.isFinite(s) && s >= 0)) return;

		return splits as number[];
	} catch {
		return;
	}
};

/**
 * Times come straight from the game, so they can be anything. Runs that can't be real at all are rejected,
 * runs faster than the engine allows are only flagged: teleports on the map or a raised sv_maxvelocity
 * make those possible, so an admin has to look at them
 */
export const checkRun = (data: CourseData | undefined, time: number, splits: number[]): RunCheck => {
	const total = splits.reduce((sum, s) => sum + s, 0);
	if (Math.abs(total - time) > TOTAL_TOLERANCE) return { ok: false, reject: "Splits don't add up to the time" };

	if (!data) return { ok: true };

	const checkpoints = (data[1] ?? []).map(parseVector);
	if (splits.length !== checkpoints.length) return { ok: false, reject: "Wrong number of checkpoint splits" };

	const start = parseVector(data[2]);
	if (!start || checkpoints.some(cp => !cp)) return { ok: true };

	const points = checkpoints as number[][];

	const hasVehicles = (data[7] ?? []).some(s => {
		const id = (s as { id?: unknown }).id;

		return typeof id === "string" && id.startsWith("vehicle:");
	});
	const reach = hasVehicles ? VEHICLE_REACH : PLAYER_REACH;

	for (let i = 0; i < splits.length; i++) {
		const from = i === 0 ? start : points[i - 1];
		const to = points[i];
		const distance = Math.hypot(to[0] - from[0], to[1] - from[1]) - (i === 0 ? reach : reach * 2);
		const minimum = Math.max(0, distance) / MAX_HORIZONTAL_SPEED - SPLIT_TOLERANCE;

		if (splits[i] < minimum) {
			return {
				ok: false,
				flag: `Checkpoint ${i + 1} in ${splits[i].toFixed(3)}s, at least ${minimum.toFixed(3)}s is possible`,
			};
		}
	}

	return { ok: true };
};

/** Keeps the best time of a player on a course and returns where it puts them */
export const saveRecord = async (fastify: FastifyInstance, code: string, steamId: string, time: number) => {
	const records = fastify.getCollection("records")!;
	const now = Date.now();
	const previous = (await records.findOne({ courseCode: code, steamId })) as CourseRecord | null;
	const isPersonalBest = !previous || time < previous.time;

	await records.updateOne(
		{ courseCode: code, steamId },
		{
			$inc: { runs: 1 },
			$setOnInsert: { createdAt: now },
			...(isPersonalBest ? { $set: { time, updatedAt: now } } : {}),
		},
		{ upsert: true },
	);
	await fastify.getCoursesCollection()?.updateOne({ code }, { $inc: { runsCount: 1 } });

	const best = isPersonalBest ? time : previous.time;
	const banned = await getBannedSteamIds(fastify);
	const position =
		(await records.countDocuments({ courseCode: code, steamId: { $nin: banned }, time: { $lt: best } })) + 1;

	return { isPersonalBest, best, position };
};

/** One run waiting for review per player and course, the fastest one */
export const savePendingRecord = async (
	fastify: FastifyInstance,
	code: string,
	steamId: string,
	time: number,
	splits: number[],
	reason: string,
) => {
	const pending = fastify.getCollection("pendingRecords")!;
	const existing = await pending.findOne({ courseCode: code, steamId });
	if (existing && existing.time <= time) return;

	await pending.updateOne(
		{ courseCode: code, steamId },
		{ $set: { time, splits, reason, createdAt: Date.now() } },
		{ upsert: true },
	);
};
