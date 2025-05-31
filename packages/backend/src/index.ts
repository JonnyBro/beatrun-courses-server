import Fastify from "fastify";
import config from "../config.js";

const fastify = Fastify({ logger: !config.prod });
import indexRouter from "./routes/indexRouter";

fastify.register(indexRouter);

fastify.get("/", async function (request, reply) {
	return { hello: "world" };
});

const start = async () => {
	fastify.listen({ host: "0.0.0.0", port: config.port }, (err, address) => {
		if (err) {
			fastify.log.error(err);
			process.exit(1);
		}

		fastify.log.info(`Server is listening on ${address}`);
	});
};

start();
