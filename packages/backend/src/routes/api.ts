import { FastifyInstance } from "fastify";

const router = (fastify: FastifyInstance, _options: object) => {
	fastify.get("/api/status", (req, reply) => {
		reply.status(200).send({ code: reply.statusCode, message: "database is up" });
	});

	fastify.get("/api/users/create", (req, reply) => {
		reply.status(200).send({ code: reply.statusCode, message: "database is up" });
	});
};

export default router;
