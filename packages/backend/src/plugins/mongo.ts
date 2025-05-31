import fastifyMongo from "@fastify/mongodb";
import { FastifyInstance, FastifyPluginOptions } from "fastify";

interface MongoPluginOptions extends FastifyPluginOptions {
	mongoUrl: string;
}

const plugin = async (fastify: FastifyInstance, options: MongoPluginOptions) => {
	try {
		await fastify.register(fastifyMongo, { url: options.mongoUrl });
	} catch (e) {
		throw e;
	}
};

export default plugin;
