import { FastifyInstance } from "fastify";

const router = (fastify: FastifyInstance, _options: object) => {
	fastify.get("/", (_req, reply) => {
		reply.status(200).send({ code: reply.statusCode, message: "Hello World!" });
	});
};

export default router;
