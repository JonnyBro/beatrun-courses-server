# Beatrun Courses Database Server

Beatrun Courses Database written in [TypeScript](https://typescriptlang.org/).\
For the backend we are using [fastify](https://fastify.dev) and for the frontend we are using [Vue 3](https://vuejs.org/) with [shadcn-vue](https://shadcn-vue.com).\
\
The original project was made by [relaxtakenotes](https://github.com/relaxtakenotes/beatrun-courses-server) in [PHP](https://www.php.net/).

## Running

1. `pnpm install`
2. Copy `packages/backend/config.example.json` to `packages/backend/config.json` and fill it in.
3. `pnpm build`, then `pnpm start`

When `packages/frontend/dist` exists the backend serves the website itself, so the site, the API and Steam login all live on one origin (`domain` in the config).

### Development

`pnpm dev` starts the backend on `:6547` and Vite on `:5173`. Vite proxies `/api` and `/auth` to the backend.
For Steam login to come back to the dev server set `"domain": "http://localhost:5173"` and `"production": false` in the backend config.

## Translating the website

Translations live in `packages/frontend/src/locales`, one JSON file per language. To add a language:

1. Copy `en.json` to `<code>.json`, where `<code>` is a language code like `de`, `uk` or `pt-BR`.
2. Translate the values (not the keys) and set `meta.name` to the language's own name, e.g. `"Deutsch"`.
3. Keep the `{placeholders}` as they are. Plural forms are separated with `|` in CLDR order (`one | few | many | other`), see `ru.json` for an example.

The new file shows up in the language picker automatically, and visitors whose browser uses that language get it by default. Missing keys fall back to English.

## API

Endpoints used by the game are unchanged: `GET /api/courses/list`, `POST /api/courses/upload`, `GET /api/courses/download`, `DELETE /api/courses/delete`, `GET /api/key/validate`.

### Submitting a finished run (game)

```http
POST /api/courses/records
Headers: authorization: <user key>, hash: <Course_ID>   (or code: <course code>)
Body:    time=<seconds, float>   (form or JSON)
```

The game identifies a loaded course by `Course_ID`, which is `util.CRC()` of the course JSON. The backend stores the same CRC32 for every uploaded course (`crc`, filled in for old courses on startup), so a run counts for every player on the server, no matter who loaded the course or whether it came from a local file.

Only the best time per player and course is kept, every call also counts as a run.
Response: `{ code, message, data: { code, name, personalBest: boolean, best: number, position: number } }`, `404` if the course isn't in the database.

### Website

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/stats` | Totals |
| GET | `/api/courses/search?q&map&author&sort&page&limit` | `sort`: newest, oldest, downloads, runs, name |
| GET | `/api/courses/maps` | Maps with course counts |
| GET | `/api/courses/info/:code` | Course details and stats |
| GET | `/api/courses/info/:code/records?page&limit` | Course leaderboard |
| GET | `/api/courses/file/:code` | Course file as the game saves it, no login needed |
| DELETE | `/api/courses/info/:code` | Session, owner or admin |
| GET | `/api/leaderboard/players` / `/api/leaderboard/creators` | Global leaderboards |
| GET | `/api/users/me` | Current session user with key, `null` for guests |
| POST | `/api/users/me/key` | Generate a new key |
| GET | `/api/users/profile/:steamId` (`/records`) | Public profile |
| GET, PATCH | `/api/admin/users`, `/api/admin/users/:steamId` | Admin |
| PATCH | `/api/admin/courses/:code` | Admin |
| GET, DELETE | `/api/admin/records`, `/api/admin/records/:id` | Admin |

`/auth?redirect=/path` returns to the website after login; without `redirect` it shows the key as plain text like before.

Points: the record holder on a course gets 1000 points, everyone else gets `1000 × record / their time`.

## License

This project is licensed under the GNUv3 License - see the LICENSE file for details.
