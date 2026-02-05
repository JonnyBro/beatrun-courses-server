import config from "@/../config.json";
import { hasGame } from "@/modules/steam";
import { createUser, getUserFromSteam, isSteamUser } from "@/utils/functions";
import { FastifyInstance } from "fastify";

const router = (fastify: FastifyInstance, _options: object) => {
	fastify.get("/users/create", async (req, reply) => {
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
					message: "Your account is too young. Your account must be at least 3 months old",
				});
			}

			const hasGmod = await hasGame(profile.steamid, config.steamApiKey, 4000);
			if (!hasGmod) {
				return reply.status(401).send({
					code: reply.statusCode,
					message:
						// eslint-disable-next-line max-len
						"Your account doesn't own Garry's Mod. If this is not true, make sure your Steam profile is set to public",
				});
			}
		}

		let user = await getUserFromSteam(fastify, profile);
		if (!user) user = await createUser(fastify, profile);

		req.session.user = user;

		reply.status(200).send({ code: reply.statusCode, data: req.session.user });
	});

	fastify.get("/users/get/:id", async (req, reply) => {
		if (!req.session.user || !req.session.user.admin) {
			return reply.status(401).send({ code: reply.statusCode, message: "Unauthorized" });
		}

		const params = req.params as { id: string };
		const user = await getUserFromSteam(fastify, params.id);
		if (!user) return reply.status(404).send({ code: reply.statusCode, message: "No user found" });

		reply.status(200).send({ code: reply.statusCode, data: user });
	});

	fastify.delete("/users/delete/:id", async (req, reply) => {
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

		const users = fastify.getCollection("users");

		const res = await users.deleteOne({ steamId: params.id });
		if (res.deletedCount === 0) {
			return reply.status(500).send({ code: reply.statusCode, message: "Error while deleting a user" });
		}

		reply.status(200).send({ code: reply.statusCode, message: `User ${user.steamId} deleted successfully` });
	});
};

export default router;
