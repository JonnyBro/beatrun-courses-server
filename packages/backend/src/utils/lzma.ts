import { lzma } from "@napi-rs/lzma";

/** A course JSON this big is far past what the game can load (its own limit is 4096 elements) */
export const MAX_COURSE_SIZE = 8 * 1024 * 1024;

// util.Compress() in GMod writes the .lzma (LZMA alone) format: 5 bytes of properties, then the uncompressed size
const HEADER_SIZE = 13;
const SIZE_OFFSET = 5;

export class CourseTooBigError extends Error {}

/** undefined when the data is not a valid LZMA stream */
export const decompressCourse = async (raw: Buffer) => {
	if (raw.length < HEADER_SIZE) return;

	// lc/lp/pb packed into one byte can't go past 224, and nothing sane uses a dictionary over 1 GB
	if (raw[0] >= 9 * 5 * 5 || raw.readUInt32LE(1) > 1 << 30) return;

	// -1 means "unknown, read until the end marker", so only the stream below can stop a bomb then
	const declared = raw.readBigInt64LE(SIZE_OFFSET);
	if (declared > BigInt(MAX_COURSE_SIZE)) throw new CourseTooBigError();

	const reader = lzma.decompressStream(new Blob([raw]).stream()).getReader();
	const chunks: Buffer[] = [];
	let total = 0;

	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;

			total += value.length;

			if (total > MAX_COURSE_SIZE) {
				await reader.cancel();
				throw new CourseTooBigError();
			}

			chunks.push(value);
		}
	} catch (e) {
		if (e instanceof CourseTooBigError) throw e;

		return;
	}

	return Buffer.concat(chunks).toString("utf-8");
};

/** Same bytes as a course file saved by the game */
export const compressCourse = async (json: string) => {
	const data = Buffer.from(await lzma.compress(json));

	// The encoder leaves the size unknown and ends the stream with a marker instead.
	// util.Decompress() allocates the output from this field, so it has to be the real size
	data.writeBigInt64LE(BigInt(Buffer.byteLength(json)), SIZE_OFFSET);

	return data;
};
