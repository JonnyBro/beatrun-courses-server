// pnpm --filter ./packages/backend check-courses
import config from "@/config.js";
import { validateCourse } from "@/utils/courseValidation.js";
import { mongodb } from "@fastify/mongodb";
import { brotliDecompressSync } from "zlib";

const client = await mongodb.MongoClient.connect(config.mongo, { serverSelectionTimeoutMS: 5000 });
const courses = client.db().collection("courses");

const reasons = new Map<string, string[]>();
let total = 0;

for await (const course of courses.find({}, { projection: { code: 1, data: 1 } })) {
	total++;

	let error: string | undefined;

	try {
		const json = brotliDecompressSync((course.data as mongodb.Binary).buffer).toString("utf-8");
		error = validateCourse(JSON.parse(json));
	} catch (e) {
		error = `can't be read: ${(e as Error).message}`;
	}

	if (error) reasons.set(error, [...(reasons.get(error) ?? []), course.code as string]);
}

await client.close();

const failed = [...reasons.values()].reduce((sum, codes) => sum + codes.length, 0);
console.log(`${total} courses, ${failed} would be rejected now`);

for (const [reason, codes] of [...reasons].sort((a, b) => b[1].length - a[1].length)) {
	console.log(`\n${codes.length}  ${reason}\n    ${codes.slice(0, 20).join(" ")}${codes.length > 20 ? " ..." : ""}`);
}
