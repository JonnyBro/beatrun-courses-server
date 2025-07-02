import config from "@/../config.json";
import { coursesRouter, usersRouter } from "@/routes/apis/index";
import authRouter from "@/routes/auth";
import indexRouter from "@/routes/index";
import fastifyCookie from "@fastify/cookie";
import fastifySession from "@fastify/session";
import Fastify from "fastify";
import { mongoPlugin } from "./plugins/mongo";

const fastify = Fastify({
	ignoreTrailingSlash: true,
	logger: !config.production,
});

fastify.register(mongoPlugin);
fastify.register(fastifyCookie);
fastify.register(fastifySession, {
	secret: config.secret,
	cookie: {
		secure: config.production,
		maxAge: 24 * 60 * 60 * 1000, // 24 hours
	},
});

fastify.register(authRouter);
fastify.register(coursesRouter);
fastify.register(indexRouter);
fastify.register(usersRouter);

fastify.listen({ host: "0.0.0.0", port: config.port }, err => {
	if (err) {
		fastify.log.error(err);
		process.exit(1);
	}
});
