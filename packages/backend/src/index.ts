import config from "@/../config.json" with { type: "json" };
import pkg from "@/../package.json" with { type: "json" };
import { adminRouter, coursesRouter, leaderboardRouter, usersRouter } from "@/routes/api/index.js";
import authRouter from "@/routes/auth.js";
import fastifyCookie from "@fastify/cookie";
import fastifyFormbody from "@fastify/formbody";
import fastifySession from "@fastify/session";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { mongoPlugin } from "./plugins/mongo.js";

const fastify = Fastify({
	trustProxy: config.isBehindProxy,
	routerOptions: {
		ignoreTrailingSlash: true,
	},
	logger: !config.production,
});

// Plugins
fastify.register(mongoPlugin);
fastify.register(fastifyCookie);
fastify.register(fastifySession, {
	secret: config.secret,
	cookie: {
		secure: config.production,
		maxAge: 72 * 60 * 60 * 1000, // 72 hours
	},
});
fastify.register(fastifyFormbody);

// Routers
fastify.register(authRouter);
fastify.register(adminRouter);
fastify.register(coursesRouter);
fastify.register(leaderboardRouter);
fastify.register(usersRouter);

const frontendPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../frontend/dist");

if (existsSync(resolve(frontendPath, "index.html"))) {
	fastify.register(fastifyStatic, { root: frontendPath });

	fastify.setNotFoundHandler((req, reply) => {
		if (req.method === "GET" && !req.url.startsWith("/api") && !req.url.startsWith("/auth")) {
			return reply.sendFile("index.html");
		}

		reply.status(404).send({ code: 404, message: "Not found" });
	});
}

fastify.listen(
	{
		host: config.host,
		port: config.port,
		listenTextResolver: address => `Server v${pkg.version} is listening at ${address}`,
	},
	err => {
		if (err) {
			fastify.log.error(err);
			process.exit(1);
		}
	},
);
