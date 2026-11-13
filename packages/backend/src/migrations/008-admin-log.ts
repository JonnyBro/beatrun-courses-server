import { ensureCollection, ensureIndex } from "./helpers.js";
import { Migration } from "./types.js";

export default {
	id: "008-admin-log",
	description: "Create the log of admin actions",
	up: async db => {
		await ensureCollection(db, "adminLog");

		await ensureIndex(db, "adminLog", { at: -1 });
		await ensureIndex(db, "adminLog", { admin: 1, at: -1 });
	},
} satisfies Migration;
