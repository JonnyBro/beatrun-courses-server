import config from "@/../config.json" with { type: "json" };
import { runMigrations } from "@/migrations/index.js";
import { Course, User } from "@/types.js";
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

		if (!fastify.mongo.db) throw new Error("No database name in the mongo URL");

		await runMigrations(fastify.mongo.db);

		fastify.decorate("getCollection", (name: string) => {
			const collection = fastify.mongo.db?.collection(name);
			if (!collection) return;

			return collection;
		});

		fastify.decorate("getCourse", async (code: string) => {
			const collection = fastify.getCollection("courses");
			if (!collection) return;

			const course = await collection.findOne({ code });
			if (!course) return;

			return course as Course;
		});

		fastify.decorate("getCoursesCollection", () => {
			const collection = fastify.getCollection("courses");
			return collection;
		});

		fastify.decorate("getUser", async (steamId: string) => {
			const collection = fastify.getCollection("users");
			if (!collection) return;

			const user = await collection.findOne({ steamId });
			if (!user) return;

			return user as User;
		});

		fastify.decorate("getUsersCollection", () => {
			const collection = fastify.getCollection("users");
			return collection;
		});

		console.log("[backend] Decorators registered successfully");
	} catch (e) {
		console.error("[backend] Error while connecting to the database\n", e);

		// Without this the server would start with half the decorators missing or a half migrated database
		throw e;
	}
});

declare module "fastify" {
	interface FastifyInstance {
		getCollection: (name: string) => mongodb.Collection | undefined;
		getCourse: (code: string) => Promise<Course | undefined>;
		getCoursesCollection: () => mongodb.Collection | undefined;
		getUser: (steamId: string) => Promise<User | undefined>;
		getUsersCollection: () => mongodb.Collection | undefined;
	}
}
