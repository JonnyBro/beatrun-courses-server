const express = require("express"),
	path = require("path"),
	session = require("express-session"),
	logger = require("morgan"),
	fs = require("fs"),
	passport = require("passport"),
	SteamStrategy = require("passport-steam").Strategy;

const { JsonDB, Config } = require("node-json-db"),
	{ generateRandomString, log } = require("./utils/functions");

const config = require("./config");
const db = new JsonDB(new Config(`data/${config.production ? "main" : "test"}_db`, true, true, "/"));

if (!config.cookieSecret || !config.steamKey) return console.log("Please check that you have filled steamKey and cookieSecret in config file");
if (!fs.existsSync("public/courses/")) fs.mkdirSync("public/courses/");

// Express App
const indexRouter = require("./routes/index"),
	keyRouter = require("./routes/key"),
	uploadRouter = require("./routes/upload"),
	adminRouter = require("./routes/admin"),
	apiRouter = require("./routes/api"),
	statsRouter = require("./routes/stats");

const app = express();

/**
 * Callback to serialize user into session.
 * It is called at end of request in authenticate method after successful authentication.
 * This method will store necessary data from the authenticated user object (`user`).
 * @param {Object} user - The authenticated user.
 * @param {Function} done - Callback to signal success or failure for saving session data.
 */
passport.serializeUser((user, done) => {
	done(null, user._json);
});

/**
 * Callback to deserialize user from session.
 * It is called at the start of each request in authenticate method after receiving client's request.
 * This method will reconstruct a User object (`user`) based on data stored during `serializeUser` call.
 * @param  {Object} obj - The serialized user data from session.
 * @param  {Function} done - Callback to signal success or failure for loading user.
 */
passport.deserializeUser((obj, done) => {
	done(null, obj);
});

passport.use(
	new SteamStrategy(
		{
			realm: config.domain,
			returnURL: `${config.domain}/auth/return`,
			apiKey: config.steamKey,
		},
		(_, profile, done) => {
			return done(null, profile);
		},
	),
);

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
	session({
		secret: config.cookieSecret,
		name: "U_SESSION",
		resave: true,
		saveUninitialized: true,
		cookie: {
			maxAge: 3600000,
		},
	}),
);
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/key", keyRouter);
app.use("/upload", uploadRouter);
app.use("/admin", adminRouter);
app.use("/api", apiRouter);
app.use("/stats", statsRouter);
app.get("/auth", passport.authenticate("steam"), () => {});
app.get("/auth/return", passport.authenticate("steam", { failureRedirect: "/" }), (req, res) => res.redirect("/key"));
app.get("/auth/logout", (req, res, next) => {
	req.logout(function (err) {
		if (err) return next(err);

		res.redirect("/key");
	});
});

/* catch 404 and forward to error handler
app.use(function (req, res, next) {
	next(createError(404));
});

// Error Handler
app.use(function (err, req, res) {
	res.status(err.status || 500);
	res.render("error");
});
*/

// Locals
db.getData("/admins").then(data => {
	app.locals.admins = data;
});

app.locals = {
	config: config,
	db: db,
	getKey: getKey,
	isRatelimited: isRatelimited,
	isMultiAccount: isMultiAccount,
};

/**
 * Gets a user's key from the database.
 *
 * Checks if the user already has a key, and returns it if so.
 * Otherwise generates a new one.
 *
 * @param {Object | string} user The user object or SteamID64.
 * @returns {Promise<String>} The user's key.
 */
async function getKey(user) {
	user = typeof user === "string" ? user : user.steamid;

	const keys = await db.getData("/keys");
	const key = keys[user];

	if (key) {
		await log(
			`[KEY] User logged in (SteamID: ${user}, Key ${key}).`,
			`[KEY] User logged in (SteamID: \`${user}\`, Key \`${key}\`).`,
		);
		return key;
	} else return await _createKey(user);
}

/**
 * Creates a new unique key for the given user and saves it to the database.
 *
 * @param {Object | string} user The OpenID Steam user object or SteamID64.
 * @returns {Promise<String>} The new unique key generated for the user.
 */
async function _createKey(user) {
	user = typeof user === "string" ? user : user.steamid;

	const keys = await db.getData("/keys");
	const key = generateRandomString();
	const isFound = keys[key];

	if (!isFound) {
		keys[user] = key;

		const now = Date.now();

		await log(
			`[KEY] New user (SteamID: ${user}, Key: ${key}, TimeCreated: ${new Date(now).toLocaleString("ru-RU")}).`,
			`[KEY] New user (SteamID: \`${user}\`, Key: \`${key}\`, TimeCreated: <t:${Math.floor(now / 1000)}:f>).`,
		);
		await db.push("/keys", keys);

		return key;
	} else return await _createKey(user);
}

/**
 * Checks if an IP address is currently rate limited.
 *
 * Gets the current rate limits from the database.
 * If the IP already has a recent rate limit, returns true.
 * Otherwise, saves a new rate limit for the IP and returns false.
 *
 * @param {string} ip The IP address to check
 * @returns {Promise<boolean>} Whether the IP is currently rate limited
 */
async function isRatelimited(ip) {
	const rateLimits = await db.getData("/ratelimits");

	if (rateLimits[ip] && Date.now() - rateLimits[ip] <= config.rateLimitTime) return true;

	rateLimits[ip] = Date.now();

	await db.push("/ratelimits", rateLimits);

	return false;
}

/**
 * Checks if a user is using multiple accounts based on their IP address and Steam ID.
 *
 * Retrieves the locked accounts and user records from the database. If the user's account is locked, returns true.
 * Otherwise, checks if the user has changed their IP address more than the configured `ipChangeTime`. If so, clears the
 * user's IP address history and locks the account if the user has changed their IP more than 3 times. Updates the
 * database with the new account status and returns the result.
 *
 * @param {string} ip The IP address of the user.
 * @param {string} steamid The Steam ID of the user.
 * @returns {Promise<boolean>} Whether the user is using multiple accounts.
 */
async function isMultiAccount(ip, steamid) {
	const locked = await db.getData("/locked");
	const records = await db.getData("/records");

	if (locked[steamid]) return true;

	if (!records[steamid])
		records[steamid] = {
			ips: {
				[ip]: true,
			},
			lastchanged: Date.now(),
		};

	// Clear IPs if the user has changed their ip more than ipChangeTime
	if (Date.now() - records[steamid]["lastchanged"] > config.ipChangeTime) {
		records[steamid]["ips"] = [];
		records[steamid]["lastchanged"] = Date.now();
	}

	// Lock account if the user changed their IP more than 3 time in ipChangeTime
	if (Object.keys(records[steamid]["ips"]).length > 2) {
		locked[steamid] = true;

		await db.push("/locked", locked);
		return true;
	}

	await db.push("/records", records);

	return false;
}

// HTTP server
const http = require("http");

const port = config.port || 6547;
app.set("port", port);

const server = http.createServer(app);

server.listen(port);

server.on("error", error => {
	if (error.syscall !== "listen") throw error;

	// handle specific listen errors with friendly messages
	switch (error.code) {
		case "EACCES":
			console.error(`Port ${port} requires elevated privileges`);
			process.exit(1);
			break;
		case "EADDRINUSE":
			console.error(`Port ${port} is already in use`);
			process.exit(1);
			break;
		default:
			throw error;
	}
});

server.on("listening", () => {
	const addr = server.address();
	const bind = typeof addr === "string" ? "pipe: " + addr : "port: " + addr.port;

	console.log("Now listening on " + bind);
});
