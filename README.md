# Beatrun Courses Database Server

Beatrun courses database written in JavaScript using [Node.js](https://nodejs.org).\
This project is a rewrite of this [fork](https://github.com/JonnyBro/beatrun-courses-server) from PHP to JavaScript. The original project was made by [relaxtakenotes](https://github.com/relaxtakenotes/beatrun-courses-server).

## Features

- Courses management.
- User authentication using Steam API.
- Admin dashboard.
- API for external integrations.

## Installation

To install the dependencies and start the server, run the following commands:

```bash
pnpm i
pnpm start
```

## Usage

### Routes

- /admin - Admin dashboard
- /api - API endpoints
- /auth - Authentication routes
- / - Main application routes
- /key - Keys management
- /stats - Statistics
- /upload - Courses uploads

### Views

- admin.ejs - Admin dashboard view
- error.ejs - Error page view
- index.ejs - Main page view
- key.ejs - Keys management view
- stats.ejs - Statistics view

## Configuration

Copy `config.example.js` to `config.js` and update the configuration as needed.

## Database

The main database file is located at `main_db.json`. An example database file is provided at `main_db.example.json`.

## Logging

Logs are stored in `logs.log`.

## Contributing

Feel free to submit issues and pull requests. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the GNUv3 License - see the LICENSE file for details.

## TODO

- [ ] Add something else?
