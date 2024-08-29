const express = require("express"),
	router = express.Router(),
	fs = require("fs"),
	courseCardComponent = fs.readFileSync("components/course_card.html", "utf-8");

const { sanitize, isCourseFileValid } = require("../utils/functions");

router.get("/", async (req, res) => {
	const courses = await req.app.locals.db.getData("/courses");
	const codes = Object.keys(courses);

	let sortType = "none";
	if (req.query.sort) sortType = req.query.sort.toString();

	let page = 1;
	if (req.query.page) page = req.query.page.toString();

	let search = "";
	if (req.query.search) search = req.query.search.toString();

	/* Pages Count */
	const coursesCount = Object.keys(courses).length;
	const pagesCount = Math.max(Math.ceil(coursesCount / 20), 0);

	if (page === "Page") page = 1;
	if (page * 20 - coursesCount >= 20) page = 1;

	let pagesDropdown = "";

	for (let i = 1; i <= pagesCount; i++) {
		if (page === i.toString()) pagesDropdown += `<option selected value="${i}">${i}</option>`;
		else pagesDropdown += `<option value="${i}">${i}</option>`;
	}

	/* Sort Dropdown */
	const sortOptions = {
		time: "Date",
		name: "Course Name",
		map: "Map Name",
		elements: "Element count",
		scoresmart: "Rating (Smart)",
		scoredumb: "Rating (Dumb)",
		plays: "Plays",
	};
	let sortDropdown = "";

	for (const [key, value] of Object.entries(sortOptions)) {
		if (sortType === key) sortDropdown += `<option selected value="${key}">${value}</option>`;
		else sortDropdown += `<option value="${key}">${value}</option>`;
	}

	/* Courses Cards */
	const usernames = await req.app.locals.db.getData("/usernames");
	const ratings = await req.app.locals.db.getData("/rating");
	const codesData = [];
	const cards = [];

	codes.forEach(async code => {
		const codeData = courses[code];

		let codeFile = "";
		try {
			codeFile = fs.readFileSync(`public/${codeData.path}`, "utf-8");
		} catch (e) {
			return console.log(`[WARINGN] Not found file for: ${code}`);
		}

		const parsedCodeFile = JSON.parse(codeFile);

		if (!isCourseFileValid(parsedCodeFile)) console.log(`[WARNING] Course is not valid: ${code}`);

		let codeMapImage = "img/unknown.jpg";

		const codeMap = codeData.map;
		if (codeMap === "gm_flatgrass" || codeMap === "gm_construct") if (fs.existsSync(`public/img/${codeMap}.jpg`)) codeMapImage = `img/${codeMap}.jpg`;

		if (codeData.mapimg) codeMapImage = codeData.mapimg;

		const codeMapId = codeData.mapid !== "0" && codeData.mapid !== "" ? codeData.mapid : "2818480138"; // le troll
		const codeUserId = codeData.uploader.userid;
		const codeUsername = usernames[codeUserId] ? usernames[codeUserId] : codeUserId;

		if (!ratings[code]) {
			ratings[code] = {};
		}

		const rating = getCourseRating(ratings[code]);

		codesData.push({
			name: parsedCodeFile[4],
			code: code,
			map: codeData.map,
			username: codeUsername,
			userid: codeUserId,
			elements: parsedCodeFile[5].length + parsedCodeFile[0].length,
			download: codeData.path,
			likes: rating.likes,
			dislikes: rating.dislikes,
			rates: rating.ratings,
			scoresmart: rating.rateSmart,
			scoredumb: rating.rateDumb,
			mapimg: codeMapImage,
			mapwid: codeMapId,
			time: codeData.time,
			plays: codeData.plays || 0,
		});
	});

	let sortedCodesData = [];

	const sortKeys = {
		time: "DESC",
		name: "STRING",
		map: "STRING",
		elements: "DESC",
		scoresmart: "DESC",
		scoredumb: "DESC",
		plays: "DESC",
	};

	if (sortType === "none" || sortType === "Sort")
		sortedCodesData = codesData.sort((a, b) => {
			return b.time - a.time;
		});
	else {
		const sortKey = sortKeys[sortType];

		if (sortKey === "STRING")
			sortedCodesData = codesData.sort((a, b) => {
				return a[sortType].localeCompare(b[sortType]);
			});
		else if (sortKey === "ASC")
			sortedCodesData = codesData.sort((a, b) => {
				return a[sortType] - b[sortType];
			});
		else if (sortKey === "DESC")
			sortedCodesData = codesData.sort((a, b) => {
				return b[sortType] - a[sortType];
			});
	}

	if (search)
		sortedCodesData = codesData.filter(c => {
			const query = sanitize(search, true, false);

			let searchString = "";
			searchString += c.name;
			searchString += c.code;
			searchString += c.userid;
			searchString += c.username;
			searchString += c.map;
			searchString += c.mapwid;

			return searchString.toLowerCase().includes(query);
		});

	sortedCodesData.forEach(data => cards.push(generateCourseCard(data)));

	const sortedCards = cards.slice(Math.max((page - 1) * 20 - 1, 0), Math.max((page - 1) * 20 - 1, 0) + 20).join("\n");

	res.render("index", {
		user: req.user,
		locals: req.app.locals,
		pagesDropdown: pagesDropdown,
		sortDropdown: sortDropdown,
		coursesList: sortedCards,
		searchText: search,
		sanitize,
	});

	await req.app.locals.db.push("/rating", ratings);
});

/**
 * Calculates rating statistics for a course based on rating data.
 *
 * @param {Object} data - Object containing rating data where keys are user IDs
 *                        and values are true for like or false for dislike
 * @returns {Object} Object containing calculated rating stats:
 *                  - likes: Number of likes
 *                  - dislikes: Number of dislikes
 *                  - ratings: Total number of ratings
 *                  - rateSmart: Likes minus dislikes
 *                  - rateDumb: Likes divided by total ratings
 */
function getCourseRating(data) {
	const ratings = Object.keys(data).length;

	if (ratings <= 0) return { likes: 0, dislikes: 0, ratings: 0, rateSmart: 0, rateDumb: 0 };

	let likes = 0,
		dislikes = 0,
		rateSmart = 0,
		rateDumb = 0;

	for (const r in data) if (data[r]) likes += 1;

	dislikes = ratings - likes;
	rateSmart = ratings + likes - dislikes;
	rateDumb = likes / ratings;

	return { likes: likes, dislikes: dislikes, ratings: ratings, rateSmart: rateSmart, rateDumb: rateDumb };
}

/**
 * Generates an HTML string for a course card component.
 *
 * @param {Object} course The course data object
 * @returns {String} The generated HTML string for the course card
 */
function generateCourseCard(course) {
	const templates = {
		"{courseName}": course.name,
		"{courseCode}": course.code,
		"{uploaderID}": course.userid,
		"{uploaderName}": course.username,
		"{courseMap}": course.map,
		"{downloadLink}": course.download,
		"{likesCount}": course.likes,
		"{dislikesCount}": course.dislikes,
		"{ratesmart}": course.scoresmart,
		"{ratedumb}": course.scoredumb,
		"{mapImage}": course.mapimg,
		"{mapID}": course.mapwid,
		"{elementsCount}": course.elements === 1 ? "1 element" : `${course.elements} elements`,
		"{uploadDate}": new Date(course.time).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" }),
		"{plays}": course.plays === 1 ? "1 play" : `${course.plays || 0} plays`,
	};

	let output = courseCardComponent;

	for (const t in templates) output = output.replace(new RegExp(t, "g"), templates[t]);

	return output;
}

module.exports = router;
