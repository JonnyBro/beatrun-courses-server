import { ObjectId } from "@fastify/mongodb";
import "@fastify/session";

declare module "@fastify/session" {
	interface FastifySessionObject {
		profile?: SteamUser;
		user?: User;
	}
}

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