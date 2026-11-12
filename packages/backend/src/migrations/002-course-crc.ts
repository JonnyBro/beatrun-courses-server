import { brotliDecompressSync, crc32 } from "zlib";
import { Migration } from "./types.js";

export default {
	id: "002-course-crc",
	description: "Calculate the CRC of courses uploaded before it was stored",
	up: async db => {
		const courses = db.collection("courses");
		const withoutCrc = courses.find({ crc: { $exists: false } }, { projection: { code: 1, data: 1 } });
		let updated = 0;

		for await (const course of withoutCrc) {
			try {
				const crc = String(crc32(brotliDecompressSync((course.data as { buffer: Buffer }).buffer)));

				await courses.updateOne({ _id: course._id }, { $set: { crc } });
				updated++;
			} catch (e) {
				// A broken course can't be played anyway, it just won't get records
				console.error(`[migrations] Failed to calculate CRC for course ${String(course.code)}\n`, e);
			}
		}

		console.log(`[migrations] Calculated CRC for ${updated} course(s)`);
	},
} satisfies Migration;
