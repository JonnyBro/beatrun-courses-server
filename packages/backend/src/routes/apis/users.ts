import { FastifyInstance } from "fastify";
import config from "../../../config.json";
import { hasGame } from "../../modules/steam";
import { User } from "../../types";
import { getUserFromSteam, isSteamUser } from "../../utils/functions";

const router = (fastify: FastifyInstance, _options: object) => {
	fastify.get("/api/users/create", async (req, reply) => {
		const profile = req.session.profile;
		if (!profile) {
			return reply.status(401).send({ code: reply.statusCode, message: "Unauthorized" });
		}

		const isSUser = isSteamUser(profile);

		if (isSUser) {
			const createdAt = profile.timecreated * 1000;
			if (Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24 * 30)) < 3) {
				return reply.status(401).send({
					code: reply.statusCode,
					message: "Your account is too young. The account must be at least 3 months old",
				});
			}
		}

		const hasGmod = isSUser ? await hasGame(profile.steamid, config.steamApiKey, 4000) : true;
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
			return reply.status(403).send({ code: reply.statusCode, message: "Forbidden" });
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

		reply.status(200).send({ code: reply.statusCode, message: `User ${user.steamId} deleted successfully` });
	});
};

export default router;
