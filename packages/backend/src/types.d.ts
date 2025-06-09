import { mongodb, ObjectId } from "@fastify/mongodb";
import "@fastify/session";

declare module "@fastify/session" {
	interface FastifySessionObject {
		profile?: SteamUser | string;
		user?: User;
	}
}

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