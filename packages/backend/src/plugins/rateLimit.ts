import fastifyRateLimit from "@fastify/rate-limit";
import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";

/** Per IP. The website's own files aren't limited, only the API and the Steam login */
export const rateLimitPlugin = fastifyPlugin(async (fastify: FastifyInstance) => {
	await fastify.register(fastifyRateLimit, {
		global: true,
		max: 300,
		timeWindow: "1 minute",
		allowList: req => !req.url.startsWith("/api") && !req.url.startsWith("/auth"),
		errorResponseBuilder: (_req, context) => ({
			statusCode: 429,
			code: 429,
			message: `Too many requests, try again in ${context.after}`,
		}),
	});
});

const perMinute = (max: number) => ({ rateLimit: { max, timeWindow: "1 minute" } });

/** Route `config` for the endpoints that are expensive or can be abused, replaces the global limit there */
export const limits = {
	upload: perMinute(10),
	records: perMinute(30),
	download: perMinute(60),
	key: perMinute(20),
	auth: perMinute(20),
};
