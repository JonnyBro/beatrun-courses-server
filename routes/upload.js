const express = require("express"),
	router = express.Router();

const { isUser } = require("../utils/functions");

router.get("/", isUser, async (req, res) => {
	res.render("upload", {
		user: req.user,
		locals: req.app.locals,
	});
});

module.exports = router;
