import { mongodb, ObjectId } from "@fastify/mongodb";
import "@fastify/session";

declare module "@fastify/session" {
	interface FastifySessionObject {
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

export interface SteamUser {
	steamid: string;
	communityvisibilitystate: number;
	profilestate: number;
	personaname: string;
	profileurl: string;
	avatar: string;
	avatarmedium: string;
	avatarfull: string;
	avatarhash: string;
	lastlogoff: number;
	personastate: number;
	primaryclanid: string;
	timecreated: number;
	personastateflags: number;
}

export interface User {
	_id?: ObjectId;
	steamId: string;
	username?: string;
	key: string;
	createdAt: number;
	admin?: boolean;
}

export interface Course {
	code: string;
	uploadedBy: string;
	uploadedAt: number;
	mapName: string;
	mapId: string;
	mapImg: string;
	downloadCount: number;
	data: mongodb.Binary;
}
