import brotli from "brotli";
import { FastifyInstance } from "fastify";
import LZMA from "lzma";
import ogs from "open-graph-scraper";
import { Course } from "../../types";
import { generateCode, getUserFromKey, isCourseFileValid, randomNum } from "../../utils/functions";

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

			const mapImg =
				mapId === "0"
					? ""
					: await ogs({
						url: `https://steamcommunity.com/sharedfiles/filedetails/?id=${mapId}`,
					}).then(data => {
						if (data.error) return "";
						if (!data.result.ogImage) return "";
						return data.result.ogImage[0].url;
					});
			const compressedData = brotli.compress(Buffer.from(course, "utf-8"));

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
						data: compressedData,
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
};

export default router;
