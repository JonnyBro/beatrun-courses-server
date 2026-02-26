import { type SteamUser } from "@/modules/steam.js";
import { createUser, getUserFromKey, getUserFromSteamIdOrProfile } from "@/utils/functions.js";
import { FastifyInstance } from "fastify";

const router = (fastify: FastifyInstance, _options: object) => {
	fastify.get("/api/users/register", async (req, reply) => {
		if (!req.session.profile) return reply.status(401).send({ code: reply.statusCode, message: "Unauthorized" });

		const profile = req.session.profile as SteamUser | string;

		let user = await getUserFromSteamIdOrProfile(fastify, profile);
		if (!user) user = await createUser(fastify, profile);

		req.session.user = user;

		return reply
			.status(200)
			.send(
				`User: ${user.username || "null"}\nKey: ${user.key}\nCopy the key above and paste it into the box in-game.`,
			);
	});

	fastify.get("/api/users/get/:id", async (req, reply) => {
		if (!req.session.user?.admin) {
			return reply.status(401).send({ code: reply.statusCode, message: "Unauthorized" });
		}

		const params = req.params as { id: string };
		const user = await getUserFromSteamIdOrProfile(fastify, params.id);
		if (!user) return reply.status(404).send({ code: reply.statusCode, message: "No user found" });

		reply.status(200).send({ code: reply.statusCode, data: user });
	});

	fastify.get(
		"/api/key/validate",
		{
			schema: {
				headers: {
					type: "object",
					required: ["key"],
					properties: {
						key: { type: "string" },
					},
				},
			},
		},
		async (req, reply) => {
			const key = req.headers.key as string;

			const user = await getUserFromKey(fastify, key);
			if (!user) return reply.status(200).send({ code: reply.statusCode, data: false });

			reply.status(200).send({ code: reply.statusCode, data: true });
		},
	);

	fastify.delete("/api/users/delete/:id", async (req, reply) => {
		if (!req.session.user?.admin) {
			return reply.status(401).send({ code: reply.statusCode, message: "Unauthorized" });
		}

		const params = req.params as { id: string };
		if (params.id === req.session.user.steamId) {
			return reply.status(403).send({ code: reply.statusCode, message: "Forbidden" });
		}

		const user = await getUserFromSteamIdOrProfile(fastify, params.id);
		if (!user) {
			return reply.status(404).send({ code: reply.statusCode, message: "User not found" });
		}

		const users = fastify.getCollection("users");

		const res = await users?.deleteOne({ steamId: params.id });
		if (res?.deletedCount === 0) {
			return reply.status(500).send({ code: reply.statusCode, message: "Error while deleting a user" });
		}

		reply.status(200).send({ code: reply.statusCode, message: `User ${user.steamId} deleted successfully` });
	});
};

export default router;
