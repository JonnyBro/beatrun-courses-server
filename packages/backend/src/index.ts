import config from "@/../config.json";
import { coursesRouter, usersRouter } from "@/routes/apis";
// import authRouter from "@/routes/auth";
import indexRouter from "@/routes/index";
import fastifyCookie from "@fastify/cookie";
import fastifyFormbody from "@fastify/formbody";
import fastifySession from "@fastify/session";
import Fastify from "fastify";
import { mongoPlugin } from "./plugins/mongo";

const fastify = Fastify({
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
// fastify.register(authRouter);
fastify.register(coursesRouter);
fastify.register(indexRouter);
fastify.register(usersRouter);

fastify.listen({ host: "0.0.0.0", port: config.port }, err => {
	if (err) {
		fastify.log.error(err);
		process.exit(1);
	}
});
