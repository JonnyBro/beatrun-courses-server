import config from "@/../config.json";
import { Course, User } from "@/types";
import fastifyMongo, { mongodb } from "@fastify/mongodb";
import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";

export const mongoPlugin = fastifyPlugin(async (fastify: FastifyInstance) => {
	try {
		await fastify.register(fastifyMongo, {
			forceClose: true,
			url: config.mongo,
		});

		console.log("[backend] Connected to the database successfully");

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

		fastify.decorate("getCourse", async (code: string) => {
			const course = await fastify.getCollection("courses").findOne({ code });
			return course as Course | null;
		});

		fastify.decorate("getCoursesArray", async () => {
			const array = await fastify.getCollection("courses").find({}).toArray();
			return array as Course[];
		});

		fastify.decorate("getCoursesCollection", () => {
			const collection = fastify.getCollection("courses");
			return collection;
		});

		fastify.decorate("getUser", async (steamId: string) => {
			const user = await fastify.getCollection("users").findOne({ steamId });
			return user as User | null;
		});

		fastify.decorate("getUsersArray", async () => {
			const array = await fastify.getCollection("users").find({}).toArray();
			return array as User[];
		});

		fastify.decorate("getUsersCollection", () => {
			const collection = fastify.getCollection("users");
			return collection;
		});

		console.log("[backend] Decorators registered successfully");
	} catch (e) {
		console.error("[backend] Error while connecting to the database\n", e);
	}
});

declare module "fastify" {
	interface FastifyInstance {
		getCollection: (name: string) => mongodb.Collection;
		getCourse: (code: string) => Promise<Course | null>;
		getCoursesArray: () => Promise<Course[]>;
		getCoursesCollection: () => mongodb.Collection;
		getUser: (steamId: string) => Promise<User | null>;
		getUsersArray: () => Promise<User[]>;
		getUsersCollection: () => mongodb.Collection;
	}
}
