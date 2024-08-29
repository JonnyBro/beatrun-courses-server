const express = require("express"),
	router = express.Router(),
	fs = require("fs"),
	openGraphScraper = require("open-graph-scraper"),
	lzma = require("lzma");

const { isAdmin, isUser, isUserGame, generateCode, isCourseFileValid, log } = require("../utils/functions"),
	{ formidable } = require("formidable");

router.post("/", isUser, async (req, res) => {
	res.send("Hello World!");
});

router.get("/", isUser, async (req, res) => {
	res.send("Hello World!");
});

router.get("/download", isUserGame, async (req, res) => {
	const { headers } = req;
	if (!headers.code) return res.status(401).json({ res: res.statusCode, message: "No code provided. Please provide a valid course code." });
	if (!headers.map) return res.status(401).json({ res: res.statusCode, message: "No map provided. Please provide a valid map." });

	const ip = headers["cf-connecting-ip"] || "Unknown";
	const key = headers.authorization;
	const keys = await req.app.locals.db.getData("/keys");
	const steamIds = Object.fromEntries(Object.entries(keys).map(([k, v]) => [v, k]));
	const steamid = steamIds[key];

	if (ip !== "Unknown" && (await req.app.locals.isRatelimited(ip))) return res.status(401).json({ res: res.statusCode, message: "Too many requests. Please try again later." });
	if (ip !== "Unknown" && (await req.app.locals.isMultiAccount(ip, steamid))) return res.status(401).json({ res: res.statusCode, message: "Your account was detected as multiaccount. Please open a ticket on our Discord server." });

	let courseData;

	try {
		courseData = await req.app.locals.db.getData(`/courses/${headers.code.toUpperCase()}`);
	} catch (e) {
		return res.status(401).json({ res: res.statusCode, message: "Invalid course code provided." });
	}

	if (courseData.map !== headers.map) return res.status(401).json({ res: res.statusCode, message: "Invalid map. Please start a map that require by course you provided." });

	const file = fs.readFileSync(`public/${courseData.path}`, "utf-8");

	await log(
		`[DOWNLOAD] Served a course for user (Course: ${headers.code.toUpperCase()}, SteamID: ${steamid}, Key ${key}).`,
		`[DOWNLOAD] Served a course for user (Course: \`${headers.code.toUpperCase()}\`, SteamID: \`${steamid}\`, Key \`${key}\`).`,
	);

	if (!courseData.plays) courseData.plays = 1;
	else courseData.plays++;

	await req.app.locals.db.push(`/courses/${headers.code.toUpperCase()}`, courseData);

	res.send({ res: res.statusCode, file: file });
});

router.post("/upload", isUserGame, async (req, res) => {
	const { headers } = req;
	if (!headers.course) return res.status(401).json({ res: res.statusCode, message: "No course provided. Please provide a valid course." });
	if (!headers.map) return res.status(401).json({ res: res.statusCode, message: "No map provided. Please provide a valid map." });
	if (headers.mapid === null || headers.mapid === undefined) return res.status(401).json({ res: res.statusCode, message: "No map id provided. Please provide a valid map id." });

	const ip = headers["cf-connecting-ip"] || "Unknown";
	const key = headers.authorization;
	const keys = await req.app.locals.db.getData("/keys");
	const steamIds = Object.fromEntries(Object.entries(keys).map(([k, v]) => [v, k]));
	const steamid = steamIds[key];

	if (ip !== "Unknown" && (await req.app.locals.isRatelimited(ip))) return res.status(401).json({ res: res.statusCode, message: "Too many requests. Please try again later." });
	if (ip !== "Unknown" && (await req.app.locals.isMultiAccount(ip, steamid))) return res.status(401).json({ res: res.statusCode, message: "Your account was detected as multiaccount. Please open a ticket on our Discord server." });

	let course = "";
	try {
		course = lzma.decompress(Buffer.from(headers.course, "base64"));
	} catch (e) {
		course = Buffer.from(headers.course, "base64").toString("utf-8");
	}

	if (!isCourseFileValid(JSON.parse(course))) return res.status(401).json({ res: res.statusCode, message: "Invalid course file. Please provide a valid course." });

	let code = generateCode();
	let file = `public/courses/${code}.txt`;

	do {
		code = generateCode();
		file = `public/courses/${code}.txt`;
	} while (fs.existsSync(file));

	fs.writeFileSync(file, course, "utf-8");

	const mapImage = headers.mapid === "0" || headers.mapid === "no_map_id" ? "" : await openGraphScraper({ url: `https://steamcommunity.com/sharedfiles/filedetails/?id=${headers.mapid}` }).then(data => data.result.ogImage[0].url);

	await req.app.locals.db.push("/courses", {
		[code]: {
			map: headers.map,
			uploader: {
				authkey: key,
				userid: steamIds[key],
			},
			time: Date.now(),
			path: `courses/${code}.txt`,
			mapid: headers.mapid === "0" || headers.mapid === "no_map_id" ? "" : headers.mapid,
			mapimg: mapImage,
			plays: 0,
		},
	}, false);

	await log(
		`[UPLOAD] User uploaded a course from the game (Course: ${code}, SteamID: ${steamIds[key]}, Key ${key}).`,
		`[UPLOAD] User uploaded a course from the game (Course: \`${code}\`, SteamID: \`${steamIds[key]}\`, Key \`${key}\`).`,
	);
	res.send({ res: res.statusCode, code: code });
});

router.post("/upload_site", isUser, async (req, res) => {
	const { headers, user } = req;
	const ip = headers["cf-connecting-ip"] || "Unknown";

	if (ip !== "Unknown" && (await req.app.locals.isRatelimited(ip))) return res.status(401).json({ res: res.statusCode, message: "Too many requests. Please try again later." });
	if (ip !== "Unknown" && (await req.app.locals.isMultiAccount(ip, user.steamid))) return res.status(401).json({ res: res.statusCode, message: "Your account was detected as multiaccount. Please open a ticket on our Discord server." });

	const form = formidable({ maxFileSize: 10 * 1024 * 1024 });

	form.parse(req, async (err, fields, files) => {
		if (err) return res.send("Error while uploading file. Please contact the administrator.");

		const uploaded = fs.readFileSync(files.file.filepath);

		let course = "";
		try {
			course = lzma.decompress(uploaded);
		} catch (e) {
			course = uploaded;
		}

		if (!isCourseFileValid(JSON.parse(course))) return res.status(401).json({ res: res.statusCode, message: "Invalid course file. Please provide a valid course." });

		let code = generateCode();
		let file = `public/courses/${code}.txt`;

		do {
			code = generateCode();
			file = `public/courses/${code}.txt`;
		} while (fs.existsSync(file));

		fs.writeFileSync(file, course);

		const mapid = fields.link.match(/id=(\d+)/)[1];
		const mapImage = await openGraphScraper({ url: `https://steamcommunity.com/sharedfiles/filedetails/?id=${mapid}` }).then(data => data.result.ogImage[0].url);

		await req.app.locals.db.push("/courses", {
			[code]: {
				map: fields.map,
				uploader: {
					authkey: user.authKey,
					userid: user.steamid,
				},
				time: Date.now(),
				path: `courses/${code}.txt`,
				mapid: mapid,
				mapimg: mapImage,
				plays: 0,
			},
		}, false);

		await log(
			`[UPLOAD] User uploaded a course from the site (Course: ${code}, SteamID: ${user.steamid}, Key ${user.authKey}).`,
			`[UPLOAD] User uploaded a course from the site (Course: \`${code}\`, SteamID: \`${user.steamid}\`, Key \`${user.authKey}\`).`,
		);
		res.send({ res: res.statusCode, code: code });
	});
});

router.post("/update", isUserGame, async (req, res) => {
	const { headers } = req;
	if (!headers.course) return res.status(401).json({ res: res.statusCode, message: "No course provided. Please provide a valid course." });
	if (!headers.map) return res.status(401).json({ res: res.statusCode, message: "No map provided. Please provide a valid map." });
	if (!headers.code) return res.status(401).json({ res: res.statusCode, message: "No code provided. Please provide a valid course code." });

	const ip = headers["cf-connecting-ip"] || "Unknown";
	const key = headers.authorization;
	const keys = await req.app.locals.db.getData("/keys");
	const steamIds = Object.fromEntries(Object.entries(keys).map(([k, v]) => [v, k]));
	const steamid = steamIds[key];

	if (ip !== "Unknown" && (await req.app.locals.isRatelimited(ip))) return res.status(401).json({ message: "Too many requests. Please try again later." });
	if (ip !== "Unknown" && (await req.app.locals.isMultiAccount(ip, steamid))) return res.status(401).json({ message: "Your account was detected as multiaccount. Please open a ticket on our Discord server." });

	const courseData = await req.app.locals.db.getData(`/courses/${headers.code.toUpperCase()}`);

	if (courseData.map !== headers.map) return res.status(401).json({ res: res.statusCode, message: "Invalid map. You should provide the same map as before." });
	if (courseData.uploader.userid !== steamIds[key]) return res.status(401).json({ res: res.statusCode, message: "Invalid key. You are not the uploader of this course. Only the uploader can update their course." });

	let course = "";
	try {
		course = lzma.decompress(Buffer.from(headers.course, "base64"));
	} catch (e) {
		course = Buffer.from(headers.course, "base64").toString("utf-8");
	}

	if (!isCourseFileValid(JSON.parse(course))) return res.status(401).json({ res: res.statusCode, message: "Invalid course file. Please provide a valid course." });

	fs.writeFileSync(`public/courses/${headers.code.toUpperCase()}.txt`, course, "utf-8");

	courseData.time = Date.now();

	await req.app.locals.db.push(`/courses/${headers.code.toUpperCase()}`, courseData);

	await log(
		`[UPDATE] User updated a course (Course: ${headers.code.toUpperCase()}, SteamID: ${steamIds[key]}, Key ${key}).`,
		`[UPDATE] User updated a course (Course: \`${headers.code.toUpperCase()}\`, SteamID: \`${steamIds[key]}\`, Key \`${key}\`).`,
	);
	res.send({ res: res.statusCode, code: headers.code.toUpperCase() });
});

router.post("/rate", isUser, async (req, res) => {
	const { action, code, steamid } = req.body;

	if (action === "like") {
		const ratings = await req.app.locals.db.getData("/rating");

		ratings[code][steamid] = true;

		await req.app.locals.db.push("/rating", ratings);

		res.send({ success: true, code: code, likes: Object.values(ratings[code]).filter(x => x === true).length });
	} else if (action === "dislike") {
		const ratings = await req.app.locals.db.getData("/rating");

		ratings[code][steamid] = false;

		await req.app.locals.db.push("/rating", ratings);

		res.send({ success: true, code: code, dislikes: Object.values(ratings[code]).filter(x => x === false).length });
	} else return res.status(401).json({ res: res.statusCode, message: "Invalid action provided." });
});

router.post("/admin", isAdmin, async (req, res) => {
	const { user } = req,
		{ action, target } = req.body.args;

	if (action === "addKey") {
		if (!target) return res.send({ success: false, message: "Target not provided. Please provide a target." });

		const key = await req.app.locals.getKey(target);

		if (!key) return res.send({ success: false, message: "Internal error. Contact the developer." });

		await log(
			`[ADMIN] Added new user (Admin: ${user.steamid}, SteamID: ${target}, Key ${key}).`,
			`[ADMIN] Added new user (Admin: \`${user.steamid}\`, SteamID: \`${target}\`, Key \`${key}\`).`,
		);

		res.send({ success: true, message: `Key added successfully.\n${key}` });
	} else if (action === "removeKey") {
		if (!target) return res.send({ success: false, message: "Target not provided. Please provide a target." });

		const keys = await req.app.locals.db.getData("/keys");

		if (!keys[target]) return res.send({ success: false, message: "Invalid SteamID provided." });

		delete keys[target];

		await req.app.locals.db.push("/keys", keys);

		await log(
			`[ADMIN] Removed a user (Admin: ${user.steamid}, SteamID: ${target}).`,
			`[ADMIN] Removed a user (Admin: \`${user.steamid}\`, SteamID: \`${target}\`).`,
		);

		res.send({ success: true, message: `Key removed successfully.\n${target.toUpperCase()}` });
	} else if (action === "lockUser") {
		if (!target) return res.send({ success: false, message: "Target not provided. Please provide a target." });

		const locked = await req.app.locals.db.getData("/locked");

		if (locked[target]) return res.send({ success: false, message: "User is already locked." });

		locked[target] = true;

		await req.app.locals.db.push("/locked", locked);

		await log(
			`[ADMIN] Locked a user (Admin: ${user.steamid}, SteamID: ${target}).`,
			`[ADMIN] Locked a user (Admin: \`${user.steamid}\`, SteamID: \`${target}\`).`,
		);

		res.send({ success: true, message: `User is now locked.\n${target}` });
	} else if (action === "unlockUser") {
		if (!target) return res.send({ success: false, message: "Target not provided. Please provide a target." });

		const locked = await req.app.locals.db.getData("/locked");

		if (!locked[target]) return res.send({ success: false, message: "User is not locked." });

		delete locked[target];

		await req.app.locals.db.push("/locked", locked);

		await log(
			`[ADMIN] Unlocked a user (Admin: ${user.steamid}, SteamID: ${target}).`,
			`[ADMIN] Unlocked a user (Admin: \`${user.steamid}\`, SteamID: \`${target}\`).`,
		);

		res.send({ success: true, message: `User is now unlocked.\n${target}` });
	} else if (action === "removeCourse") {
		if (!target) return res.send({ success: false, message: "Target not provided. Please provide a target." });

		const courses = await req.app.locals.db.getData("/courses");

		if (!courses[target.toUpperCase()]) return res.send({ success: false, message: "Invalid course code provided." });

		delete courses[target.toUpperCase()];
		fs.unlinkSync(`public/courses/${target.toUpperCase()}.txt`);

		await req.app.locals.db.push("/courses", courses);

		await log(
			`[ADMIN] Remove a course (Admin: ${user.steamid}, Course: ${target.toUpperCase()}).`,
			`[ADMIN] Remove a course (Admin: \`${user.steamid}\`, Course: \`${target.toUpperCase()}\`).`,
		);

		res.send({ success: true, message: `Course removed successfully.\n${target.toUpperCase()}` });
	} else if (action === "showLogs") {
		const file = fs.readFileSync("data/logs.log", "utf-8");

		if (!file) return res.send({ success: false, message: "No logs found." });

		res.send({ success: true, message: file });
	} else if (action === "showRecords") {
		const records = await req.app.locals.db.getData("/records");

		res.send({ success: true, message: JSON.stringify(records) });
	} else if (action === "showLocks") {
		const locked = await req.app.locals.db.getData("/locked");

		const message = Object.keys(locked).length === 0
			? JSON.stringify(locked)
			: Object.keys(locked).map(x => `${x} - ${locked[x]}`).join("\n");

		res.send({ success: true, message: message });
	} else return res.send({ success: false, message: "Invalid action provided." });
});

router.get("/admin", isAdmin, async (req, res) => {
	res.send("Hello get");
});

router.get("/info", async (req, res) => {
	const courses = await req.app.locals.db.getData("/courses");
	const usernames = await req.app.locals.db.getData("/usernames");

	// eslint-disable-next-line no-unused-vars
	for (const [code, data] of Object.entries(courses)) {
		delete data.uploader.authkey;
		data.uploader.name = usernames[data.uploader.userid];
	}

	res.send({ res: res.statusCode, data: courses });
});

router.get("/info/:code", async (req, res) => {
	let course;

	try {
		course = await req.app.locals.db.getData(`/courses/${req.params.code.toUpperCase()}`);
	} catch (e) {
		return res.status(401).json({ res: res.statusCode, message: "Invalid course code provided." });
	}

	const usernames = await req.app.locals.db.getData("/usernames");

	delete course.uploader.authkey;
	course.uploader.name = usernames[course.uploader.userid];

	res.send({ res: res.statusCode, data: course });
});

module.exports = router;
