import { FastifyInstance } from "fastify";

const router = (fastify: FastifyInstance, _options: object) => {
	fastify.get("/", (_req, reply) => {
		reply.status(200).send({ code: reply.statusCode, message: "index is up" });
	});
};

export default router;
