import config from "@/../config.json" with { type: "json" };
import { Course, User } from "@/types.js";
import fastifyMongo, { mongodb } from "@fastify/mongodb";
import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";
import { brotliDecompressSync, crc32 } from "zlib";

export const mongoPlugin = fastifyPlugin(async (fastify: FastifyInstance) => {
	try {
		await fastify.register(fastifyMongo, {
			forceClose: true,
			url: config.mongo,
		});

		console.log("[backend] Connected to the database successfully");

		const db = fastify.mongo.db;

		const collections = await fastify.mongo.db?.listCollections().toArray();

		if (!collections?.some(c => c.name === "users")) {
			await fastify.mongo.db?.createCollection("users");
			console.log("[backend] Created 'users' collection");
		}

		if (!collections?.some(c => c.name === "courses")) {
			await fastify.mongo.db?.createCollection("courses");
			console.log("[backend] Created 'courses' collection");
		}

		if (!collections?.some(c => c.name === "records")) {
			await fastify.mongo.db?.createCollection("records");
			console.log("[backend] Created 'records' collection");
		}

		await db?.collection("users").createIndex({ steamId: 1 });
		await db?.collection("courses").createIndex({ code: 1 });
		await db?.collection("courses").createIndex({ "uploadedBy.steamId": 1 });
		await db?.collection("records").createIndex({ courseCode: 1, steamId: 1 }, { unique: true });
		await db?.collection("records").createIndex({ courseCode: 1, time: 1 });
		await db?.collection("records").createIndex({ steamId: 1 });
		await db?.collection("courses").createIndex({ crc: 1 });

		// Courses uploaded before records existed don't have a CRC, the game identifies loaded courses by it
		const withoutCrc = db
			?.collection("courses")
			.find({ crc: { $exists: false } }, { projection: { code: 1, data: 1 } });
		let backfilled = 0;

		for await (const course of withoutCrc ?? []) {
			try {
				const crc = String(crc32(brotliDecompressSync(course.data.buffer)));
				await db?.collection("courses").updateOne({ _id: course._id }, { $set: { crc } });
				backfilled++;
			} catch (e) {
				console.error(`[backend] Failed to calculate CRC for course ${course.code}\n`, e);
			}
		}

		if (backfilled) console.log(`[backend] Calculated CRC for ${backfilled} courses`);

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

		fastify.decorate("getCoursesArray", async () => {
			const collection = fastify.getCollection("courses");
			if (!collection) return;

			const array = await collection.find({}).toArray();
			return array as Course[];
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

		fastify.decorate("getUsersArray", async () => {
			const collection = fastify.getCollection("users");
			if (!collection) return;

			const array = await collection.find({}).toArray();
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
		getCollection: (name: string) => mongodb.Collection | undefined;
		getCourse: (code: string) => Promise<Course | undefined>;
		getCoursesArray: () => Promise<Course[] | undefined>;
		getCoursesCollection: () => mongodb.Collection | undefined;
		getUser: (steamId: string) => Promise<User | undefined>;
		getUsersArray: () => Promise<User[] | undefined>;
		getUsersCollection: () => mongodb.Collection | undefined;
	}
}
