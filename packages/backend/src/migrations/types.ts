import { mongodb } from "@fastify/mongodb";

export type Migration = {
	id: string;
	description: string;
	up: (db: mongodb.Db) => Promise<void>;
};
