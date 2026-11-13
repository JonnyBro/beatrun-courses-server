import { Course, User } from "@/types.js";
import { FastifyInstance } from "fastify";

export type AdminAction =
	| "user.update"
	| "user.delete"
	| "course.update"
	| "course.replace"
	| "course.delete"
	| "record.delete"
	| "pending.approve"
	| "pending.reject";

export interface AdminLogEntry {
	at: number;
	/** steamId of the admin */
	admin: string;
	action: AdminAction;
	/** steamId or course code */
	target: string;
	details: Record<string, unknown>;
}

/** Owners managing their own courses aren't logged, only admins acting on someone else's */
export const isActingAsAdmin = (user: User, course: Course) =>
	Boolean(user.admin) && course.uploadedBy.steamId !== user.steamId;

export const logAdminAction = async (
	fastify: FastifyInstance,
	admin: User,
	action: AdminAction,
	target: string,
	details: Record<string, unknown> = {},
) => {
	const entry: AdminLogEntry = { at: Date.now(), admin: admin.steamId, action, target, details };

	// The action itself already happened, a failed log write shouldn't turn it into an error for the admin
	await fastify
		.getCollection("adminLog")
		?.insertOne(entry)
		.catch((e: unknown) => console.error("[adminLog] Failed to write", entry, e));
};
