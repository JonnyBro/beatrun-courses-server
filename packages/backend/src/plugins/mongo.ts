import config from "@/../config.json";
import fastifyMongo, { mongodb } from "@fastify/mongodb";
import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";

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

		fastify.decorate("getCollection", (name: string) => {
			const collection = fastify.mongo.db?.collection(name);
			if (!collection) throw new Error(`Collection ${name} does not exists in the database`);
			return collection;
		});

		fastify.decorate("getCourse", (code: string) => {
			const course = fastify.getCollection("courses").find({ code });
			return course;
		});

		fastify.decorate("getCoursesArray", async () => {
			const array = await fastify.getCollection("courses").find({}).toArray();
			return array;
		});

		fastify.decorate("getCoursesCollection", () => {
			const collection = fastify.getCollection("courses");
			return collection;
		});

		fastify.decorate("getUser", (steamId: string) => {
			const user = fastify.getCollection("users").find({ steamId });
			return user;
		});

		fastify.decorate("getUsersArray", async () => {
			const array = await fastify.getCollection("users").find({}).toArray();
			return array;
		});

		fastify.decorate("getUsersCollection", () => {
			const collection = fastify.getCollection("users");
			return collection;
		});

		console.log("[backend] Connected to the database successfully");
	} catch (e) {
		console.error("[backend] Error while connecting to the database\n", e);
	}
});

declare module "fastify" {
	interface FastifyInstance {
		getCollection: (name: string) => mongodb.Collection;
		getCourse: (code: string) => mongodb.FindCursor<mongodb.WithId<mongodb.BSON.Document>>;
		getCoursesArray: () => Promise<mongodb.WithId<mongodb.Document>[]>;
		getCoursesCollection: () => mongodb.Collection;
		getUser: (steamId: string) => mongodb.FindCursor<mongodb.WithId<mongodb.BSON.Document>>;
		getUsersArray: () => Promise<mongodb.WithId<mongodb.Document>[]>;
		getUsersCollection: () => mongodb.Collection;
	}
}
