import { mongodb, ObjectId } from "@fastify/mongodb";
import "@fastify/session";

declare module "@fastify/session" {
	interface FastifySessionObject {
		profile?: SteamUser | string;
		user?: User;
	}
}

/*
	Course file structure:
	[0] = Props
	[1] = Checkpoints
	[2] = Starting position
	[3] = Starting angle
	[4] = Course name
	[5] = Entities
	[6] = Restricted player's speed (0 = unrestricted) | OPTIONAL
*/
export type CourseData = [object, object, string, number, string, object, number?];

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