import { type SteamUser } from "@/modules/steam";
import { mongodb } from "@fastify/mongodb";
import "@fastify/session";

declare module "@fastify/session" {
	interface FastifySessionObject {
		// eslint-disable-next-line
		profile?: SteamUser | string;
		user?: User;
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
export type CourseData = [Array<object>, Array<object>, string, number, string, Array<object>, number?];

export interface User extends mongodb.WithId<mongodb.BSON.Document> {
	steamId: string;
	createdAt: number;
	username?: string;
	key?: string;
	admin?: boolean;
}

export interface Course extends mongodb.WithId<mongodb.BSON.Document> {
	code: string;
	data?: mongodb.Binary;
	downloadCount: number;
	mapName: string;
	name: string;
	objectCount: number;
	uploadedAt: number;
	uploadedBy: {
		steamId: string;
		username: string;
	};
	workshopId: string;
}
