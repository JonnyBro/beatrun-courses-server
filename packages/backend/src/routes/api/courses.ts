import { Course, CourseData, CourseRecord } from "@/types.js";
import { generateCode, getUserFromKey, isCourseFileValid, randomNum } from "@/utils/functions.js";
import {
	decodeCourseData,
	escapeRegex,
	getSessionUser,
	getUsersMap,
	parsePagination,
	recordPoints,
	requireUser,
	toPublicCourses,
	toPublicUser,
} from "@/utils/web.js";
import { mongodb } from "@fastify/mongodb";
import { FastifyInstance } from "fastify";
import LZMA from "lzma";
import { brotliCompressSync, brotliDecompressSync, crc32 } from "zlib";

/** Course data the way the game stores it: LZMA compressed JSON (same bytes as a saved course file) */
const encodeCourseForGame = (course: Course) => {
	const decompressed = Buffer.from(brotliDecompressSync(course.data!.buffer)).toString("utf-8");
	return Buffer.from(LZMA.compress(decompressed));
};

const router = (fastify: FastifyInstance, _options: object) => {
	fastify.get(
		"/api/courses/list",
		{
			schema: {
				headers: {
					type: "object",
					properties: {
						mapname: { type: "string" },
						game: { type: "string" },
					},
				},
			},
		},
		async (req, reply) => {
			const courses = await fastify.getCoursesArray();

			let strippedCourses = courses?.map(course => {
				if (req.headers.game === "yes") delete course.data;

				return course;
			});

			if (req.headers.mapname) {
				strippedCourses = strippedCourses?.filter(c => c.mapName === req.headers.mapname);
			}

			reply.status(200).send({
				code: reply.statusCode,
				data: strippedCourses,
			});
		},
	);

	fastify.post(
		"/api/courses/upload",
		{
			schema: {
				headers: {
					type: "object",
					required: ["authorization", "mapname"],
					properties: {
						authorization: { type: "string" },
						mapname: { type: "string" },
						workshopid: { type: ["string", "null"] },
					},
				},
				body: {
					type: "object",
					required: ["data"],
					properties: {
						data: { type: "string" },
					},
				},
			},
		},
		async (req, reply) => {
			const key = req.headers.authorization!;
			const mapName = req.headers.mapname as string;
			const workshopId = req.headers.workshopid as string | null;
			const courseData = (req.body as { data: string }).data;

			let courseString: string;

			try {
				courseString = LZMA.decompress(Buffer.from(courseData, "base64")) as string;
			} catch {
				courseString = Buffer.from(courseData, "base64").toString("utf-8");
			}

			const courseJSON = JSON.parse(courseString) as CourseData;

			const user = await getUserFromKey(fastify, key);
			if (!user) {
				return reply.status(401).send({ code: reply.statusCode, message: "Unauthorized" });
			}

			if (!isCourseFileValid(courseString)) {
				return reply.status(400).send({ code: reply.statusCode, message: "Course file is invalid" });
			}

			const courses = fastify.getCollection("courses");

			let code: string;
			do code = generateCode(randomNum(2, 6), randomNum(2, 4));
			while (await courses?.findOne({ code }));

			const buffer = Buffer.from(courseString, "utf-8");
			const compressedData = brotliCompressSync(buffer);
			const binaryData = new mongodb.Binary(compressedData);

			const res = await courses?.findOneAndUpdate(
				{ code },
				{
					$set: {
						code,
						name: courseJSON[4],
						elementsCount: courseJSON[0].length + courseJSON[5].length + (courseJSON[7]?.length ?? 0),
						uploadedBy: {
							steamId: user.steamId,
							username: user.username,
						},
						uploadedAt: Date.now(),
						mapName,
						workshopId,
						downloadCount: 0,
						data: binaryData,
						crc: String(crc32(buffer)),
					},
				},
				{
					upsert: true,
					returnDocument: "after",
				},
			);

			if (!res) {
				return reply.status(500).send({
					code: reply.statusCode,
					message: "Error saving a course to the database. Report to administrator",
				});
			}

			reply.status(200).send({
				code: reply.statusCode,
				message: `Course uploaded successfully. Code: ${res.code}`,
			});
		},
	);

	fastify.get(
		"/api/courses/download",
		{
			schema: {
				headers: {
					type: "object",
					required: ["code"],
					properties: {
						code: { type: "string" },
					},
				},
			},
		},
		async (req, reply) => {
			const code = req.headers.code as string;
			if (!code) {
				return reply.status(400).send({ code: reply.statusCode, message: "Provide a course code" });
			}

			const courses = fastify.getCollection("courses");
			const course = await courses?.findOne({ code });
			if (!course) {
				return reply.status(404).send({ code: reply.statusCode, message: "Course not found" });
			}

			const base64lzma = encodeCourseForGame(course as Course).toString("base64");

			if (!base64lzma) {
				return reply
					.status(500)
					.send({ code: reply.statusCode, message: "Internal server error. Report to administrator" });
			}

			await courses?.updateOne({ code }, { $inc: { downloadCount: 1 } });

			reply.status(200).send(base64lzma);
		},
	);

	// Course file for the website. Put it into garrysmod/data/beatrun/courses/<map>/ to load it from the local list
	fastify.get("/api/courses/file/:code", async (req, reply) => {
		const { code } = req.params as { code: string };

		const course = await fastify.getCourse(code);
		if (!course?.data) return reply.status(404).send({ code: reply.statusCode, message: "Course not found" });

		const file = encodeCourseForGame(course);

		await fastify.getCoursesCollection()?.updateOne({ code }, { $inc: { downloadCount: 1 } });

		// Same name the in-game menu uses when saving a course
		const filename = `${code.toLowerCase().replace(/[^a-z0-9_-]/g, "_")}.txt`;

		reply
			.header("Content-Type", "application/octet-stream")
			.header("Content-Disposition", `attachment; filename="${filename}"`)
			.status(200)
			.send(file);
	});

	fastify.delete(
		"/api/courses/delete",
		{
			schema: {
				headers: {
					type: "object",
					required: ["authorization", "code"],
					properties: {
						authorization: { type: "string" },
						code: { type: "string" },
					},
				},
			},
		},
		async (req, reply) => {
			const key = req.headers.authorization;
			if (!key) {
				return reply.status(401).send({ code: reply.statusCode, message: "Unauthorized" });
			}

			const code = req.headers.code as string;
			if (!code) {
				return reply.status(400).send({ code: reply.statusCode, message: "Provide a course code" });
			}

			const user = await getUserFromKey(fastify, key);
			if (!user) {
				return reply.status(401).send({ code: reply.statusCode, message: "Unauthorized" });
			}

			const course = await fastify.getCourse(code);
			if (!course) {
				return reply.status(404).send({ code: reply.statusCode, message: "Course not found" });
			}

			if (!user.admin && course.uploadedBy.steamId !== user.steamId) {
				return reply.status(403).send({ code: reply.statusCode, message: "Forbidden" });
			}

			const courses = fastify.getCollection("courses");
			const res = await courses?.deleteOne({ code });
			if (res?.deletedCount === 0) {
				return reply
					.status(500)
					.send({ code: reply.statusCode, message: "Error while deleting course. Report to administrator" });
			}

			await fastify.getCollection("records")?.deleteMany({ courseCode: code });

			reply
				.status(200)
				.send({ code: reply.statusCode, message: `Course with code '${code}' deleted successfully` });
		},
	);

	fastify.post(
		"/api/courses/records",
		{
			schema: {
				headers: {
					type: "object",
					required: ["authorization"],
					properties: {
						authorization: { type: "string" },
						code: { type: "string" },
						hash: { type: "string" },
					},
				},
				body: {
					type: "object",
					required: ["time"],
					properties: {
						time: { type: "number" },
					},
				},
			},
		},
		async (req, reply) => {
			const user = await getUserFromKey(fastify, req.headers.authorization!);
			if (!user) return reply.status(401).send({ code: reply.statusCode, message: "Unauthorized" });

			// The game knows a loaded course only by its CRC (Course_ID), the code is optional
			const { code: codeHeader, hash } = req.headers as { code?: string; hash?: string };
			let course: Course | undefined;

			if (codeHeader) course = await fastify.getCourse(codeHeader);
			else if (hash) {
				course = ((await fastify
					.getCoursesCollection()
					?.find({ crc: hash }, { projection: { data: 0 } })
					.sort({ uploadedAt: 1 })
					.limit(1)
					.next()) ?? undefined) as Course | undefined;
			}

			if (!course) return reply.status(404).send({ code: reply.statusCode, message: "Course not found" });

			const code = course.code;
			const time = (req.body as { time: number }).time;
			if (!Number.isFinite(time) || time <= 0 || time > 24 * 60 * 60) {
				return reply.status(400).send({ code: reply.statusCode, message: "Invalid time" });
			}

			const records = fastify.getCollection("records")!;
			const now = Date.now();
			const previous = (await records.findOne({
				courseCode: code,
				steamId: user.steamId,
			})) as CourseRecord | null;
			const isPersonalBest = !previous || time < previous.time;

			await records.updateOne(
				{ courseCode: code, steamId: user.steamId },
				{
					$inc: { runs: 1 },
					$setOnInsert: { createdAt: now },
					...(isPersonalBest ? { $set: { time, updatedAt: now } } : {}),
				},
				{ upsert: true },
			);
			await fastify.getCoursesCollection()?.updateOne({ code }, { $inc: { runsCount: 1 } });

			const best = isPersonalBest ? time : previous.time;
			const position = (await records.countDocuments({ courseCode: code, time: { $lt: best } })) + 1;

			reply.status(200).send({
				code: reply.statusCode,
				message: isPersonalBest ? "New personal best!" : "Run saved",
				data: { code, name: course.name, personalBest: isPersonalBest, best, position },
			});
		},
	);

	// ---------------------------------------------------------------------
	// Web API
	// ---------------------------------------------------------------------

	fastify.get("/api/courses/search", async (req, reply) => {
		const query = req.query as {
			q?: string;
			map?: string;
			author?: string;
			sort?: string;
			page?: string;
			limit?: string;
		};
		const { page, limit, skip } = parsePagination(query);

		const filter: Record<string, unknown> = {};
		if (query.q?.trim()) {
			const regex = { $regex: escapeRegex(query.q.trim()), $options: "i" };
			filter.$or = [{ name: regex }, { code: regex }, { mapName: regex }, { "uploadedBy.username": regex }];
		}
		if (query.map) filter.mapName = query.map;
		if (query.author) filter["uploadedBy.steamId"] = query.author;

		const sorts: Record<string, Record<string, 1 | -1>> = {
			newest: { uploadedAt: -1 },
			oldest: { uploadedAt: 1 },
			downloads: { downloadCount: -1, uploadedAt: -1 },
			runs: { runsCount: -1, uploadedAt: -1 },
			name: { name: 1 },
		};

		const courses = fastify.getCoursesCollection()!;
		const [items, total] = await Promise.all([
			courses
				.find(filter, { projection: { data: 0 } })
				.sort(sorts[query.sort ?? ""] ?? sorts.newest)
				.skip(skip)
				.limit(limit)
				.toArray(),
			courses.countDocuments(filter),
		]);

		reply.status(200).send({
			code: reply.statusCode,
			data: {
				items: await toPublicCourses(fastify, items as Course[]),
				total,
				page,
				pages: Math.max(1, Math.ceil(total / limit)),
			},
		});
	});

	fastify.get("/api/courses/maps", async (_req, reply) => {
		const maps = await fastify
			.getCoursesCollection()
			?.aggregate([{ $group: { _id: "$mapName", count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }])
			.toArray();

		reply.status(200).send({
			code: reply.statusCode,
			data: (maps ?? []).filter(m => m._id).map(m => ({ name: m._id as string, count: m.count as number })),
		});
	});

	fastify.get("/api/courses/info/:code", async (req, reply) => {
		const { code } = req.params as { code: string };

		const course = await fastify.getCourse(code);
		if (!course) return reply.status(404).send({ code: reply.statusCode, message: "Course not found" });

		const [publicCourse] = await toPublicCourses(fastify, [course]);
		const data = decodeCourseData(course);

		const stats = await fastify
			.getCollection("records")
			?.aggregate([
				{ $match: { courseCode: code } },
				{
					$group: {
						_id: null,
						players: { $sum: 1 },
						best: { $min: "$time" },
						average: { $avg: "$time" },
					},
				},
			])
			.toArray();

		const viewer = await getSessionUser(fastify, req);

		reply.status(200).send({
			code: reply.statusCode,
			data: {
				...publicCourse,
				props: data ? data[0].length : null,
				checkpoints: data ? data[1].length : null,
				entities: data ? data[5].length + (data[7]?.length ?? 0) : null,
				speedLimit: data ? (data[6] ?? 0) : null,
				players: stats?.[0]?.players ?? 0,
				bestTime: stats?.[0]?.best ?? null,
				averageTime: stats?.[0]?.average ?? null,
				canDelete: Boolean(viewer && (viewer.admin || viewer.steamId === course.uploadedBy.steamId)),
			},
		});
	});

	fastify.get("/api/courses/info/:code/records", async (req, reply) => {
		const { code } = req.params as { code: string };
		const { page, limit, skip } = parsePagination(req.query as object, 50);

		const records = fastify.getCollection("records")!;
		const [items, total, best] = await Promise.all([
			records.find({ courseCode: code }).sort({ time: 1, updatedAt: 1 }).skip(skip).limit(limit).toArray(),
			records.countDocuments({ courseCode: code }),
			records.find({ courseCode: code }).sort({ time: 1 }).limit(1).next(),
		]);

		const users = await getUsersMap(
			fastify,
			items.map(r => r.steamId),
		);

		const viewer = await getSessionUser(fastify, req);
		let mine = null;

		if (viewer) {
			const own = (await records.findOne({ courseCode: code, steamId: viewer.steamId })) as CourseRecord | null;

			if (own) {
				mine = {
					id: own._id.toString(),
					position: (await records.countDocuments({ courseCode: code, time: { $lt: own.time } })) + 1,
					time: own.time,
					runs: own.runs,
					updatedAt: own.updatedAt,
					points: recordPoints(own.time, best?.time ?? own.time),
				};
			}
		}

		reply.status(200).send({
			code: reply.statusCode,
			data: {
				items: (items as CourseRecord[]).map((r, i) => ({
					id: r._id.toString(),
					position: skip + i + 1,
					player: toPublicUser(users.get(r.steamId), { steamId: r.steamId }),
					time: r.time,
					runs: r.runs,
					updatedAt: r.updatedAt,
					points: recordPoints(r.time, best?.time ?? r.time),
				})),
				total,
				page,
				pages: Math.max(1, Math.ceil(total / limit)),
				mine,
			},
		});
	});

	fastify.delete("/api/courses/info/:code", { preHandler: requireUser(fastify) }, async (req, reply) => {
		const { code } = req.params as { code: string };
		const user = req.webUser!;

		const course = await fastify.getCourse(code);
		if (!course) return reply.status(404).send({ code: reply.statusCode, message: "Course not found" });

		if (!user.admin && course.uploadedBy.steamId !== user.steamId) {
			return reply.status(403).send({ code: reply.statusCode, message: "Forbidden" });
		}

		await fastify.getCoursesCollection()?.deleteOne({ code });
		await fastify.getCollection("records")?.deleteMany({ courseCode: code });

		reply.status(200).send({ code: reply.statusCode, message: `Course with code '${code}' deleted successfully` });
	});
};

export default router;
