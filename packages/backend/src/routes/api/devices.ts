import { limits } from "@/plugins/rateLimit.js";
import {
	createDevice,
	createLink,
	deviceLinks,
	devices,
	hashToken,
	LINK_LIFETIME,
	normalizeLinkCode,
	parseSystem,
	POLL_INTERVAL,
	toPublicDevice,
} from "@/utils/devices.js";
import { requireUser } from "@/utils/web.js";
import { mongodb } from "@fastify/mongodb";
import { FastifyInstance } from "fastify";

/**
 * Signing the game in without copying a key:
 * the game asks for a code, the player confirms it on the site, the game polls until it gets a token
 */
const router = (fastify: FastifyInstance, _options: object) => {
	fastify.post("/api/link/start", { config: limits.key }, async (req, reply) => {
		const { code, poll } = await createLink(fastify, parseSystem(req.headers.os, req.headers.branch));

		reply.status(200).send({
			code: reply.statusCode,
			data: { code, poll, interval: POLL_INTERVAL, expiresIn: LINK_LIFETIME / 1000 },
		});
	});

	fastify.get("/api/link/:code", { preHandler: requireUser(fastify) }, async (req, reply) => {
		const code = normalizeLinkCode((req.params as { code: string }).code);
		const link = code && (await deviceLinks(fastify).findOne({ _id: code, expiresAt: { $gt: new Date() } }));
		if (!link) return reply.status(404).send({ code: reply.statusCode, message: "The code has expired" });

		reply.status(200).send({
			code: reply.statusCode,
			data: { code: link._id, confirmed: Boolean(link.steamId), expiresAt: link.expiresAt.getTime() },
		});
	});

	fastify.post(
		"/api/link/:code/confirm",
		{ preHandler: requireUser(fastify), config: limits.key },
		async (req, reply) => {
			const code = normalizeLinkCode((req.params as { code: string }).code);
			if (!code) return reply.status(404).send({ code: 404, message: "The code has expired" });

			const link = await deviceLinks(fastify).findOneAndUpdate(
				{ _id: code, steamId: { $exists: false }, expiresAt: { $gt: new Date() } },
				{ $set: { steamId: req.webUser!.steamId } },
			);
			if (link) return reply.status(200).send({ code: reply.statusCode, message: "Confirmed" });

			const exists = await deviceLinks(fastify).countDocuments({ _id: code, expiresAt: { $gt: new Date() } });

			reply
				.status(exists ? 409 : 404)
				.send({ code: reply.statusCode, message: exists ? "Already confirmed" : "The code has expired" });
		},
	);

	fastify.post(
		"/api/link/poll",
		{
			config: limits.poll,
			schema: {
				headers: { type: "object", required: ["poll"], properties: { poll: { type: "string" } } },
			},
		},
		async (req, reply) => {
			const pollHash = hashToken(req.headers.poll as string);
			const link = await deviceLinks(fastify).findOne({ pollHash, expiresAt: { $gt: new Date() } });
			if (!link) return reply.status(404).send({ code: reply.statusCode, message: "The code has expired" });

			if (!link.steamId) return reply.status(202).send({ code: reply.statusCode, message: "Waiting" });

			// Two polls at once must not both get a token
			const taken = await deviceLinks(fastify).findOneAndDelete({ _id: link._id, pollHash });
			if (!taken?.steamId) return reply.status(404).send({ code: 404, message: "The code has expired" });

			const token = await createDevice(fastify, taken.steamId, taken.system, req.ip);

			reply.status(200).send({ code: reply.statusCode, data: { token } });
		},
	);

	/** Sign out in the game, the token stops working */
	fastify.delete(
		"/api/devices/current",
		{
			config: limits.key,
			schema: {
				headers: {
					type: "object",
					required: ["authorization"],
					properties: { authorization: { type: "string" } },
				},
			},
		},
		async (req, reply) => {
			await devices(fastify).deleteOne({ tokenHash: hashToken(req.headers.authorization!) });

			reply.status(200).send({ code: reply.statusCode, message: "Signed out" });
		},
	);

	fastify.get("/api/users/me/devices", { preHandler: requireUser(fastify) }, async (req, reply) => {
		const list = await devices(fastify)
			.find({ steamId: req.webUser!.steamId, expiresAt: { $gt: new Date() } })
			.sort({ lastUsedAt: -1 })
			.toArray();

		reply.status(200).send({ code: reply.statusCode, data: list.map(toPublicDevice) });
	});

	fastify.patch(
		"/api/users/me/devices/:id",
		{
			preHandler: requireUser(fastify),
			schema: {
				body: {
					type: "object",
					required: ["name"],
					properties: { name: { type: ["string", "null"], maxLength: 64 } },
				},
			},
		},
		async (req, reply) => {
			const { id } = req.params as { id: string };
			if (!mongodb.ObjectId.isValid(id)) {
				return reply.status(404).send({ code: 404, message: "Device not found" });
			}

			const name = (req.body as { name: string | null }).name?.trim();
			if (name && /[\u0000-\u001f\u007f]/.test(name)) {
				return reply.status(400).send({ code: 400, message: "The name can't contain control characters" });
			}

			const device = await devices(fastify).findOneAndUpdate(
				{ _id: new mongodb.ObjectId(id), steamId: req.webUser!.steamId },
				name ? { $set: { name } } : { $unset: { name: "" } },
				{ returnDocument: "after" },
			);
			if (!device) return reply.status(404).send({ code: reply.statusCode, message: "Device not found" });

			reply.status(200).send({ code: reply.statusCode, data: toPublicDevice(device) });
		},
	);

	fastify.delete("/api/users/me/devices/:id", { preHandler: requireUser(fastify) }, async (req, reply) => {
		const { id } = req.params as { id: string };
		if (!mongodb.ObjectId.isValid(id)) return reply.status(404).send({ code: 404, message: "Device not found" });

		const res = await devices(fastify).deleteOne({
			_id: new mongodb.ObjectId(id),
			steamId: req.webUser!.steamId,
		});
		if (!res.deletedCount) return reply.status(404).send({ code: reply.statusCode, message: "Device not found" });

		reply.status(200).send({ code: reply.statusCode, message: "Device removed" });
	});
};

export default router;
