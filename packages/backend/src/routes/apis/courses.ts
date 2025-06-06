import brotli from "brotli";
import { FastifyInstance } from "fastify";
import LZMA from "lzma";
import ogs from "open-graph-scraper";
import { Course } from "../../types";
import { generateCode, getUserFromKey, isCourseFileValid, randomNum } from "../../utils/functions";
import { mongodb } from "@fastify/mongodb";

const router = (fastify: FastifyInstance, _options: object) => {
	fastify.post(
		"/api/courses/upload",
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

			const user = await getUserFromKey(fastify, key);
			if (!user) {
				return reply.status(401).send({ code: reply.statusCode, message: "Unauthorized" });
			}

			if (!isCourseFileValid(course)) {
				return reply
					.status(400)
					.send({ code: reply.statusCode, message: "Course file is invalid" });
			}

			const courses = fastify.mongo.db?.collection<Course>("courses");
			if (!courses) {
				return reply
					.status(500)
					.send({ code: reply.statusCode, message: "Internal server error" });
			}

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

	fastify.get("/api/courses/download", async (req, reply) => {
		const code = req.headers.code as string;
		const mapName = req.headers.mapname as string;
		if (!code || !mapName) {
			return reply
				.status(400)
				.send({ code: reply.statusCode, message: "Provide course code and map name" });
		}

		const courses = fastify.mongo.db?.collection<Course>("courses");
		if (!courses) {
			return reply
				.status(500)
				.send({ code: reply.statusCode, message: "Internal server error" });
		}

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

	fastify.delete("/api/courses/delete/:code", async (req, reply) => {
		const key = req.headers.authorization;
		if (!key) {
			return reply.status(401).send({ code: reply.statusCode, message: "Unauthorized" });
		}

		const params = req.params as { code: string };
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

		const courses = fastify.mongo.db?.collection<Course>("courses");
		if (!courses) {
			return reply
				.status(500)
				.send({ code: reply.statusCode, message: "Internal server error" });
		}

		const course = await courses.findOne({ code });
		if (!course) {
			return reply.status(404).send({ code: reply.statusCode, message: "Course not found" });
		}

		if (course.uploadedBy !== user.steamId) {
			return reply.status(401).send({ code: reply.statusCode, message: "Unauthorized" });
		}

		const res = await courses.deleteOne({ code });

		if (res.deletedCount === 0) {
			return reply
				.status(500)
				.send({ code: reply.statusCode, message: "Error while deleting course" });
		}

		reply.status(200).send({ code: reply.statusCode, message: `Course ${code} deleted successfully` });
	});
};

export default router;
