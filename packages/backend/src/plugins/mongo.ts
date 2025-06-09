import fastifyMongo from "@fastify/mongodb";
import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";
import config from "../../config.json";

export const mongoPlugin = fastifyPlugin(async (fastify: FastifyInstance) => {
	try {
		await fastify.register(fastifyMongo, {
			forceClose: true,
			url: config.mongo,
		});

		const collections = await fastify.mongo.db?.listCollections().toArray();

		if (!collections?.some(c => c.name === "users")) {
			await fastify.mongo.db?.createCollection("users");
			console.log("[backend] Created 'users' collection");
		}

		if (!collections?.some(c => c.name === "courses")) {
			await fastify.mongo.db?.createCollection("courses");
			console.log("[backend] Created 'courses' collection");
		}

		console.log("[backend] Connected to the database successfully");
	} catch (e) {
		console.error("[backend] Error while connecting to the database\n", e);
	}
});

export const getCollection = (fastify: FastifyInstance, name: string) => {
	const collection = fastify.mongo.db?.collection(name);
	if (!collection) throw new Error(`Collection ${name} does not exists in the database`);
	return collection;
};
