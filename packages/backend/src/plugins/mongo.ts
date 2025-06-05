import fastifyMongo, { ObjectId } from "@fastify/mongodb";
import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";
import config from "../../config.json";

export interface User {
	_id?: ObjectId;
	steamId: string;
	username?: string;
	key: string;
	createdAt: Date;
}

async function dbConnector(fastify: FastifyInstance) {
	await fastify.register(fastifyMongo, {
		forceClose: true,
		url: config.mongo,
	});

	console.log("[backend] Database connected");
}

export default fastifyPlugin(dbConnector);
