import { FastifyInstance } from "fastify";
import config from "../../config.json";
import { buildAuthUrl, getSteamProfile, checkLogin } from "../modules/steam";

const router = (fastify: FastifyInstance, _options: object) => {
	fastify.get("/auth/steam", (req, reply) => {
		const url = buildAuthUrl(config.domain, `${config.domain}/auth/steam/callback`);

		reply.redirect(url);
	});

	fastify.get("/auth/steam/callback", async (req, reply) => {
		try {
			const steamId = (await checkLogin(req.url, config.domain)).getBigIntID().toString();

			req.session.profile = await getSteamProfile(steamId, config.steamKey);

			reply.redirect("/");
		} catch (e) {
			reply.status(500).send({ code: reply.statusCode, message: e });
			console.error(e);
		}
	});
};

export default router;
