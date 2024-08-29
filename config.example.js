module.exports = {
	/* Set true for production database */
	production: true,
	/* Your domain without / at the end */
	domain: "http://localhost",
	/* Port for the server */
	port: 6547,
	/* How often can user send request to API */
	rateLimitTime: 1000 * 5, // 5 seconds
	/* How often can user change IP address */
	ipChangeTime: 1000 * 60 * 60 * 3, // 3 hours
	/* Your SteamAPI key */
	steamKey: "",
	/* Secret for a cookie */
	cookieSecret: "",
	/* Discord webhook url or leave empty */
	webhook_url: "",
};