import { mongodb } from "@fastify/mongodb";
import brotli from "brotli";
import { FastifyInstance } from "fastify";
import LZMA from "lzma";
import ogs from "open-graph-scraper";
import { getCollection } from "../../plugins/mongo";
import { generateCode, getUserFromKey, isCourseFileValid, randomNum } from "../../utils/functions";

const router = (fastify: FastifyInstance, _options: object) => {
	fastify.get("/courses/list", async (req, reply) => {
		const users = await getCollection(fastify, "users").find({}).toArray();
		const userMap = new Map(users.map(user => [user.steamId, user]));
		const courses = await getCollection(fastify, "courses").find({}).toArray();
		const enrichedCourses = courses.map(course => {
			const user = userMap.get(course.uploadedBy);
			return {
				...course,
				uploadedBy: user || null,
			};
		});

		reply.status(200).send({
			code: reply.statusCode,
			message: "List of all courses",
			data: enrichedCourses,
		});
	});

	fastify.get("/courses/info/:code", async (req, reply) => {
		const params = req.params as { code: string };
		const code = params.code;
		if (!code) {
			return reply
				.status(400)
				.send({ code: reply.statusCode, message: "Provide course code and map name" });
		}

		const courses = getCollection(fastify, "courses");
		const course = await courses.findOne({ code });
		if (!course) {
			return reply.status(404).send({ code: reply.statusCode, message: "Course not found" });
		}

		const user = (
			await getCollection(fastify, "users").find({ steamId: course.uploadedBy }).toArray()
		)[0];

		course.uploadedBy = user || null;

		reply.status(200).send({ code: reply.statusCode, message: "Course data", data: course });
	});

	fastify.post(
		"/courses/upload",
		{
			schema: {
				headers: {
					type: "object",
					required: ["authorization", "mapname", "mapid"],
					properties: {
						authorization: { type: "string" },
						mapname: { type: "string" },
						mapid: { type: "string" },
					},
				},
				body: { type: "string" },
			},
		},
		async (req, reply) => {
			const key = req.headers.authorization!;
			const mapName = req.headers.mapname as string;
			const mapId = req.headers.mapid as string;
			const body = req.body as string;
			const course = LZMA.decompress(Buffer.from(body, "base64")) as string;
			const courseJSON = JSON.parse(course);

			const user = await getUserFromKey(fastify, key);
			if (!user) {
				return reply.status(401).send({ code: reply.statusCode, message: "Unauthorized" });
			}

			if (!isCourseFileValid(course)) {
				return reply
					.status(400)
					.send({ code: reply.statusCode, message: "Course file is invalid" });
			}

			const courses = getCollection(fastify, "courses");

			let code: string;
			do code = generateCode(randomNum(2, 6), 4);
			while (await courses.findOne({ code }));

			let mapImg = "";
			if (mapId !== "0") {
				try {
					const { result } = await ogs({
						url: `https://steamcommunity.com/sharedfiles/filedetails/?id=${mapId}`,
					});
					mapImg = result.ogImage?.[0]?.url || "";
				} catch (e) {
					console.error("Failed to fetch map image:", e);
				}
			}

			const buffer = Buffer.from(course, "utf-8");
			const compressedData = brotli.compress(buffer);
			const binaryData = new mongodb.Binary(compressedData);

			const res = await courses.findOneAndUpdate(
				{ code },
				{
					$set: {
						code,
						name: courseJSON[4],
						elementsCount: courseJSON[0].length + courseJSON[5].length,
						uploadedBy: user.steamId,
						uploadedAt: Date.now(),
						mapName,
						mapId,
						mapImg,
						downloadCount: 0,
						data: binaryData,
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
					message: "Error saving a course to the database",
				});
			}

			reply.status(200).send({
				code: reply.statusCode,
				message: `Course uploaded successfully! Code: ${res.code}`,
			});
		},
	);

	fastify.get("/courses/download", async (req, reply) => {
		const code = req.headers.code as string;
		const mapName = req.headers.mapname as string;
		if (!code || !mapName) {
			return reply
				.status(400)
				.send({ code: reply.statusCode, message: "Provide course code and map name" });
		}

		const courses = getCollection(fastify, "courses");
		const course = await courses.findOne({ code, mapName });
		if (!course) {
			return reply.status(404).send({ code: reply.statusCode, message: "Course not found" });
		}

		const binaryData = course.data.buffer as Buffer;
		const decompressed = Buffer.from(brotli.decompress(binaryData)).toString("utf-8");
		const base64lzma = Buffer.from(LZMA.compress(decompressed)).toString("base64");

		if (!base64lzma) {
			return reply
				.status(500)
				.send({ code: reply.statusCode, message: "Internal server error" });
		}

		await courses.updateOne({ code }, { $inc: { downloadCount: 1 } });

		reply.status(200).send({
			code: 200,
			message: "Course found",
			data: base64lzma,
		});
	});

	fastify.delete(
		"/courses/delete/:code",
		{
			schema: {
				params: {
					type: "object",
					required: ["code"],
					properties: {
						code: { type: "string" },
					},
				},
				headers: {
					type: "object",
					required: ["authorization"],
					properties: {
						authorization: { type: "string" },
					},
				},
			},
		},
		async (req, reply) => {
			const params = req.params as { code: string };

			const key = req.headers.authorization;
			if (!key) {
				return reply.status(401).send({ code: reply.statusCode, message: "Unauthorized" });
			}

			const code = params.code;
			if (!code) {
				return reply
					.status(400)
					.send({ code: reply.statusCode, message: "Provide course code" });
			}

			const user = await getUserFromKey(fastify, key);
			if (!user) {
				return reply.status(401).send({ code: reply.statusCode, message: "Unauthorized" });
			}

			const courses = getCollection(fastify, "courses");
			const course = await courses.findOne({ code });
			if (!course) {
				return reply
					.status(404)
					.send({ code: reply.statusCode, message: "Course not found" });
			}

			if (course.uploadedBy !== user.steamId) {
				return reply.status(403).send({ code: reply.statusCode, message: "Forbidden" });
			}

			const res = await courses.deleteOne({ code });
			if (res.deletedCount === 0) {
				return reply
					.status(500)
					.send({ code: reply.statusCode, message: "Error while deleting course" });
			}

			reply
				.status(200)
				.send({ code: reply.statusCode, message: `Course ${code} deleted successfully` });
		},
	);
};

export default router;
