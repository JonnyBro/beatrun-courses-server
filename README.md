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
1. Copy `packages/backend/config.example.json` to `packages/backend/config.json` and fill it in.
1. `pnpm build`, then `pnpm start`

The backend serves the website too, so everything lives on one origin (`domain` in the config). Put it behind a proxy with `"isBehindProxy": true` if you need HTTPS.

With pm2 you only need the backend:

```bash
pm2 start dist/index.js --name beatrun-courses --cwd packages/backend
```

An old database from the previous version works as is: missing fields and indexes are created on startup.

### Development

`pnpm dev` starts the backend on `:6547` and Vite on `:5173`, Vite proxies `/api` and `/auth` to the backend.
Set `"domain": "http://localhost:5173"` and `"production": false` in the config so Steam login comes back to the dev server.

With `"production": false` there are also test accounts that don't need Steam: `/auth/dev/admin`, `/auth/dev/user` and `/auth/dev/user2`, or the DEV button in the header.

---

## Translating the website

Translations are in `packages/frontend/src/locales`, one JSON file per language.

1. Copy `en.json` to `<code>.json`, like `de.json` or `pt-BR.json`.
1. Translate the values (not the keys) and set `meta.name` to the language's own name, e.g. `"Deutsch"`.
1. Keep the `{placeholders}`. Plural forms are separated with `|` in CLDR order (`one | few | many | other`), see `ru.json`.

The new language shows up in the picker by itself and is picked by default for browsers using it. Missing keys fall back to English.

---

## API

Requests are limited per IP and answer `429` past the limit: 300 a minute for the API in general, 10 for uploading or replacing a course, 30 for records, 60 for downloads, 20 for key checks and the Steam login. Behind a proxy set `"isBehindProxy": true`, otherwise everyone shares the proxy's IP.

### Game

The game uses `GET /api/courses/search`, `GET /api/courses/info/:code`, `POST /api/courses/upload`, `GET /api/courses/download`, `DELETE /api/courses/delete`, `GET /api/users/profile/:steamId` and `GET /api/key/validate`. Uploading a course that is already in the database (same CRC) answers `409` with the existing code in `data.duplicate`. On top of that:

```http
POST /api/courses/records
Headers: authorization: <user key>, hash: <Course_ID>, code: <course code, optional>
Body:    time=<seconds>, splits=<JSON array of seconds between checkpoints>
```

Saves a finished run. The game knows a loaded course only by `Course_ID` (`util.CRC()` of the course JSON), so every course stores the same CRC32 in `crc`. Only the best time per player is kept, every call counts as a run.
Answers `{ code, message, data: { code, name, personalBest, best, position } }`, or `404` if the course isn't in the database.
`code` is only used when that course has the same CRC, courses with the same content share it. A run whose splits don't add up to the time or don't match the checkpoints is rejected with `400`. A run faster than `sv_maxvelocity` allows between two checkpoints answers `202` and waits for an admin in `pendingRecords`.

```http
POST /api/courses/update
Headers: authorization: <user key>, code: <course code>, mapname: <map>, workshopid: <optional>
Body:    data=<base64 course file>
```

Replaces the course file and keeps the code. Only for the author or an admin and only from the course's map. Wipes the leaderboard.

### Website

| Method       | Path                                                                       | Notes                                                        |
| ------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------ |
| GET          | `/api/stats`                                                               | Totals                                                       |
| GET          | `/api/courses/search?q&map&author&sort&page&limit`                         | `sort`: newest, oldest, downloads, runs, name                |
| GET          | `/api/courses/maps`                                                        | Maps with course counts                                      |
| GET          | `/api/courses/info/:code`                                                  | Course details and stats                                     |
| GET          | `/api/courses/info/:code/records?page&limit`                               | Course leaderboard                                           |
| GET          | `/api/courses/file/:code`                                                  | Course file as the game saves it                             |
| PUT          | `/api/courses/info/:code/file`                                             | Owner or admin, `{ data: base64 }`, wipes the leaderboard    |
| DELETE       | `/api/courses/info/:code`                                                  | Owner or admin                                               |
| GET          | `/api/leaderboard/players` / `/api/leaderboard/creators`                   | Global leaderboards                                          |
| GET          | `/api/users/me`                                                            | Current user with `hasKey` and ban, `null` for guests        |
| POST         | `/api/users/me/key`                                                        | New key, the only time it's returned (only its hash is kept) |
| GET          | `/api/users/profile/:steamId` (`/records`)                                 | Public profile                                               |
| GET, PATCH   | `/api/admin/users`, `/api/admin/users/:steamId`                            | Admin, `{ "ban": { "reason": "..." } }` or `{ "ban": null }` |
| PATCH        | `/api/admin/courses/:code`                                                 | Admin                                                        |
| GET, DELETE  | `/api/admin/records`, `/api/admin/records/:id`                             | Admin                                                        |
| GET          | `/api/admin/records/pending`                                               | Admin, runs waiting for review                               |
| POST, DELETE | `/api/admin/records/pending/:id/approve`, `/api/admin/records/pending/:id` | Admin, approve or reject a run                               |

`/auth?redirect=/path` signs in through Steam and comes back to that page, `/profile` by default.

Banned users can't upload or update courses or submit times, these endpoints answer `403` with `data: { banned: true, reason, at }`. Banned players are hidden from leaderboards and don't count for points. Admins have to lose their admin rights before they can be banned.

---

## License

This project is licensed under the GNUv3 License - see the LICENSE file for details.
