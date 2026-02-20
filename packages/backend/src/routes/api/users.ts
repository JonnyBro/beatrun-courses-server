import { createUser, getUserFromKey, getUserFromSteamIdOrProfile, sanitize } from "@/utils/functions.js";
import { FastifyInstance } from "fastify";

const router = (fastify: FastifyInstance, _options: object) => {
	fastify.post(
		"/api/users/register",
		{
			schema: {
				headers: {
					type: "object",
					required: ["steamid", "username"],
					properties: {
						steamid: { type: "string" },
						username: { type: "string" },
					},
				},
			},
		},
		async (req, reply) => {
			const steamId = req.headers.steamid as string;
			const username = sanitize(req.headers.username as string);
			let message = "User already existed";

			let user = await getUserFromSteamIdOrProfile(fastify, steamId);
			if (!user) {
				message = "User created successfully";
				user = await createUser(fastify, steamId, username);
			}

			reply.status(200).send({ code: reply.statusCode, message, data: user });
		},
	);

	fastify.get("/api/users/get/:id", async (req, reply) => {
		if (!req.session.user || !req.session.user.admin) {
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
		if (!req.session.user || !req.session.user.admin) {
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
