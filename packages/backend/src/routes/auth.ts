import config from "@/../config.json";
import { buildAuthUrl, checkLogin, getSteamProfile } from "@/modules/steam";
import { FastifyInstance } from "fastify";

const router = (fastify: FastifyInstance, _options: object) => {
	fastify.get("/auth", (_req, reply) => {
		const url = buildAuthUrl(config.domain, `${config.domain}/auth/callback`);

		reply.redirect(url);
	});

	fastify.get("/auth/callback", async (req, reply) => {
		try {
			const steamId = (await checkLogin(req.url, config.domain)).getBigIntID().toString();

			if (!config.steamApiKey) req.session.profile = steamId;
			else req.session.profile = await getSteamProfile(steamId, config.steamApiKey);

			reply.redirect("/users/create");
		} catch (e) {
			reply.status(500).send({ code: reply.statusCode, message: e });
			console.error(e);
		}
	});

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
