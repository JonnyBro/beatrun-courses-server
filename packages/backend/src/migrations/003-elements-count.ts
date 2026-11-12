import { CourseData } from "@/types.js";
import { brotliDecompressSync } from "zlib";
import { Migration } from "./types.js";

export default {
	id: "003-elements-count",
	description: "Replace objectCount of old courses with elementsCount",
	up: async db => {
		const courses = db.collection("courses");
		const old = courses.find(
			{ elementsCount: { $exists: false } },
			{ projection: { code: 1, data: 1, objectCount: 1 } },
		);
		let updated = 0;

		for await (const course of old) {
			let count = typeof course.objectCount === "number" ? course.objectCount : 0;

			// objectCount only counted props, elementsCount also has entities and spawnables
			try {
				const json = JSON.parse(
					brotliDecompressSync((course.data as { buffer: Buffer }).buffer).toString("utf-8"),
				) as CourseData;

				count = json[0].length + json[5].length + (json[7]?.length ?? 0);
			} catch {
				// Keep objectCount
			}

			await courses.updateOne(
				{ _id: course._id },
				{ $set: { elementsCount: count }, $unset: { objectCount: "" } },
			);
			updated++;
		}

		await courses.updateMany({ objectCount: { $exists: true } }, { $unset: { objectCount: "" } });

		console.log(`[migrations] Set elementsCount for ${updated} course(s)`);
	},
} satisfies Migration;
