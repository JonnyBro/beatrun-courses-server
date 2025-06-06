import { FastifyInstance } from "fastify";
import config from "../../config.json";
import { buildAuthUrl, getSteamProfile, checkLogin } from "../modules/steam";

const router = (fastify: FastifyInstance, _options: object) => {
	fastify.get("/auth", (req, reply) => {
		const url = buildAuthUrl(config.domain, `${config.domain}/auth/callback`);

		reply.redirect(url);
	});

	fastify.get("/auth/callback", async (req, reply) => {
		try {
			const steamId = (await checkLogin(req.url, config.domain)).getBigIntID().toString();

			req.session.profile = await getSteamProfile(steamId, config.steamKey);

			reply.redirect("/api/users/create");
		} catch (e) {
			reply.status(500).send({ code: reply.statusCode, message: e });
			console.error(e);
		}
	});

	fastify.get("/profile", async (req, reply) => {
		if (!req.session.profile) return reply.redirect("/auth");

		reply.send(req.session.profile);
	});
};

export default router;
