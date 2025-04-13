const fs = require("fs"),
	config = require("../config"),
	fetch = require("node-fetch");

/**
 * Creates a new unique key for the given user and saves it to the database.
 *
 * @param {Object} db The database
 * @param {Object | string} user The OpenID Steam user object or SteamID64.
 * @returns {Promise<String>} The new unique key generated for the user.
 */
async function createKey(db, user) {
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
	} else return await createKey(db, user);
}

/**
 * Middleware function that checks if the current user is an admin.
 * If the user is not an admin, it redirects them to the "/key" route.
 * If the user is an admin, it calls the next middleware function.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 * @param {Function} next - The next middleware function to be called.
 */
async function isAdmin(req, res, next) {
	if (!req.user) return res.redirect("/key");

	const admins = req.app.locals.admins;
	const steamid = req.user.steamid;

	if (!admins[steamid]) return res.status(401).json({ res: res.statusCode, message: "Unauthorized." });

	return next();
}

/**
 * Middleware function that checks if the current user has a valid authentication key.
 * If the user does not have a valid key, it redirects them to the "/key" route.
 * If the user has a valid key, it calls the next middleware function.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 * @param {Function} next - The next middleware function to be called.
 */
async function isUser(req, res, next) {
	if (!req.user) return res.redirect("/key");

	const keys = await req.app.locals.db.getData("/keys");
	const steamIds = Object.fromEntries(Object.entries(keys).map(([k, v]) => [v, k]));
	const key = req.user.authKey;

	if (!steamIds[key]) return res.status(401).json({ res: res.statusCode, message: "Unauthorized." });

	return next();
}

/**
 * Middleware function that checks if the current user has a valid authentication key.
 * If the user does not have a valid key, it returns a 401 Unauthorized response with a message.
 * If the user has a valid key, it calls the next middleware function.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 * @param {Function} next - The next middleware function to be called.
 */
async function isUserGame(req, res, next) {
	// if (req.get("user-agent") !== "Valve/Steam HTTP Client 1.0 GMod/13") return res.status(401).json({ res: res.statusCode, message: "Not in-game" });

	const keys = await req.app.locals.db.getData("/keys");
	const steamIds = Object.fromEntries(Object.entries(keys).map(([k, v]) => [v, k]));
	const key = req.headers.authorization;

	if (!key) return res.status(401).json({ res: res.statusCode, message: "Unauthorized. Please provide a key." });
	if (!steamIds[key]) return res.status(401).json({ res: res.statusCode, message: `Unauthorized. Get yourself a key on ${req.app.locals.config.domain}/key` });

	return next();
}

/**
 * Checks if an IP address is currently rate limited.
 *
 * Gets the current rate limits from the database.
 * If the IP already has a recent rate limit, returns true.
 * Otherwise, saves a new rate limit for the IP and returns false.
 *
 * @param {Object} db The database
 * @param {string} ip The IP address to check
 * @returns {Promise<boolean>} Whether the IP is currently rate limited
 */
async function isRatelimited(db, ip) {
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
 * @param {Object} db The database
 * @param {string} ip The IP address of the user.
 * @param {string} steamid The Steam ID of the user.
 * @returns {Promise<boolean>} Whether the user is using multiple accounts.
 */
async function isMultiAccount(db, ip, steamid) {
	const locked = await db.getData("/locked");
	const records = await db.getData("/records");

	if (!records[steamid])
		records[steamid] = {
			ips: {
				[ip]: true,
			},
			lastchanged: Date.now(),
		};

	// Clear IPs if the user has changed their ip more than ipChangeTime
	if (Date.now() - records[steamid]["lastchanged"] > config.ipChangeTime) {
		records[steamid] = {
			ips: {},
			lastchanged: Date.now(),
		};
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

/**
 * Checks if user is locked from using the app.
 *
 * @param {Object} db The database
 * @param {string} steamid The Steam ID of the user.
 * @returns {Promise<boolean>} Whether the user is locked.
 */
async function isLocked(db, steamid) {
	const locks = await db.getData("/locked");

	if (locks[steamid]) return true;

	return false;
}

/**
 * Gets a user's key from the database.
 *
 * Checks if the user already has a key, and returns it if so.
 * Otherwise generates a new one.
 *
 * @param {Object} db The database
 * @param {Object | string} user The user object or SteamID64.
 * @returns {Promise<String>} The user's key.
 */
async function getKey(db, user) {
	user = typeof user === "string" ? user : user.steamid;

	const keys = await db.getData("/keys");
	const key = keys[user];

	if (key) {
		await log(
			`[KEY] User logged in (SteamID: ${user}, Key ${key}).`,
			`[KEY] User logged in (SteamID: \`${user}\`, Key \`${key}\`).`,
		);
		return key;
	} else return await createKey(db, user);
}

/**
 * Generates a random string of the given length.
 *
 * @param {number} [length=32] - The length of the random string to generate.
 * @returns {string} The generated random string.
 */
function generateRandomString(length = 32) {
	const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	const charactersLength = characters.length;
	let counter = 0;
	let result = "";

	while (counter < length) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
		counter += 1;
	}

	return result;
}

/**
 * Generates a unique random code string composed of 3 parts each consisting of 4 alphanumeric characters. The parts are separated by hyphens ("-").
 *
 * @returns {string} A unique random code string in the format "AAAA-BBBB-CCCC". Each part is exactly four alphanumeric characters long.
 */
function generateCode() {
	let code = "";

	for (let i = 0; i < 3; i++) {
		code += generateRandomString(4);

		if (i === 0 || i === 1) code += "-";
	}

	return code.toUpperCase();
}

/**
 * Sanitizes a string by removing unwanted characters and replacing spaces with hyphens.
 *
 * @param {string} [string=""] - The string to sanitize.
 * @param {boolean} [forceLowercase=true] - Whether to force the string to lowercase.
 * @param {boolean} [strict=false] - Whether to remove all non-alphanumeric characters.
 * @returns {string} The sanitized string.
 */
function sanitize(string = "", forceLowercase = true, strict = false) {
	string = string.toString();

	const strip = ["~", "`", "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "=", "+", "[", "{", "]", "}", "\\", "|", ";", ":", "\"", "'", "&#8216;", "&#8217;", "&#8220;", "&#8221;", "&#8211;", "&#8212;", "â€”", "â€“", ",", "<", ".", ">", "/", "?"];

	let clean = string.trim().replace(strip, "").replace(/\s+/g, "-");
	clean = strict ? string.replace(/[^\u0400-\u04FF\w\d\s-]/g, "") : clean;

	return forceLowercase ? clean.toLowerCase() : clean;
}

/**
 * Validates that a course file content array is valid.
 *
 * @param {any[]} content - The course file content array to validate
 * @returns {Boolean} True if the content is a valid course file array
 */
function isCourseFileValid(content) {
	if (content.length !== 6 && content.length !== 7) return false;
	if (
		typeof content[0] !== "object" &&
		typeof content[1] !== "object" &&
		typeof content[2] !== "string" &&
		typeof content[3] !== "number" &&
		typeof content[4] !== "string" &&
		typeof content[5] !== "object" &&
		(content[6] && typeof content[6] !== "number")
	)
		return false;

	return true;
}

/**
 * Logs a message to a log file and optionally sends it to a Discord webhook.
 *
 * @param {string} logs_message - The message to be logged.
 * @param {string} discord_message - The message to be sent to the Discord webhook (optional).
 * @returns {Promise<boolean>} - A promise that resolves to `true` if the logging was successful, or `false` otherwise.
 */
async function log(logs_message, discord_message) {
	fs.writeFile("data/logs.log", `[${new Date(Date.now()).toLocaleString("ru-RU")}] - ${logs_message}\n`, { flag: "a" }, async err => {
		if (err) throw err;

		if (discord_message && config.webhook_url)
			await fetch(config.webhook_url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					username: "Courses Logger",
					content: discord_message ?? logs_message,
				}),
			});

		return true;
	});
}

module.exports = { isAdmin, isUser, isUserGame, isRatelimited, isMultiAccount, isLocked, getKey, generateRandomString, generateCode, sanitize, isCourseFileValid, log };
