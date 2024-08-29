require("dotenv").config({
	path: "stack.env",
});

module.exports = {
	/* Set true for production database */
	production: process.env.PROD ? true : false || true,
	/* Your domain without / at the end */
	domain: process.env.DOMAIN || "http://localhost:6547",
	/* Port for the server */
	port: process.env.PORT || 6547,
	/* How often can user send request to API */
	rateLimitTime: process.env.RATELIMIT || 1000 * 5, // 5 seconds
	/* How often can user change IP address */
	ipChangeTime: process.env.IPCHANGETIME || 1000 * 60 * 60 * 3, // 3 hours
	/* Your SteamAPI key */
	steamKey: process.env.STEAMKEY || "",
	/* Secret for a cookie */
	cookieSecret: process.env.COOKIE || "",
	/* Discord webhook url or leave empty */
	webhook_url: process.env.WEBHOOK || "",
};
