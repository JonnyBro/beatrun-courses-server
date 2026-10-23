import { Course, CourseRecord } from "@/types.js";
import { generateRandomString, getUserFromKey, getUserFromSteamId, randomNum } from "@/utils/functions.js";
import {
	calculateStandings,
	getBannedSteamIds,
	getSessionUser,
	parsePagination,
	recordPoints,
	requireAdmin,
	requireUser,
	toPublicCourses,
	toPublicUser,
} from "@/utils/web.js";
import { FastifyInstance } from "fastify";

const router = (fastify: FastifyInstance, _options: object) => {
	fastify.get("/api/users/get/:id", { preHandler: requireAdmin(fastify) }, async (req, reply) => {
		const params = req.params as { id: string };
		const user = await getUserFromSteamId(fastify, params.id);
		if (!user) return reply.status(404).send({ code: reply.statusCode, message: "No user found" });

		reply.status(200).send({ code: reply.statusCode, data: user });
	});

	fastify.get(
		"/api/key/validate",
		{
			schema: {
				headers: {
					type: "object",
					required: ["key"],
					properties: {
						key: { type: "string" },
					},
				},
			},
		},
		async (req, reply) => {
			const key = req.headers.key as string;

			const user = await getUserFromKey(fastify, key);
			if (!user) return reply.status(200).send({ code: reply.statusCode, data: false });

			reply.status(200).send({
				code: reply.statusCode,
				data: true,
				ban: user.ban ? { reason: user.ban.reason, at: user.ban.at } : null,
			});
		},
	);

	fastify.delete("/api/users/delete/:id", { preHandler: requireAdmin(fastify) }, async (req, reply) => {
		const params = req.params as { id: string };
		const { purge } = req.query as { purge?: string };

		if (params.id === req.webUser!.steamId) {
			return reply.status(403).send({ code: reply.statusCode, message: "Forbidden" });
		}

		const user = await getUserFromSteamId(fastify, params.id);
		if (!user) {
			return reply.status(404).send({ code: reply.statusCode, message: "User not found" });
		}

		const users = fastify.getCollection("users");

		const res = await users?.deleteOne({ steamId: params.id });
		if (res?.deletedCount === 0) {
			return reply.status(500).send({ code: reply.statusCode, message: "Error while deleting a user" });
		}

		if (purge === "1" || purge === "true") {
			const codes = (
				await fastify
					.getCoursesCollection()
					?.find({ "uploadedBy.steamId": params.id }, { projection: { code: 1 } })
					.toArray()
			)?.map(c => c.code as string);

			await fastify.getCoursesCollection()?.deleteMany({ "uploadedBy.steamId": params.id });
			await fastify
				.getCollection("records")
				?.deleteMany({ $or: [{ steamId: params.id }, { courseCode: { $in: codes ?? [] } }] });
		}

		reply.status(200).send({ code: reply.statusCode, message: `User ${user.steamId} deleted successfully` });
	});

	fastify.get("/api/users/me", async (req, reply) => {
		const user = await getSessionUser(fastify, req);

		/* eslint-disable @stylistic/indent */
		reply.status(200).send({
			code: reply.statusCode,
			data: user
				? {
						...toPublicUser(user),
						key: user.key ?? null,
						ban: user.ban ? { reason: user.ban.reason, at: user.ban.at } : null,
					}
				: null,
		});
		/* eslint-enable @stylistic/indent */
	});

	fastify.post("/api/users/me/key", { preHandler: requireUser(fastify) }, async (req, reply) => {
		const users = fastify.getUsersCollection()!;

		let key: string;
		do key = generateRandomString(randomNum(16, 32));
		while (await users.findOne({ key }));

		await users.updateOne({ steamId: req.webUser!.steamId }, { $set: { key } });

		reply.status(200).send({ code: reply.statusCode, data: { key } });
	});

	fastify.get("/api/users/profile/:steamId", async (req, reply) => {
		const { steamId } = req.params as { steamId: string };

		const user = await fastify.getUser(steamId);
		if (!user) return reply.status(404).send({ code: reply.statusCode, message: "User not found" });

		const [courseStats, standings] = await Promise.all([
			fastify
				.getCoursesCollection()
				?.aggregate([
					{ $match: { "uploadedBy.steamId": steamId } },
					{
						$group: {
							_id: null,
							courses: { $sum: 1 },
							downloads: { $sum: "$downloadCount" },
							runs: { $sum: { $ifNull: ["$runsCount", 0] } },
						},
					},
				])
				.toArray(),
			calculateStandings(fastify),
		]);

		const rank = standings.findIndex(s => s.steamId === steamId);
		const standing = standings[rank];

		reply.status(200).send({
			code: reply.statusCode,
			data: {
				user: toPublicUser(user),
				stats: {
					courses: courseStats?.[0]?.courses ?? 0,
					downloads: courseStats?.[0]?.downloads ?? 0,
					runsOnCourses: courseStats?.[0]?.runs ?? 0,
					completed: standing?.completed ?? 0,
					worldRecords: standing?.worldRecords ?? 0,
					points: standing?.points ?? 0,
					runs: standing?.runs ?? 0,
					rank: rank === -1 ? null : rank + 1,
					rankedPlayers: standings.length,
				},
			},
		});
	});

	fastify.get("/api/users/profile/:steamId/records", async (req, reply) => {
		const { steamId } = req.params as { steamId: string };
		const { page, limit, skip } = parsePagination(req.query as object, 50);

		const recordsCollection = fastify.getCollection("records")!;
		const [items, total] = await Promise.all([
			recordsCollection.find({ steamId }).sort({ updatedAt: -1 }).skip(skip).limit(limit).toArray(),
			recordsCollection.countDocuments({ steamId }),
		]);
		const records = items as CourseRecord[];
		const codes = records.map(r => r.courseCode);
		const banned = await getBannedSteamIds(fastify);

		const [courses, bests] = await Promise.all([
			fastify
				.getCoursesCollection()
				?.find({ code: { $in: codes } }, { projection: { data: 0 } })
				.toArray(),
			recordsCollection
				.aggregate([
					{ $match: { courseCode: { $in: codes }, steamId: { $nin: banned } } },
					{ $group: { _id: "$courseCode", best: { $min: "$time" }, players: { $sum: 1 } } },
				])
				.toArray(),
		]);

		const publicCourses = new Map(
			(await toPublicCourses(fastify, (courses ?? []) as Course[])).map(c => [c.code, c]),
		);
		const bestMap = new Map(bests.map(b => [b._id as string, b.best as number]));
		const playersMap = new Map(bests.map(b => [b._id as string, b.players as number]));

		const data = await Promise.all(
			records.map(async r => ({
				id: r._id.toString(),
				course: publicCourses.get(r.courseCode) ?? null,
				courseCode: r.courseCode,
				time: r.time,
				runs: r.runs,
				updatedAt: r.updatedAt,
				position:
					(await recordsCollection.countDocuments({
						courseCode: r.courseCode,
						steamId: { $nin: banned },
						time: { $lt: r.time },
					})) + 1,
				points: recordPoints(r.time, bestMap.get(r.courseCode) ?? r.time, playersMap.get(r.courseCode) ?? 1),
			})),
		);

		reply.status(200).send({
			code: reply.statusCode,
			data: { items: data, total, page, pages: Math.max(1, Math.ceil(total / limit)) },
		});
	});
};

export default router;
