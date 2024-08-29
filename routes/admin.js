const express = require("express"),
	router = express.Router();

const { isAdmin } = require("../utils/functions");

router.get("/", isAdmin, async (req, res) => {
	res.render("admin", {
		user: req.user,
		locals: req.app.locals,
	});
});

module.exports = router;
