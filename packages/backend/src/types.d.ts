import { mongodb } from "@fastify/mongodb";
import "@fastify/session";

declare module "@fastify/session" {
	interface FastifySessionObject {
		user?: User;
	}
}

declare module "fastify" {
	interface FastifyRequest {
		webUser?: User;
	}
}

/**
Course file structure (from 0 to 6):
	Props,
	Checkpoints,
	Starting position,
	Starting angle,
	Course name,
	Entities,
	Restrict player's speed (0 is default, 325) | undefined,
*/
export type CourseData = [Array<object>, Array<object>, string, number, string, Array<object>, number?, Array<object>?];

export interface User extends mongodb.WithId<mongodb.BSON.Document> {
	steamId: string;
	createdAt: number;
	username?: string;
	avatar?: string;
	key?: string;
	admin?: boolean;
	ban?: UserBan;
}

export interface UserBan {
	reason: string;
	at: number;
	by: string;
}

export interface Course extends mongodb.WithId<mongodb.BSON.Document> {
	code: string;
	data?: mongodb.Binary;
	downloadCount: number;
	runsCount?: number;
	mapName: string;
	name: string;
	elementsCount: number;
	uploadedAt: number;
	updatedAt?: number;
	uploadedBy: {
		steamId: string;
		username: string;
	};
	workshopId: string | null;
	/** CRC32 of the course JSON as a decimal string, same as util.CRC() in GMod */
	crc?: string;
}

/** Best time of a player on a course. One document per (courseCode, steamId) pair. */
export interface CourseRecord extends mongodb.WithId<mongodb.BSON.Document> {
	courseCode: string;
	steamId: string;
	/** Best time in seconds */
	time: number;
	/** How many times the player has finished the course */
	runs: number;
	createdAt: number;
	updatedAt: number;
}
