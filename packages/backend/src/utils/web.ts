import { getWorkshopItems } from "@/modules/workshop.js";
import { Course, CourseData, CourseRecord, User } from "@/types.js";
import { FastifyInstance, FastifyRequest, preHandlerHookHandler } from "fastify";
import { brotliDecompressSync } from "zlib";

export interface PublicUser {
	steamId: string;
	username: string | null;
	avatar: string | null;
	admin: boolean;
	createdAt: number | null;
}

export interface PublicCourse {
	code: string;
	name: string;
	mapName: string;
	workshopId: string | null;
	elementsCount: number;
	downloadCount: number;
	runsCount: number;
	uploadedAt: number;
	author: PublicUser;
	preview: string | null;
	mapTitle: string | null;
}

export const getSessionUser = async (fastify: FastifyInstance, req: FastifyRequest) => {
	const steamId = req.session.user?.steamId;
	if (!steamId) return;

	return fastify.getUser(steamId);
};

const sessionGuard =
	(fastify: FastifyInstance, check: (user: User) => boolean = () => true): preHandlerHookHandler =>
	(req, reply, done) => {
		getSessionUser(fastify, req)
			.then(user => {
				if (!user || !check(user)) {
					reply.status(401).send({ code: 401, message: "Unauthorized" });
					return;
				}

				req.webUser = user;
				done();
			})
			.catch((e: Error) => done(e));
	};

export const requireUser = (fastify: FastifyInstance) => sessionGuard(fastify);

export const requireAdmin = (fastify: FastifyInstance) => sessionGuard(fastify, user => Boolean(user.admin));

export const parsePagination = (query: { page?: string | number; limit?: string | number }, defaultLimit = 24) => {
	const page = Math.max(1, Math.floor(Number(query.page) || 1));
	const limit = Math.min(100, Math.max(1, Math.floor(Number(query.limit) || defaultLimit)));

	return { page, limit, skip: (page - 1) * limit };
};

export const escapeRegex = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const toPublicUser = (
	user: Partial<User> | null | undefined,
	fallback?: { steamId: string; username?: string },
) =>
	({
		steamId: user?.steamId ?? fallback?.steamId ?? "",
		username: user?.username ?? fallback?.username ?? null,
		avatar: user?.avatar ?? null,
		admin: Boolean(user?.admin),
		createdAt: user?.createdAt ?? null,
	}) satisfies PublicUser;

export const getUsersMap = async (fastify: FastifyInstance, steamIds: string[]) => {
	const unique = [...new Set(steamIds)];
	const users = (await fastify
		.getUsersCollection()
		?.find({ steamId: { $in: unique } }, { projection: { key: 0 } })
		.toArray()) as User[] | undefined;

	return new Map((users ?? []).map(u => [u.steamId, u]));
};

export const toPublicCourses = async (fastify: FastifyInstance, courses: Course[]): Promise<PublicCourse[]> => {
	const [users, workshop] = await Promise.all([
		getUsersMap(fastify, courses.map(c => c.uploadedBy?.steamId).filter(Boolean)),
		getWorkshopItems(courses.map(c => c.workshopId)),
	]);

	return courses.map(c => {
		const item = c.workshopId ? workshop.get(c.workshopId) : undefined;

		return {
			code: c.code,
			name: c.name,
			mapName: c.mapName,
			workshopId: isWorkshopId(c.workshopId) ? c.workshopId : null,
			elementsCount: c.elementsCount ?? c.objectCount ?? 0,
			downloadCount: c.downloadCount ?? 0,
			runsCount: c.runsCount ?? 0,
			uploadedAt: c.uploadedAt,
			author: toPublicUser(users.get(c.uploadedBy?.steamId), c.uploadedBy),
			preview: item?.preview ?? null,
			mapTitle: item?.title ?? null,
		};
	});
};

export const isWorkshopId = (id: unknown): id is string => typeof id === "string" && /^\d+$/.test(id);

export const decodeCourseData = (course: Course) => {
	if (!course.data) return;

	try {
		const json = Buffer.from(brotliDecompressSync(course.data.buffer)).toString("utf-8");
		return JSON.parse(json) as CourseData;
	} catch {
		return;
	}
};

export const recordPoints = (time: number, bestTime: number) => Math.round((1000 * bestTime) / time);

export interface PlayerStanding {
	steamId: string;
	points: number;
	completed: number;
	worldRecords: number;
	runs: number;
}

export const calculateStandings = async (fastify: FastifyInstance) => {
	const records = (await fastify
		.getCollection("records")
		?.find({}, { projection: { courseCode: 1, steamId: 1, time: 1, runs: 1 } })
		.toArray()) as CourseRecord[] | undefined;

	const best = new Map<string, number>();
	for (const r of records ?? []) {
		const current = best.get(r.courseCode);
		if (current === undefined || r.time < current) best.set(r.courseCode, r.time);
	}

	const standings = new Map<string, PlayerStanding>();
	for (const r of records ?? []) {
		const bestTime = best.get(r.courseCode)!;

		let s = standings.get(r.steamId);
		if (!s) {
			s = { steamId: r.steamId, points: 0, completed: 0, worldRecords: 0, runs: 0 };
			standings.set(r.steamId, s);
		}

		s.points += recordPoints(r.time, bestTime);
		s.completed++;
		s.runs += r.runs ?? 1;
		if (r.time === bestTime) s.worldRecords++;
	}

	return [...standings.values()].sort(
		(a, b) => b.points - a.points || b.worldRecords - a.worldRecords || b.completed - a.completed,
	);
};
