# Inkfeed

Turn a source — a YouTube video, an article URL, an RSS/podcast episode, or a
PDF/DOCX — into a polished, SEO-ready article and publish it to your platforms
(or your own built-in hub). Paste a link or drop a file, watch the pipeline
extract the content, synthesize an article with an LLM, edit it, then publish to
Dev.to, Hashnode, Blogger, LinkedIn, GitHub, a webhook, or this site.

## Stack

| Layer      | Tech                                                             |
| ---------- | ---------------------------------------------------------------- |
| Frontend   | Next.js 15 (App Router), React 19, Tailwind, TanStack Query, Clerk |
| API        | NestJS 10, TypeORM, PostgreSQL, BullMQ + Redis                   |
| AI         | `@ai-router/core` with fallback chain (OpenAI / OpenRouter / DeepSeek / OpenCode) |
| Converter  | FastAPI + MarkItDown (transcript extraction)                     |
| Monorepo   | npm workspaces + Turborepo                                       |

## Architecture

```
apps/web (Next.js)  ──►  apps/api (NestJS)  ──►  Postgres
                              │   │
                              │   ├─► Redis / BullMQ  (process + publish queues)
                              │   ├─► services/converter (FastAPI)  ─► content extraction
                              │   └─► @repo/ai ─► @ai-router/core ─► LLM providers
                              └─► publishers: devto · hashnode · blogger · linkedin · github
```

Flow: `POST /api/articles` enqueues a job → converter extracts the content →
`@repo/ai` generates Markdown + SEO frontmatter → article marked `COMPLETED` →
`POST /api/articles/:id/publish` enqueues a publish job to a connected platform.
Live updates stream over SSE (`GET /api/articles/:id/events`).

## Prerequisites

- Node.js 20+ and npm 10+
- Docker (for Postgres, Redis, converter)
- A Clerk account (auth)
- At least one AI provider key (`OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `DEEPSEEK_API_KEY`, or `OPENCODE_API_KEY`)

> `@repo/ai` depends on `@ai-router/core` from a sibling checkout. The
> `postinstall` script (`scripts/setup-ai-router.sh`) expects an `ai-router`
> directory next to this repo, e.g. `../ai-router`. Build it once with
> `npm install && npm run build` inside `ai-router` if the script does not.

## Quickstart

```bash
# 1. Install dependencies (also wires up @ai-router/core)
npm install

# 2. Configure environment
cp .env.example .env
# fill in your keys

# 3. Start Postgres, Redis, and the converter
docker compose up -d

# 4. Create the schema
npm run db:migrate

# 5. Run everything (web :3000, api :3001, converter :8000)
npm run dev
```

## Environment

See [`.env.example`](./.env.example) for the full list. Key groups:

- **Database / Redis** — `DB_*`, `REDIS_URL`
- **AI providers** — `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `DEEPSEEK_API_KEY`, `OPENCODE_API_KEY`
- **Clerk** — `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- **Encryption** — `TOKEN_ENCRYPTION_KEY` (encrypts stored platform tokens)
- **Publishing OAuth** — `GOOGLE_*` (Blogger), `LINKEDIN_*`, `GITHUB_*`
- **Public profiles** — `APP_DOMAIN` / `NEXT_PUBLIC_APP_DOMAIN` (e.g. `inkfeed.online`)

## Public profiles

Every user gets a public profile at their username subdomain, e.g.
`https://jane.inkfeed.online`. It lists every article the user has
published to the built-in **site** destination.

The username is derived from the Clerk username on first sign-in (falling back
to the email local-part) and can be changed under **Settings → Public profile**.

### How it works

- `apps/web` middleware rewrites a request to the root of a profile subdomain
  (`jane.inkfeed.online/`) to `/u/jane`, rendering the profile page.
  Article links (`/article/:slug`) resolve normally on the subdomain.
- `apps/api` serves `GET /api/public/profiles/:username` (unauthenticated) and
  `GET/PATCH /api/profile` (authenticated username management).
- Published articles and canonical URLs use the writer's subdomain when
  `APP_DOMAIN` is set.

### Setting up username subdomains (Cloudflare)

1. In **Cloudflare → DNS**, add a wildcard record pointing at your app host:
   - Type `CNAME`, name `*`, content your app's hostname (e.g. the Vercel/Cloudflare
     Pages host), proxied. This covers `anything.inkfeed.online`.
2. TLS is handled automatically: Cloudflare's Universal SSL certificate covers
   the first-level `*.inkfeed.online` wildcard. For deeper nesting or a
   custom setup, upload a wildcard Origin Certificate.
3. In the app's host platform (e.g. Vercel), add `*.inkfeed.online` as a
   custom domain so the certificate and routing include subdomains.
4. Set the env vars on the API and web deployments:

   ```env
   APP_DOMAIN=inkfeed.online
   NEXT_PUBLIC_APP_DOMAIN=inkfeed.online
   ```

Leave both blank in local development; profile URLs still work at
`/u/:username` (useful for local testing).


## Scripts

Run from the repo root (Turborepo fans out to workspaces):

| Command              | Description                                  |
| -------------------- | -------------------------------------------- |
| `npm run dev`        | Start all apps in watch mode                 |
| `npm run build`      | Build all workspaces                         |
| `npm run lint`       | Lint all workspaces                          |
| `npm test`           | Run tests                                    |
| `npm run db:migrate` | Run TypeORM migrations against Postgres      |
| `npm run db:generate`| Generate a migration from entity changes     |

## API

Base URL: `http://localhost:3001`. All `/api/articles`, `/api/connections`,
and `/api/publications` routes require a Clerk bearer token.

| Method   | Route                              | Purpose                          |
| -------- | ---------------------------------- | -------------------------------- |
| `POST`   | `/api/articles`                    | Create article from a YouTube URL |
| `POST`   | `/api/articles/manual`             | Create a blank article for the editor |
| `GET`    | `/api/articles`                    | List current user's articles      |
| `GET`    | `/api/articles/:id`                | Get one article                   |
| `PATCH`  | `/api/articles/:id`                | Edit title / content              |
| `DELETE` | `/api/articles/:id`                | Delete article                    |
| `GET`    | `/api/articles/:id/events`         | SSE job progress stream           |
| `POST`   | `/api/articles/:id/publish`        | Publish to a connection           |
| `GET`    | `/api/articles/:id/publications`   | List publications for an article  |
| `GET`    | `/api/connections`                 | List platform connections         |
| `POST`   | `/api/connections`                 | Add a connection (API-token platforms) |
| `DELETE` | `/api/connections/:id`             | Remove a connection               |
| `GET`    | `/api/connections/blogger/authorize`  | Start Blogger OAuth            |
| `GET`    | `/api/connections/linkedin/authorize` | Start LinkedIn OAuth           |
| `GET`    | `/api/public/articles/:slugOrId`   | Public article permalink          |
| `GET`    | `/api/public/profiles/:username`   | Public profile + published articles |
| `GET`    | `/api/profile`                     | Current user's profile (username)  |
| `PATCH`  | `/api/profile`                     | Update the current user's username |
| `GET`    | `/api/health`                      | Health check                      |

## Project structure

```
apps/
  api/            NestJS API (controllers, commands, repositories, publishers)
  web/            Next.js frontend
packages/
  ai/             LLM transform + SEO frontmatter parsing (@repo/ai)
  database/       TypeORM entities + migrations (@repo/database)
  queue/          BullMQ queue definitions (@repo/queue)
  types/          Shared domain types (@repo/types)
services/
  converter/      FastAPI content extraction service (MarkItDown + feeds)
scripts/
  setup-ai-router.sh
```
