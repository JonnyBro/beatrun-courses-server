import config, { frontendPath } from "@/config.js";
import fastifyHelmet from "@fastify/helmet";
import { createHash } from "crypto";
import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

/** CSP hashes of the inline scripts in the built index.html (the theme is applied before the app loads) */
const inlineScriptHashes = () => {
	const index = resolve(frontendPath, "index.html");
	if (!existsSync(index)) return [];

	return [...readFileSync(index, "utf-8").matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
		([, body]) => `'sha256-${createHash("sha256").update(body).digest("base64")}'`,
	);
};

export const securityPlugin = fastifyPlugin(async (fastify: FastifyInstance) => {
	const https = config.domain.startsWith("https://");

	await fastify.register(fastifyHelmet, {
		contentSecurityPolicy: {
			useDefaults: false,
			directives: {
				defaultSrc: ["'self'"],
				scriptSrc: ["'self'", ...inlineScriptHashes()],
				// reka-ui and vue-sonner position things with inline styles
				styleSrc: ["'self'", "'unsafe-inline'"],
				// Steam avatars and Workshop previews come from several Steam CDNs
				imgSrc: ["'self'", "data:", "https:"],
				fontSrc: ["'self'", "data:"],
				connectSrc: ["'self'"],
				objectSrc: ["'none'"],
				baseUri: ["'self'"],
				formAction: ["'self'"],
				frameAncestors: ["'none'"],
				upgradeInsecureRequests: https ? [] : null,
			},
		},
		// Steam images are cross-origin and don't send CORP headers
		crossOriginEmbedderPolicy: false,
		strictTransportSecurity: https ? { maxAge: 180 * 24 * 60 * 60 } : false,
		referrerPolicy: { policy: "strict-origin-when-cross-origin" },
	});
});
