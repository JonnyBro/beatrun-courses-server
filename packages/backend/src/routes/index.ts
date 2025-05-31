import { FastifyInstance } from "fastify";

const router = (fastify: FastifyInstance, _options: object) => {
	fastify.get("/", async (req, _reply) => ({
		...req.headers,
	}));
};

export default router;
