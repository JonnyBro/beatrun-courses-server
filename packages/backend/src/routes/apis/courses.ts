import { CourseData } from "@/types";
import { generateCode, getUserFromKey, isCourseFileValid, randomNum } from "@/utils/functions";
import { mongodb } from "@fastify/mongodb";
import brotli from "brotli";
import { FastifyInstance } from "fastify";
import LZMA from "lzma";
import ogs from "open-graph-scraper";

const router = (fastify: FastifyInstance, _options: object) => {
	fastify.get(
		"/courses/list",
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
			const users = await fastify.getUsersArray();
			const userMap = new Map(users.map(user => [user.steamId, user]));
			const courses = await fastify.getCoursesArray();

			let enrichedCourses = courses.map(course => {
				let data: string | mongodb.Binary = course.data;

				if (req.headers.game === "yes") {
					const binaryData = course.data.buffer as Buffer;
					const decompressed = Buffer.from(brotli.decompress(binaryData)).toString("utf-8");

					data = Buffer.from(LZMA.compress(decompressed)).toString("base64");
				}

				const user = userMap.get(course.uploadedBy);
				delete user?.key;
				delete user?.admin;

				return {
					...course,
					data,
					uploadedBy: user || null,
				};
			});

			if (req.headers.mapname) {
				enrichedCourses = enrichedCourses.filter(c => c.mapName === req.headers.mapname);
			}

			reply.status(200).send({
				code: reply.statusCode,
				data: enrichedCourses,
			});
		},
	);

	fastify.get("/courses/info/:code", async (req, reply) => {
		const code = (req.params as { code: string }).code;
		if (!code) {
			return reply.status(400).send({ code: reply.statusCode, message: "Provide a course code" });
		}

		const courses = fastify.getCoursesCollection();
		const course = await courses.findOne({ code });
		if (!course) {
			return reply.status(404).send({ code: reply.statusCode, message: "Course not found" });
		}

		const user = await fastify.getUser(course.uploadedBy);
		delete user?.key;
		delete user?.admin;

		course.uploadedBy = user || null;

		reply.status(200).send({ code: reply.statusCode, data: course });
	});

	fastify.post(
		"/courses/upload",
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
			while (await courses.findOne({ code }));

			let mapImg = "";
			if (workshopId) {
				try {
					const { result } = await ogs({
						url: `https://steamcommunity.com/sharedfiles/filedetails/?id=${workshopId}`,
					});
					mapImg = result.ogImage?.[0]?.url || "";
				} catch (e) {
					console.error(`Failed to fetch map image (${workshopId}):`, e);
				}
			}

			const buffer = Buffer.from(courseString, "utf-8");
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
						workshopId,
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
		"/courses/download",
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
			const course = await courses.findOne({ code });
			if (!course) {
				return reply.status(404).send({ code: reply.statusCode, message: "Course not found" });
			}

			const binaryData = course.data.buffer as Buffer;
			const decompressed = Buffer.from(brotli.decompress(binaryData)).toString("utf-8");
			const base64lzma = Buffer.from(LZMA.compress(decompressed)).toString("base64");

			if (!base64lzma) {
				return reply
					.status(500)
					.send({ code: reply.statusCode, message: "Internal server error. Report to administrator" });
			}

			await courses.updateOne({ code }, { $inc: { downloadCount: 1 } });

			reply.status(200).send(base64lzma);
		},
	);

	fastify.delete(
		"/courses/delete",
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

			const courses = fastify.getCollection("courses");
			const course = await courses.findOne({ code });
			if (!course) {
				return reply.status(404).send({ code: reply.statusCode, message: "Course not found" });
			}

			if (course.uploadedBy !== user.steamId) {
				return reply.status(403).send({ code: reply.statusCode, message: "Forbidden" });
			}

			const res = await courses.deleteOne({ code });
			if (res.deletedCount === 0) {
				return reply
					.status(500)
					.send({ code: reply.statusCode, message: "Error while deleting course. Report to administrator" });
			}

			reply
				.status(200)
				.send({ code: reply.statusCode, message: `Course with code "${code}" deleted successfully` });
		},
	);
};

export default router;
