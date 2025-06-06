import fastifyMongo from "@fastify/mongodb";
import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";
import config from "../../config.json";

async function dbConnector(fastify: FastifyInstance) {
	try {
		await fastify.register(fastifyMongo, {
			forceClose: true,
			url: config.mongo,
		});

		console.log("[backend] Connected to the database successfully");
	} catch (e) {
		console.error("[backend] Error while connecting to the database\n", e);
	}
}

export default fastifyPlugin(dbConnector);
