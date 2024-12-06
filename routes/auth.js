const express = require("express"),
	router = express.Router(),
	passport = require("passport");

router.get("/", passport.authenticate("steam"), () => {});

router.get(
	"/return",
	function (req, res, next) {
		req.url = req.originalUrl;
		next();
	},
	passport.authenticate("steam", { failureRedirect: "/" }),
	(req, res) => res.redirect("/key"),
);

router.get("/logout", (req, res, next) => {
	req.logout(function (err) {
		if (err) return next(err);

		res.redirect("/key");
	});
});

module.exports = router;
