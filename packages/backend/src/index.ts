import Fastify from "fastify";
import config from "../config.json";
import mongoPlugin from "./plugins/mongo";
import indexRouter from "./routes/index";
import apiRouter from "./routes/api";

const fastify = Fastify({ logger: !config.prod });

// Plugins
fastify.register(mongoPlugin);

// Routes
fastify.register(indexRouter);
fastify.register(apiRouter);

fastify.listen({ host: "0.0.0.0", port: config.port }, err => {
	if (err) {
		fastify.log.error(err);
		process.exit(1);
	}
});
