import { ensureCollection, ensureIndex } from "./helpers.js";
import { Migration } from "./types.js";

export default {
	id: "005-pending-records",
	description: "Create the collection for runs waiting for review",
	up: async db => {
		await ensureCollection(db, "pendingRecords");

		await ensureIndex(db, "pendingRecords", { courseCode: 1, steamId: 1 }, { unique: true });
		await ensureIndex(db, "pendingRecords", { createdAt: -1 });
	},
} satisfies Migration;
