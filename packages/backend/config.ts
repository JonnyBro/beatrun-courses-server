export default {
	/* Set true for production */
	prod: false,
	/* Your domain without / at the end */
	domain: "http://localhost:6547",
	/* Port for the server */
	port: 6547,
	/* How often can user send request to API */
	rateLimitTime: 1000 * 5, // 5 seconds
	/* How often can user change IP address */
	ipChangeTime: 1000 * 60 * 60 * 3, // 3 hours
	/* Your SteamAPI key */
	steamKey: "D0DE940B21415146D4F33E54AB505F69",
	/* Secret for a cookie */
	cookieSecret: "",
	/* Discord webhook url or leave empty */
	webhook_url: "",
};
