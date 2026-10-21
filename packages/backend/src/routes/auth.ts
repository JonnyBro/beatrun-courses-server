import config from "@/../config.json" with { type: "json" };
import { buildAuthUrl, checkLogin, getSteamProfile } from "@/modules/steam.js";
import { createUser } from "@/utils/functions.js";
import { FastifyInstance } from "fastify";

const router = (fastify: FastifyInstance, _options: object) => {
	fastify.get("/auth", (req, reply) => {
		const { redirect } = req.query as { redirect?: string };
		if (redirect && redirect.startsWith("/") && !redirect.startsWith("//")) req.session.returnTo = redirect;

		const url = buildAuthUrl(config.domain, `${config.domain}/auth/callback`);

		reply.redirect(url);
	});

	fastify.get("/auth/callback", async (req, reply) => {
		try {
			const steamId = (await checkLogin(req.url, config.domain)).getBigIntID().toString();

			if (!config.steamApiKey) req.session.profile = steamId;
			else req.session.profile = await getSteamProfile(steamId, config.steamApiKey);

			reply.redirect("/api/users/register");
		} catch (e) {
			reply.status(500).send({ code: reply.statusCode, message: e });
			console.error(e);
		}
	});

	if (!config.production) {
		const DEV_USERS: Record<string, { steamId: string; username: string; admin: boolean }> = {
			admin: { steamId: "90000000000000001", username: "Dev Admin", admin: true },
			user: { steamId: "90000000000000002", username: "Dev User", admin: false },
			user2: { steamId: "90000000000000003", username: "Dev User 2", admin: false },
		};

		fastify.get("/auth/dev/:name", async (req, reply) => {
			const dev = DEV_USERS[(req.params as { name: string }).name];
			if (!dev) return reply.status(404).send({ code: 404, message: "Unknown dev account" });

			if (!(await fastify.getUser(dev.steamId))) {
				await createUser(fastify, dev.steamId, dev.username);
				await fastify.getUsersCollection()?.updateOne({ steamId: dev.steamId }, { $set: { admin: dev.admin } });
			}

			req.session.profile = dev.steamId;
			req.session.user = await fastify.getUser(dev.steamId);

			const { redirect } = req.query as { redirect?: string };
			reply.redirect(redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/");
		});
	}

	fastify.get("/auth/logout", async (req, reply) => {
		await req.session.destroy();

		reply.redirect("/");
	});

	fastify.get("/auth/info", async (req, reply) => {
		reply.status(200).send({
			code: reply.statusCode,
			profile: req.session.profile || {},
			user: req.session.user || {},
		});
	});
};

export default router;
