const express = require("express"),
	router = express.Router(),
	fs = require("fs");

router.get("/:code", async (req, res) => {
	let course;

	try {
		course = await req.app.locals.db.getData(`/courses/${req.params.code.toUpperCase()}`);
	} catch (e) {
		return res.status(401).json({ res: res.statusCode, message: "Invalid course code provided." });
	}

	const usernames = await req.app.locals.db.getData("/usernames");
	const courseFile = JSON.parse(fs.readFileSync(`./public/courses/${req.params.code}.txt`));

	delete course.uploader.authkey;

	course.uploader.name = usernames[course.uploader.userid];
	course.name = courseFile[4];
	course.objectCount = courseFile[0].length + courseFile[5].length;
	course.checkpointsCount = courseFile[1].length;
	course.date = new Date(course.time).toLocaleString();

	res.render("stats", {
		user: req.user,
		locals: req.app.locals,
		code: req.params.code,
		course,
	});
});

module.exports = router;
