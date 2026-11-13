# Beatrun Courses Database

Courses database for [Beatrun](https://github.com/JonnyBro/beatrun), written in [TypeScript](https://typescriptlang.org/).\
For the backend we are using [fastify](https://fastify.dev) and for the frontend we are using [Vue 3](https://vuejs.org/) with [shadcn-vue](https://shadcn-vue.com).

The original project was made by [relaxtakenotes](https://github.com/relaxtakenotes/beatrun-courses-server) in [PHP](https://www.php.net/).

Community version is hosted at **[courses.jbro.top](https://courses.jbro.top)**, it's also used by the gamemode by default (press F4 in-game).

---

## Features

- Website with every uploaded course: search, filters by map and author, Workshop previews and a download button for the course file.
- Leaderboards for every course and global ones for players and creators. Times are sent by the game when you finish a course.
- Points: a course is worth 100 points for every player who finished it, up to 1000. The record holder gets all of them, everyone else gets `worth * record / their time`.
- Player profiles with their times and courses.
- Updating a course without changing its code, from the game or from the website. Its leaderboard gets wiped.
- Admin panel for users, courses and times, and bans with a reason that the player sees on the site and in the game.
- Steam login, 5 themes from the game and English and Russian translations.

---

## Running

1. `pnpm install`
1. Copy `.env.example` to `.env` in the repository root and fill it in. Variables set in the environment (docker, pm2) override the file.
1. `pnpm build`, then `pnpm start`

The backend serves the website too, so everything lives on one origin (`DOMAIN`). Put it behind a proxy with `BEHIND_PROXY=true` if you need HTTPS.

With pm2 you only need the backend:

```bash
pm2 start dist/index.js --name beatrun-courses --cwd packages/backend
```

An old database from the previous version works as is: missing fields and indexes are created on startup.

### Development

`pnpm dev` starts the backend on `:6547` and Vite on `:5173`, Vite proxies `/api` and `/auth` to the backend.
Set `DOMAIN=http://localhost:5173` and `PRODUCTION=false` in `.env` so Steam login comes back to the dev server. Vite takes the backend port from the same `.env`.

With `PRODUCTION=false` there are also test accounts that don't need Steam: `/auth/dev/admin`, `/auth/dev/user` and `/auth/dev/user2`, or the DEV button in the header.

---

## Translating the website

Translations are in `packages/frontend/src/locales`, one JSON file per language.

1. Copy `en.json` to `<code>.json`, like `de.json` or `pt-BR.json`.
1. Translate the values (not the keys) and set `meta.name` to the language's own name, e.g. `"Deutsch"`.
1. Keep the `{placeholders}`. Plural forms are separated with `|` in CLDR order (`one | few | many | other`), see `ru.json`.

The new language shows up in the picker by itself and is picked by default for browsers using it. Missing keys fall back to English.

---

## API

The backend sends security headers with a Content Security Policy (inline scripts are allowed by hash, read from the built `index.html` on startup). HSTS is only sent when `DOMAIN` is `https://`.

Requests are limited per IP and answer `429` past the limit: 300 a minute for the API in general, 10 for uploading or replacing a course, 30 for records, 60 for downloads, 20 for key checks, game sign-in and the Steam login, 30 for sign-in polls. Behind a proxy set `BEHIND_PROXY=true`, otherwise everyone shares the proxy's IP.

### Game

The game uses `GET /api/courses/search`, `GET /api/courses/info/:code`, `POST /api/courses/upload`, `GET /api/courses/download`, `DELETE /api/courses/delete`, `GET /api/users/profile/:steamId` and `GET /api/key/validate`. Uploading a course that is already in the database (same CRC) answers `409` with the existing code in `data.duplicate`. Courses are checked the same way the game checks them before loading (limits, coordinates, entity classes, model paths, name, map name and Workshop id), a bad one answers `400` with the reason. `pnpm --filter ./packages/backend check-courses` runs this check over every course already in the database.

The game signs in without copying a key:

```http
POST /api/link/start                    -> { code: "ABCD-EFGH", poll, interval, expiresIn }
POST /api/link/poll   Headers: poll     -> 202 until confirmed, then { token } once, 404 when expired
DELETE /api/devices/current   Headers: authorization: <token>
```

The game opens `/link?code=ABCD-EFGH`, the player confirms it there after signing in through Steam. Only the game that asked for the code knows `poll`, so a code seen by someone else is useless. Every token is a device on the profile page and can be removed there. A token unused for 90 days expires. Only SHA-256 of tokens is stored. Game keys from before this were moved to devices as "legacy" ones and keep working, but `GET /api/key/validate` answers `legacy: true` for them and `/api/users/me` has `legacyKey`, so the game and the site ask to sign in again. Signing in from the game revokes the token it had before. The game keeps one token per database domain in `data/beatrun/tokens.txt` and never sends it to another domain.

`POST /api/link/start` takes optional `os` (`windows`, `linux`, `osx`) and `branch` headers. A device keeps them, the IP it signed in from and the IP it was last used from, and the player can name it (`PATCH /api/users/me/devices/:id` with `{ name }`). The site shows the country of these IPs from the DB-IP Lite database in `data/dbip-country-lite.mmdb` (`GEOIP_PATH` in `.env` to put it elsewhere). The server downloads it on the first start and checks once a day whether the next month's file is out, `GEOIP_AUTO_UPDATE=false` turns that off. `pnpm --filter ./packages/backend update-geoip` updates it by hand, a running server picks up the new file by itself. Without the file countries are simply not shown.

On top of that:

```http
POST /api/courses/records
Headers: authorization: <token>, hash: <Course_ID>, code: <course code, optional>
Body:    time=<seconds>, splits=<JSON array of seconds between checkpoints>
```

Saves a finished run. The game knows a loaded course only by `Course_ID` (`util.CRC()` of the course JSON), so every course stores the same CRC32 in `crc`. Only the best time per player is kept, every call counts as a run.
Answers `{ code, message, data: { code, name, personalBest, best, position } }`, or `404` if the course isn't in the database.
`code` is only used when that course has the same CRC, courses with the same content share it. A run whose splits don't add up to the time or don't match the checkpoints is rejected with `400`. A run faster than `sv_maxvelocity` allows between two checkpoints answers `202` and waits for an admin in `pendingRecords`.

```http
POST /api/courses/update
Headers: authorization: <token>, code: <course code>, mapname: <map>, workshopid: <optional>
Body:    data=<base64 course file>
```

Replaces the course file and keeps the code. Only for the author or an admin and only from the course's map. Wipes the leaderboard.

### Website

| Method             | Path                                                                       | Notes                                                        |
| ------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------ |
| GET                | `/api/stats`                                                               | Totals                                                       |
| GET                | `/api/courses/search?q&map&author&sort&page&limit`                         | `sort`: newest, oldest, downloads, runs, name                |
| GET                | `/api/courses/maps`                                                        | Maps with course counts                                      |
| GET                | `/api/courses/info/:code`                                                  | Course details and stats                                     |
| GET                | `/api/courses/info/:code/records?page&limit`                               | Course leaderboard                                           |
| GET                | `/api/courses/file/:code`                                                  | Course file as the game saves it                             |
| PUT                | `/api/courses/info/:code/file`                                             | Owner or admin, `{ data: base64 }`, wipes the leaderboard    |
| DELETE             | `/api/courses/info/:code`                                                  | Owner or admin                                               |
| GET                | `/api/leaderboard/players` / `/api/leaderboard/creators`                   | Global leaderboards                                          |
| GET                | `/api/users/me`                                                            | Current user with ban and `legacyKey`, `null` for guests     |
| GET, PATCH, DELETE | `/api/users/me/devices`, `/api/users/me/devices/:id`                       | Games the user signed in from, renaming, removing            |
| GET, POST          | `/api/link/:code`, `/api/link/:code/confirm`                               | Game sign-in code, confirming it                             |
| GET                | `/api/users/profile/:steamId` (`/records`)                                 | Public profile                                               |
| GET, PATCH         | `/api/admin/users`, `/api/admin/users/:steamId`                            | Admin, `{ "ban": { "reason": "..." } }` or `{ "ban": null }` |
| PATCH              | `/api/admin/courses/:code`                                                 | Admin                                                        |
| GET, DELETE        | `/api/admin/records`, `/api/admin/records/:id`                             | Admin                                                        |
| GET                | `/api/admin/records/pending`                                               | Admin, runs waiting for review                               |
| POST, DELETE       | `/api/admin/records/pending/:id/approve`, `/api/admin/records/pending/:id` | Admin, approve or reject a run                               |
| GET                | `/api/admin/log`                                                           | Admin actions on other people's users, courses and times     |

`/auth?redirect=/path` signs in through Steam and comes back to that page, `/profile` by default.

Banned users can't upload or update courses or submit times, these endpoints answer `403` with `data: { banned: true, reason, at }`. Banned players are hidden from leaderboards and don't count for points. Admins have to lose their admin rights before they can be banned.

---

## License

This project is licensed under the GNUv3 License - see the LICENSE file for details.
