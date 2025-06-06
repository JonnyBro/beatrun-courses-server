import brotli from "brotli";
import { FastifyInstance } from "fastify";
import LZMA from "lzma";
import ogs from "open-graph-scraper";
import config from "../../config.json";
import { hasGame } from "../modules/steam";
import { Course, User } from "../types";
import {
	generateCode,
	getUserFromKey,
	getUserFromSteam,
	isCourseFileValid,
	randomNum,
} from "../utils/functions";

const router = (fastify: FastifyInstance, _options: object) => {
	fastify.get("/api/status", (req, reply) => {
		reply.status(200).send({ code: reply.statusCode, message: "database is up" });
	});

	fastify.get("/api/users/create", async (req, reply) => {
		const profile = req.session.profile;
		if (!profile) {
			return reply.status(401).send({ code: reply.statusCode, message: "Unauthorized" });
		}

		const createdAt = profile.timecreated * 1000;
		if (Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24 * 30)) < 3) {
			return reply.status(401).send({
				code: reply.statusCode,
				message: "Your account is too young. The account must be at least 3 months old",
			});
		}

		const hasGmod = await hasGame(profile.steamid, config.steamKey, 4000);
		if (!hasGmod) {
			return reply.status(401).send({
				code: reply.statusCode,
				message:
					"Your account doesn't own Garry's Mod. Make sure your Steam profile is public",
			});
		}

		const user = await getUserFromSteam(fastify, profile);
		if (!user) {
			return reply
				.status(500)
				.send({ code: reply.statusCode, message: "Internal server error" });
		}

		req.session.user = user;

		reply.status(200).send({ code: reply.statusCode, message: req.session.user });
	});

	fastify.get("/api/users/get/:id", async (req, reply) => {
		if (!req.session.user || !req.session.user.admin) {
			return reply.status(401).send({ code: reply.statusCode, message: "Unauthorized" });
		}

		const params = req.params as { id: string };
		const user = await getUserFromSteam(fastify, params.id);

		reply.send(user);
	});

	fastify.delete("/api/users/delete/:id", async (req, reply) => {
		if (!req.session.user || !req.session.user.admin) {
			return reply.status(401).send({ code: reply.statusCode, message: "Unauthorized" });
		}

		const params = req.params as { id: string };
		if (params.id === req.session.user.steamId) {
			return reply.status(401).send({ code: reply.statusCode, message: "Unauthorized" });
		}

		const user = await getUserFromSteam(fastify, params.id);
		if (!user) {
			return reply.status(404).send({ code: reply.statusCode, message: "User not found" });
		}

		const users = fastify.mongo.db?.collection<User>("users");
		if (!users) {
			return reply
				.status(500)
				.send({ code: reply.statusCode, message: "Collection not found" });
		}

		const res = await users.deleteOne({ steamId: params.id });
		if (res.deletedCount === 0) {
			return reply
				.status(500)
				.send({ code: reply.statusCode, message: "Error while deleting user" });
		}

		reply.status(200).send({ code: reply.statusCode, message: "User deleted successfully" });
	});

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
