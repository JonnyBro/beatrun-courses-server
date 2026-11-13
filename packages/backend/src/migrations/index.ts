import { mongodb } from "@fastify/mongodb";
import initialIndexes from "./001-initial-indexes.js";
import courseCrc from "./002-course-crc.js";
import elementsCount from "./003-elements-count.js";
import uniqueUsers from "./004-unique-users.js";
import pendingRecords from "./005-pending-records.js";
import sessions from "./006-sessions.js";
import hashedKeys from "./007-hashed-keys.js";
import adminLog from "./008-admin-log.js";
import { Migration } from "./types.js";

// Append only, never reorder or edit migrations that have already been applied
const migrations: Migration[] = [
	initialIndexes,
	courseCrc,
	elementsCount,
	uniqueUsers,
	pendingRecords,
	sessions,
	hashedKeys,
	adminLog,
];

type AppliedMigration = { _id: string; appliedAt: Date };

export const runMigrations = async (db: mongodb.Db) => {
	const collection = db.collection<AppliedMigration>("migrations");
	const applied = new Set((await collection.find().toArray()).map(m => m._id));
	const pending = migrations.filter(m => !applied.has(m.id));

	if (!pending.length) return console.log("[migrations] Database is up to date");

	for (const migration of pending) {
		console.log(`[migrations] Running ${migration.id}: ${migration.description}`);

		await migration.up(db);
		await collection.insertOne({ _id: migration.id, appliedAt: new Date() });
	}

	console.log(`[migrations] Applied ${pending.length} migration(s)`);
};
