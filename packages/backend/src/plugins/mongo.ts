import fastifyMongo from "@fastify/mongodb";
import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";
import config from "../../config.json";

async function dbConnector(fastify: FastifyInstance) {
	await fastify.register(fastifyMongo, {
		url: config.mongo,
	});
}

export default fastifyPlugin(dbConnector);
