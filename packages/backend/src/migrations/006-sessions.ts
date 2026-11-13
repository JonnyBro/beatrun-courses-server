import { ensureCollection } from "./helpers.js";
import { Migration } from "./types.js";

export default {
	id: "006-sessions",
	description: "Store web sessions in the database",
	up: async db => {
		await ensureCollection(db, "sessions");

		await db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
	},
} satisfies Migration;
