import { calculateStandings, getUsersMap, parsePagination, toPublicUser } from "@/utils/web.js";
import { FastifyInstance } from "fastify";

const router = (fastify: FastifyInstance, _options: object) => {
	fastify.get("/api/stats", async (_req, reply) => {
		const courses = fastify.getCoursesCollection()!;

		const [coursesCount, users, records, maps, totals] = await Promise.all([
			courses.countDocuments(),
			fastify.getUsersCollection()?.countDocuments(),
			fastify.getCollection("records")?.countDocuments(),
			courses.distinct("mapName"),
			courses
				.aggregate([
					{
						$group: {
							_id: null,
							downloads: { $sum: "$downloadCount" },
							runs: { $sum: { $ifNull: ["$runsCount", 0] } },
						},
					},
				])
				.toArray(),
		]);

		reply.status(200).send({
			code: reply.statusCode,
			data: {
				courses: coursesCount,
				users: users ?? 0,
				records: records ?? 0,
				maps: maps.filter(Boolean).length,
				downloads: totals[0]?.downloads ?? 0,
				runs: totals[0]?.runs ?? 0,
			},
		});
	});

	fastify.get("/api/leaderboard/players", async (req, reply) => {
		const { page, limit, skip } = parsePagination(req.query as object, 50);

		const standings = await calculateStandings(fastify);
		const slice = standings.slice(skip, skip + limit);
		const users = await getUsersMap(
			fastify,
			slice.map(s => s.steamId),
		);

		reply.status(200).send({
			code: reply.statusCode,
			data: {
				items: slice.map((s, i) => ({
					position: skip + i + 1,
					player: toPublicUser(users.get(s.steamId), { steamId: s.steamId }),
					points: s.points,
					completed: s.completed,
					worldRecords: s.worldRecords,
					runs: s.runs,
				})),
				total: standings.length,
				page,
				pages: Math.max(1, Math.ceil(standings.length / limit)),
			},
		});
	});

	fastify.get("/api/leaderboard/creators", async (req, reply) => {
		const { page, limit, skip } = parsePagination(req.query as object, 50);

		const [result] = await fastify
			.getCoursesCollection()!
			.aggregate([
				{
					$group: {
						_id: "$uploadedBy.steamId",
						username: { $last: "$uploadedBy.username" },
						courses: { $sum: 1 },
						downloads: { $sum: "$downloadCount" },
						runs: { $sum: { $ifNull: ["$runsCount", 0] } },
					},
				},
				{ $sort: { downloads: -1, courses: -1, _id: 1 } },
				{ $facet: { items: [{ $skip: skip }, { $limit: limit }], total: [{ $count: "count" }] } },
			])
			.toArray();

		const items = (result?.items ?? []) as Array<{
			_id: string;
			username?: string;
			courses: number;
			downloads: number;
			runs: number;
		}>;
		const total = (result?.total?.[0]?.count as number) ?? 0;
		const users = await getUsersMap(
			fastify,
			items.map(i => i._id),
		);

		reply.status(200).send({
			code: reply.statusCode,
			data: {
				items: items.map((c, i) => ({
					position: skip + i + 1,
					player: toPublicUser(users.get(c._id), { steamId: c._id, username: c.username }),
					courses: c.courses,
					downloads: c.downloads,
					runs: c.runs,
				})),
				total,
				page,
				pages: Math.max(1, Math.ceil(total / limit)),
			},
		});
	});
};

export default router;
