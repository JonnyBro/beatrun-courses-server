import fastifyCookie from "@fastify/cookie";
import fastifySession from "@fastify/session";
import Fastify from "fastify";
import config from "../config.json";
import mongoPlugin from "./plugins/mongo";
import apiRouter from "./routes/api";
import indexRouter from "./routes/index";
import authRouter from "./routes/auth";

const fastify = Fastify({ logger: !config.prod });

fastify.register(mongoPlugin);
fastify.register(fastifyCookie);
fastify.register(fastifySession, {
	secret: config.secret,
	cookie: {
		secure: config.prod,
		maxAge: 24 * 60 * 60 * 1000, // 24 hours
	},
});

fastify.register(indexRouter);
fastify.register(apiRouter);
fastify.register(authRouter);

fastify.listen({ host: "0.0.0.0", port: config.port }, err => {
	if (err) {
		fastify.log.error(err);
		process.exit(1);
	}
});
