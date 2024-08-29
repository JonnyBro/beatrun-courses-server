const express = require("express"),
	router = express.Router(),
	fetch = require("node-fetch");

const { sanitize } = require("../utils/functions");

router.get("/", async (req, res) => {
	if (req.user) req.user.authKey = await registerUser(req.app.locals, req.user);

	res.render("key", {
		user: req.user,
		locals: req.app.locals,
	});
});

/**
 * Checks if the user owns a specific game on Steam.
 *
 * @param {object} locals The app locals object
 * @param {object} user - The user object
 * @returns {Promise<boolean>} Promise resolving to true if user owns the game, false otherwise
 */
async function hasGame(locals, user) {
	const response = (await fetch(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${locals.config.steamKey}&steamid=${user.steamid}&format=json`).then(r => r.json())).response;

	if (response.games && response.games.find(g => g.appid === 4000)) return true;
	return false;
}

/**
 * Registers a user by checking account age and ownership of Garry's Mod,
 * generating an auth key, recording their username, and returning the auth key.
 *
 * @param {object} locals The app locals object
 * @param {object} user The user object
 * @returns {Promise<string>} A promise that resolves to the auth key string.
 */
async function registerUser(locals, user) {
	if (Math.floor((new Date() - new Date(user.timecreated * 1000)) / (1000 * 60 * 60 * 24 * 30)) < 3) return "Account too young. Needs to be at least 3 months old.";
	if (!hasGame(locals, user)) return "Account doesn't have Garry's mod. Make sure your game details are public.";

	const usernames = await locals.db.getData("/usernames");
	const key = await locals.getKey(user);
	const username = sanitize(user.personaname, false, true);

	usernames[user.steamid] = username || "Unknown";
	await locals.db.push("/usernames", usernames);

	return key;
}

module.exports = router;
