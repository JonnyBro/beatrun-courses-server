import config from "@/config.js";
import fastifyCookie from "@fastify/cookie";
import fastifySession from "@fastify/session";
import { FastifyInstance, Session } from "fastify";
import fastifyPlugin from "fastify-plugin";

const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const RENEW_AFTER = 24 * 60 * 60 * 1000;

type StoredSession = { _id: string; data: string; expiresAt: Date };

/** Sessions outlive restarts, a TTL index on expiresAt removes the old ones */
const createStore = (fastify: FastifyInstance) => {
	const collection = () => fastify.getCollection("sessions")!;

	return {
		get: (sid: string, callback: (err: unknown, session?: Session | null) => void) => {
			collection()
				.findOne<StoredSession>({ _id: sid as never })
				.then(doc => {
					const alive = doc && doc.expiresAt > new Date();

					callback(null, alive ? (JSON.parse(doc.data) as Session) : null);
				})
				.catch((e: unknown) => callback(e));
		},
		set: (sid: string, session: Session, callback: (err?: unknown) => void) => {
			const expiresAt = new Date(session.cookie.expires ?? Date.now() + MAX_AGE);

			collection()
				.replaceOne({ _id: sid as never }, { data: JSON.stringify(session), expiresAt } as never, {
					upsert: true,
				})
				.then(() => callback())
				.catch((e: unknown) => callback(e));
		},
		destroy: (sid: string, callback: (err?: unknown) => void) => {
			collection()
				.deleteOne({ _id: sid as never })
				.then(() => callback())
				.catch((e: unknown) => callback(e));
		},
	};
};

export const sessionPlugin = fastifyPlugin(async (fastify: FastifyInstance) => {
	await fastify.register(fastifyCookie);
	await fastify.register(fastifySession, {
		secret: config.secret,
		store: createStore(fastify),
		// Rolling would write the session to the database on every request, it's renewed once a day below instead
		rolling: false,
		saveUninitialized: false,
		cookie: {
			secure: config.production,
			httpOnly: true,
			sameSite: "lax",
			maxAge: MAX_AGE,
		},
	});

	// touch() alone doesn't count as a change, so the session wouldn't be saved with the new expiry without renewedAt
	fastify.addHook("preHandler", (req, _reply, done) => {
		const session = req.session;

		if (session.user && Date.now() - (session.renewedAt ?? 0) >= RENEW_AFTER) {
			session.renewedAt = Date.now();
			session.touch();
		}

		done();
	});
});
