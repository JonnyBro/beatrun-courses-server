import config from "@/../config.json" with { type: "json" };
import { buildAuthUrl, checkLogin, getSteamProfile } from "@/modules/steam.js";
import { createUser, sanitize } from "@/utils/functions.js";
import { FastifyInstance, FastifyRequest } from "fastify";

const getRedirect = (req: FastifyRequest) => {
	const { redirect } = req.query as { redirect?: string };

	return redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/profile";
};

const router = (fastify: FastifyInstance, _options: object) => {
	fastify.get("/auth", (req, reply) => {
		const callback = `${config.domain}/auth/callback?redirect=${encodeURIComponent(getRedirect(req))}`;

		reply.redirect(buildAuthUrl(config.domain, callback));
	});

	fastify.get("/auth/callback", async (req, reply) => {
		let steamId: string;

		try {
			steamId = (await checkLogin(req.url, config.domain)).getBigIntID().toString();
		} catch (e) {
			console.error(e);
			return reply.redirect("/");
		}

		/* eslint-disable @stylistic/indent */
		const profile = config.steamApiKey
			? await getSteamProfile(steamId, config.steamApiKey).catch((e: unknown) => {
					console.error(e);
					return undefined;
				})
			: undefined;
		/* eslint-enable @stylistic/indent */

		if (!(await fastify.getUser(steamId))) await createUser(fastify, profile ?? steamId);

		if (profile) {
			const username = sanitize(profile.personaname);

			await fastify
				.getUsersCollection()
				?.updateOne({ steamId }, { $set: { avatar: profile.avatarfull, ...(username && { username }) } });
		}

		req.session.user = await fastify.getUser(steamId);

		reply.redirect(getRedirect(req));
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

			req.session.user = await fastify.getUser(dev.steamId);

			reply.redirect(getRedirect(req));
		});
	}

	fastify.get("/auth/logout", async (req, reply) => {
		await req.session.destroy();

		reply.redirect("/");
	});
};

export default router;
