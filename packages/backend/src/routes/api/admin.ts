import { Course, CourseRecord, PendingRecord, User } from "@/types.js";
import { AdminLogEntry, logAdminAction } from "@/utils/adminLog.js";
import { sanitize } from "@/utils/functions.js";
import { saveRecord } from "@/utils/records.js";
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
				.find(filter, { projection: { keyHash: 0 } })
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
				{ returnDocument: "after", projection: { keyHash: 0 } },
			);
			if (!res) return reply.status(404).send({ code: reply.statusCode, message: "User not found" });

			await logAdminAction(fastify, req.webUser!, "user.update", steamId, {
				username: target.username,
				...(body.admin !== undefined && body.admin !== Boolean(target.admin) && { admin: body.admin }),
				...(set.username !== undefined && set.username !== target.username && { newUsername: set.username }),
				...(body.ban && { ban: (set.ban as { reason: string }).reason }),
				...(body.ban === null && target.ban && { unban: target.ban.reason }),
			});

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

			const before = (await fastify
				.getCoursesCollection()
				?.findOneAndUpdate({ code }, { $set: update }, { returnDocument: "before" })) as Course | null;
			if (!before) return reply.status(404).send({ code: reply.statusCode, message: "Course not found" });

			const changes = Object.fromEntries(
				Object.entries(update)
					.filter(([field, value]) => before[field] !== value)
					.map(([field, value]) => [field, { from: before[field] as unknown, to: value }]),
			);
			if (Object.keys(changes).length) {
				await logAdminAction(fastify, req.webUser!, "course.update", code, { name: before.name, changes });
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

		const record = (await fastify
			.getCollection("records")
			?.findOneAndDelete({ _id: new mongodb.ObjectId(id) })) as CourseRecord | null;
		if (!record) return reply.status(404).send({ code: reply.statusCode, message: "Record not found" });

		await logAdminAction(fastify, req.webUser!, "record.delete", record.courseCode, {
			player: record.steamId,
			time: record.time,
		});

		reply.status(200).send({ code: reply.statusCode, message: "Record deleted" });
	});

	fastify.get("/api/admin/records/pending", { preHandler: requireAdmin(fastify) }, async (req, reply) => {
		const { page, limit, skip } = parsePagination(req.query as object, 25);

		const collection = fastify.getCollection("pendingRecords")!;
		const [items, total] = await Promise.all([
			collection.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
			collection.countDocuments({}),
		]);
		const records = items as PendingRecord[];

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
					splits: r.splits,
					reason: r.reason,
					createdAt: r.createdAt,
				})),
				total,
				page,
				pages: Math.max(1, Math.ceil(total / limit)),
			},
		});
	});

	fastify.post(
		"/api/admin/records/pending/:id/approve",
		{ preHandler: requireAdmin(fastify) },
		async (req, reply) => {
			const { id } = req.params as { id: string };
			if (!mongodb.ObjectId.isValid(id)) {
				return reply.status(400).send({ code: reply.statusCode, message: "Invalid record id" });
			}

			const pending = (await fastify
				.getCollection("pendingRecords")
				?.findOneAndDelete({ _id: new mongodb.ObjectId(id) })) as PendingRecord | null;
			if (!pending) return reply.status(404).send({ code: reply.statusCode, message: "Record not found" });

			if (!(await fastify.getCourse(pending.courseCode))) {
				return reply.status(404).send({ code: reply.statusCode, message: "Course not found" });
			}

			await saveRecord(fastify, pending.courseCode, pending.steamId, pending.time);
			await logAdminAction(fastify, req.webUser!, "pending.approve", pending.courseCode, {
				player: pending.steamId,
				time: pending.time,
				reason: pending.reason,
			});

			reply.status(200).send({ code: reply.statusCode, message: "Record approved" });
		},
	);

	fastify.delete("/api/admin/records/pending/:id", { preHandler: requireAdmin(fastify) }, async (req, reply) => {
		const { id } = req.params as { id: string };
		if (!mongodb.ObjectId.isValid(id)) {
			return reply.status(400).send({ code: reply.statusCode, message: "Invalid record id" });
		}

		const pending = (await fastify
			.getCollection("pendingRecords")
			?.findOneAndDelete({ _id: new mongodb.ObjectId(id) })) as PendingRecord | null;
		if (!pending) return reply.status(404).send({ code: reply.statusCode, message: "Record not found" });

		await logAdminAction(fastify, req.webUser!, "pending.reject", pending.courseCode, {
			player: pending.steamId,
			time: pending.time,
			reason: pending.reason,
		});

		reply.status(200).send({ code: reply.statusCode, message: "Record rejected" });
	});

	fastify.get("/api/admin/log", { preHandler: requireAdmin(fastify) }, async (req, reply) => {
		const query = req.query as { admin?: string; target?: string; page?: string; limit?: string };
		const { page, limit, skip } = parsePagination(query, 50);

		const filter: Record<string, unknown> = {};
		if (query.admin) filter.admin = query.admin;
		if (query.target) filter.target = query.target;

		const collection = fastify.getCollection("adminLog")!;
		const [items, total] = await Promise.all([
			collection.find(filter).sort({ at: -1 }).skip(skip).limit(limit).toArray(),
			collection.countDocuments(filter),
		]);
		const entries = items as unknown as (AdminLogEntry & { _id: mongodb.ObjectId })[];

		const admins = await getUsersMap(
			fastify,
			entries.map(e => e.admin),
		);

		reply.status(200).send({
			code: reply.statusCode,
			data: {
				items: entries.map(e => ({
					id: e._id.toString(),
					at: e.at,
					admin: toPublicUser(admins.get(e.admin), { steamId: e.admin }),
					action: e.action,
					target: e.target,
					details: e.details,
				})),
				total,
				page,
				pages: Math.max(1, Math.ceil(total / limit)),
			},
		});
	});
};

export default router;
