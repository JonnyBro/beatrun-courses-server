import { mongodb } from "@fastify/mongodb";

export const ensureCollection = async (db: mongodb.Db, name: string) => {
	if (await db.listCollections({ name }, { nameOnly: true }).hasNext()) return;

	await db.createCollection(name);

	console.log(`[migrations] Created '${name}' collection`);
};

// Older versions created plain indexes with the same auto-generated names, Mongo refuses to change them in place
export const ensureIndex = async (
	db: mongodb.Db,
	name: string,
	key: Record<string, 1 | -1>,
	options: mongodb.CreateIndexesOptions = {},
) => {
	const collection = db.collection(name);
	const existing = (await collection.indexes()).find(index => JSON.stringify(index.key) === JSON.stringify(key));

	if (existing && Boolean(existing.unique) === Boolean(options.unique)) return;
	if (existing?.name) await collection.dropIndex(existing.name);

	await collection.createIndex(key, options);

	console.log(
		`[migrations] Created ${options.unique ? "a unique" : "an"} index on ${name} (${Object.keys(key).join(", ")})`,
	);
};

type Duplicates = { ids: mongodb.ObjectId[] };

/** Ids of every group of documents with the same key, oldest first */
export const findDuplicates = (
	collection: mongodb.Collection,
	key: Record<string, string>,
	match: mongodb.Filter<mongodb.Document> = {},
) =>
	collection
		.aggregate<Duplicates>([
			{ $match: match },
			{ $sort: { _id: 1 } },
			{ $group: { _id: key, ids: { $push: "$_id" }, count: { $sum: 1 } } },
			{ $match: { count: { $gt: 1 } } },
		])
		.toArray();

/** Keeps the oldest document of every group, findOne() without a sort returns that one too */
export const removeDuplicates = async (db: mongodb.Db, name: string, key: Record<string, string>) => {
	const collection = db.collection(name);
	let removed = 0;

	for (const { ids } of await findDuplicates(collection, key)) {
		removed += (await collection.deleteMany({ _id: { $in: ids.slice(1) } })).deletedCount;
	}

	if (removed) console.log(`[migrations] Removed ${removed} duplicate(s) from ${name}`);
};
