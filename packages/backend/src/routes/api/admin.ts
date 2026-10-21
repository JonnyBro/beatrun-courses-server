import { CourseRecord, User } from "@/types.js";
import { sanitize } from "@/utils/functions.js";
import { escapeRegex, getUsersMap, isWorkshopId, parsePagination, requireAdmin, toPublicUser } from "@/utils/web.js";
import { mongodb } from "@fastify/mongodb";
import { FastifyInstance } from "fastify";

const router = (fastify: FastifyInstance, _options: object) => {
	fastify.get("/api/admin/users", { preHandler: requireAdmin(fastify) }, async (req, reply) => {
		const query = req.query as { q?: string; page?: string; limit?: string };
		const { page, limit, skip } = parsePagination(query, 25);

		const filter: Record<string, unknown> = {};
		if (query.q?.trim()) {
			const regex = { $regex: escapeRegex(query.q.trim()), $options: "i" };
			filter.$or = [{ username: regex }, { steamId: regex }];
		}

		const users = fastify.getUsersCollection()!;
		const [items, total] = await Promise.all([
			users
				.find(filter, { projection: { key: 0 } })
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.toArray(),
			users.countDocuments(filter),
		]);

		const steamIds = items.map(u => u.steamId as string);
		const [courses, records] = await Promise.all([
			fastify
				.getCoursesCollection()
				?.aggregate([
					{ $match: { "uploadedBy.steamId": { $in: steamIds } } },
					{ $group: { _id: "$uploadedBy.steamId", count: { $sum: 1 } } },
				])
				.toArray(),
			fastify
				.getCollection("records")
				?.aggregate([
					{ $match: { steamId: { $in: steamIds } } },
					{ $group: { _id: "$steamId", count: { $sum: 1 } } },
				])
				.toArray(),
		]);
		const coursesMap = new Map((courses ?? []).map(c => [c._id as string, c.count as number]));
		const recordsMap = new Map((records ?? []).map(c => [c._id as string, c.count as number]));

		reply.status(200).send({
			code: reply.statusCode,
			data: {
				items: (items as User[]).map(u => ({
					...toPublicUser(u),
					ban: u.ban ?? null,
					courses: coursesMap.get(u.steamId) ?? 0,
					records: recordsMap.get(u.steamId) ?? 0,
				})),
				total,
				page,
				pages: Math.max(1, Math.ceil(total / limit)),
			},
		});
	});

	fastify.patch(
		"/api/admin/users/:steamId",
		{
			preHandler: requireAdmin(fastify),
			schema: {
				body: {
					type: "object",
					properties: {
						admin: { type: "boolean" },
						username: { type: "string", maxLength: 64 },
						ban: {
							anyOf: [
								{
									type: "object",
									required: ["reason"],
									properties: { reason: { type: "string", minLength: 1, maxLength: 500 } },
								},
								{ type: "null" },
							],
						},
					},
				},
			},
		},
		async (req, reply) => {
			const { steamId } = req.params as { steamId: string };
			const body = req.body as { admin?: boolean; username?: string; ban?: { reason: string } | null };

			if (steamId === req.webUser!.steamId && (body.admin === false || body.ban)) {
				return reply.status(403).send({ code: reply.statusCode, message: "You can't do this to yourself" });
			}

			const target = await fastify.getUser(steamId);
			if (!target) return reply.status(404).send({ code: reply.statusCode, message: "User not found" });

			if (body.ban && (target.admin || body.admin)) {
				return reply
					.status(400)
					.send({ code: reply.statusCode, message: "Remove admin rights before banning" });
			}

			if (body.admin && target.ban && body.ban !== null) {
				return reply.status(400).send({ code: reply.statusCode, message: "Unban the user first" });
			}

			const set: Record<string, unknown> = {};
			const unset: Record<string, ""> = {};

			if (body.admin !== undefined) set.admin = body.admin;
			if (body.username !== undefined) set.username = sanitize(body.username);
			if (body.ban) set.ban = { reason: body.ban.reason.trim(), at: Date.now(), by: req.webUser!.steamId };
			if (body.ban === null) unset.ban = "";

			if (!Object.keys(set).length && !Object.keys(unset).length) {
				return reply.status(200).send({ code: reply.statusCode, data: toPublicUser(target) });
			}

			const res = await fastify.getUsersCollection()?.findOneAndUpdate(
				{ steamId },
				{
					...(Object.keys(set).length && { $set: set }),
					...(Object.keys(unset).length && { $unset: unset }),
				},
				{ returnDocument: "after", projection: { key: 0 } },
			);
			if (!res) return reply.status(404).send({ code: reply.statusCode, message: "User not found" });

			reply.status(200).send({ code: reply.statusCode, data: toPublicUser(res as User) });
		},
	);

	fastify.patch(
		"/api/admin/courses/:code",
		{
			preHandler: requireAdmin(fastify),
			schema: {
				body: {
					type: "object",
					properties: {
						name: { type: "string", minLength: 1, maxLength: 128 },
						mapName: { type: "string", minLength: 1, maxLength: 128 },
						workshopId: { type: ["string", "null"], maxLength: 32 },
					},
				},
			},
		},
		async (req, reply) => {
			const { code } = req.params as { code: string };
			const body = req.body as { name?: string; mapName?: string; workshopId?: string | null };

			const update: Record<string, unknown> = {};
			if (body.name !== undefined) update.name = body.name.trim();
			if (body.mapName !== undefined) update.mapName = body.mapName.trim();
			if (body.workshopId !== undefined) {
				if (body.workshopId && !isWorkshopId(body.workshopId)) {
					return reply.status(400).send({ code: reply.statusCode, message: "Workshop ID must be a number" });
				}
				update.workshopId = body.workshopId || null;
			}

			const res = await fastify.getCoursesCollection()?.updateOne({ code }, { $set: update });
			if (!res?.matchedCount) {
				return reply.status(404).send({ code: reply.statusCode, message: "Course not found" });
			}

			reply.status(200).send({ code: reply.statusCode, message: "Course updated" });
		},
	);

	fastify.get("/api/admin/records", { preHandler: requireAdmin(fastify) }, async (req, reply) => {
		const query = req.query as { course?: string; player?: string; page?: string; limit?: string };
		const { page, limit, skip } = parsePagination(query, 25);

		const filter: Record<string, unknown> = {};
		if (query.course) filter.courseCode = query.course;
		if (query.player) filter.steamId = query.player;

		const collection = fastify.getCollection("records")!;
		const [items, total] = await Promise.all([
			collection.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).toArray(),
			collection.countDocuments(filter),
		]);
		const records = items as CourseRecord[];

		const [users, courses] = await Promise.all([
			getUsersMap(
				fastify,
				records.map(r => r.steamId),
			),
			fastify
				.getCoursesCollection()
				?.find({ code: { $in: records.map(r => r.courseCode) } }, { projection: { code: 1, name: 1 } })
				.toArray(),
		]);
		const names = new Map((courses ?? []).map(c => [c.code as string, c.name as string]));

		reply.status(200).send({
			code: reply.statusCode,
			data: {
				items: records.map(r => ({
					id: r._id.toString(),
					courseCode: r.courseCode,
					courseName: names.get(r.courseCode) ?? null,
					player: toPublicUser(users.get(r.steamId), { steamId: r.steamId }),
					time: r.time,
					runs: r.runs,
					updatedAt: r.updatedAt,
				})),
				total,
				page,
				pages: Math.max(1, Math.ceil(total / limit)),
			},
		});
	});

	fastify.delete("/api/admin/records/:id", { preHandler: requireAdmin(fastify) }, async (req, reply) => {
		const { id } = req.params as { id: string };
		if (!mongodb.ObjectId.isValid(id)) {
			return reply.status(400).send({ code: reply.statusCode, message: "Invalid record id" });
		}

		const res = await fastify.getCollection("records")?.deleteOne({ _id: new mongodb.ObjectId(id) });
		if (!res?.deletedCount) return reply.status(404).send({ code: reply.statusCode, message: "Record not found" });

		reply.status(200).send({ code: reply.statusCode, message: "Record deleted" });
	});
};

export default router;
