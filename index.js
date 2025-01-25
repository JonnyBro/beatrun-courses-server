const express = require("express"),
	path = require("path"),
	session = require("express-session"),
	logger = require("morgan"),
	fs = require("fs"),
	passport = require("passport"),
	SteamStrategy = require("passport-steam").Strategy;

const { JsonDB, Config } = require("node-json-db");

const config = require("./config");
const db = new JsonDB(new Config(`data/${config.production ? "main" : "test"}_db`, true, true, "/"));

if (!config.cookieSecret || !config.steamKey || config.steamKey === "NO_KEY" || config.cookieSecret === "NO_COOKIE") return console.log("Please check that you have filled steamKey and cookieSecret in config file");
if (!fs.existsSync("public/courses/")) fs.mkdirSync("public/courses/");

// Express App
const indexRouter = require("./routes/index"),
	keyRouter = require("./routes/key"),
	uploadRouter = require("./routes/upload"),
	adminRouter = require("./routes/admin"),
	apiRouter = require("./routes/api"),
	statsRouter = require("./routes/stats"),
	authRouter = require("./routes/auth");

const app = express();

/**
 * Callback to serialize user into session.
 * It is called at end of request in authenticate method after successful authentication.
 * This method will store necessary data from the authenticated user object (`user`).
 * @param {Object} user - The authenticated user.
 * @param {Function} done - Callback to signal success or failure for saving session data.
 */
passport.serializeUser((user, done) => {
	done(null, user._json);
});

/**
 * Callback to deserialize user from session.
 * It is called at the start of each request in authenticate method after receiving client's request.
 * This method will reconstruct a User object (`user`) based on data stored during `serializeUser` call.
 * @param  {Object} obj - The serialized user data from session.
 * @param  {Function} done - Callback to signal success or failure for loading user.
 */
passport.deserializeUser((obj, done) => {
	done(null, obj);
});

passport.use(
	new SteamStrategy(
		{
			realm: config.domain,
			returnURL: `${config.domain}/auth/return`,
			apiKey: config.steamKey,
		},
		(_, profile, done) => {
			return done(null, profile);
		},
	),
);

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
	session({
		secret: config.cookieSecret,
		name: "U_SESSION",
		resave: true,
		saveUninitialized: true,
		cookie: {
			maxAge: 3600000,
		},
	}),
);
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/key", keyRouter);
app.use("/upload", uploadRouter);
app.use("/admin", adminRouter);
app.use("/api", apiRouter);
app.use("/stats", statsRouter);
app.use("/auth", authRouter);

/* catch 404 and forward to error handler
app.use(function (req, res, next) {
	next(createError(404));
});

// Error Handler
app.use(function (err, req, res) {
	res.status(err.status || 500);
	res.render("error");
});
*/

// Locals
db.getData("/admins").then(data => {
	app.locals.admins = data;
});

app.locals = {
	config: config,
	db: db,
};

// HTTP server
const http = require("http");

const port = config.port || 6547;
app.set("port", port);

const server = http.createServer(app);

server.listen(port);

server.on("error", error => {
	if (error.syscall !== "listen") throw error;

	// handle specific listen errors with friendly messages
	switch (error.code) {
		case "EACCES":
			console.error(`Port ${port} requires elevated privileges`);
			process.exit(1);
			break;
		case "EADDRINUSE":
			console.error(`Port ${port} is already in use`);
			process.exit(1);
			break;
		default:
			throw error;
	}
});

server.on("listening", () => {
	const addr = server.address();
	const bind = typeof addr === "string" ? "pipe: " + addr : "port: " + addr.port;

	console.log("Now listening on " + bind);
});
