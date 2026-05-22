import { FastifyInstance } from "fastify";

const router = (fastify: FastifyInstance, _options: object) => {
	fastify.get("/", (_req, reply) => {
		reply.status(200).send({
			code: reply.statusCode,
			message: "Hello World! You can access the database from the game (press F4)",
		});
	});
};

export default router;
