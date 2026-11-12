import { ensureCollection, ensureIndex } from "./helpers.js";
import { Migration } from "./types.js";

export default {
	id: "001-initial-indexes",
	description: "Create the collections and the indexes the backend used to create on every start",
	up: async db => {
		await ensureCollection(db, "users");
		await ensureCollection(db, "courses");
		await ensureCollection(db, "records");

		await ensureIndex(db, "courses", { code: 1 }, { unique: true });
		await ensureIndex(db, "courses", { "uploadedBy.steamId": 1 });
		await ensureIndex(db, "courses", { crc: 1 });
		await ensureIndex(db, "records", { courseCode: 1, steamId: 1 }, { unique: true });
		await ensureIndex(db, "records", { courseCode: 1, time: 1 });
		await ensureIndex(db, "records", { steamId: 1 });
	},
} satisfies Migration;
