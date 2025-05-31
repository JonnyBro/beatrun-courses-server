import { FastifyInstance } from "fastify";

const indexRouter = async (fastify: FastifyInstance, options: Object) => {
	fastify.get("/", async (request, reply) => {
		return { message: "hello world!" };
	});
};

export default indexRouter;
