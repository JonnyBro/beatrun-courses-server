import config, { frontendPath } from "@/config.js";
import pkg from "@/../package.json" with { type: "json" };
import { adminRouter, coursesRouter, devicesRouter, leaderboardRouter, usersRouter } from "@/routes/api/index.js";
import authRouter from "@/routes/auth.js";
import fastifyFormbody from "@fastify/formbody";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { existsSync } from "fs";
import { resolve } from "path";
import { mongoPlugin } from "./plugins/mongo.js";
import { rateLimitPlugin } from "./plugins/rateLimit.js";
import { securityPlugin } from "./plugins/security.js";
import { sessionPlugin } from "./plugins/session.js";
import { loadGeoIp } from "./utils/geoip.js";

const fastify = Fastify({
	trustProxy: config.isBehindProxy,
	routerOptions: {
		ignoreTrailingSlash: true,
	},
	logger: !config.production,
});

// Plugins
fastify.register(securityPlugin);
fastify.register(rateLimitPlugin);
fastify.register(mongoPlugin);
fastify.register(sessionPlugin);
fastify.register(fastifyFormbody);

// Routers
fastify.register(authRouter);
fastify.register(adminRouter);
fastify.register(coursesRouter);
fastify.register(leaderboardRouter);
fastify.register(usersRouter);
fastify.register(devicesRouter);

if (existsSync(resolve(frontendPath, "index.html"))) {
	fastify.register(fastifyStatic, { root: frontendPath });

	fastify.setNotFoundHandler((req, reply) => {
		if (req.method === "GET" && !req.url.startsWith("/api") && !req.url.startsWith("/auth")) {
			return reply.sendFile("index.html");
		}

		reply.status(404).send({ code: 404, message: "Not found" });
	});
}

await loadGeoIp();

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
