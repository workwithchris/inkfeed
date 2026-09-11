# Inkfeed

Turn a source — a YouTube video, an article URL, an RSS/podcast episode, a
PDF/DOCX, or a blank page — into a polished, SEO-ready article, repurpose it into
other formats, and publish it to your platforms (or your own built-in hub). Paste
a link or drop a file, watch the pipeline extract the content, synthesize an
article with an LLM, edit it, then publish to Dev.to, Hashnode, Blogger,
LinkedIn, GitHub, a webhook, or this site.

## Features

- **Many sources** — YouTube videos, arbitrary article URLs, RSS/podcast feeds
  (pick an episode), PDF/DOCX uploads, or start from scratch.
- **LLM synthesis** — generates Markdown with SEO frontmatter (title,
  description, slug, keywords, tags), a summary, and reading time.
- **Repurposing** — turn any article into a tweet thread, newsletter issue, or
  video script.
- **Bring your own AI** — store per-user provider credentials (OpenAI, Anthropic,
  Gemini, DeepSeek, Groq, Mistral, OpenRouter, xAI, or any OpenAI-compatible
  endpoint) with priority-based fallback; falls back to env providers when none
  are configured.
- **Publishing** — Dev.to, Hashnode, GitHub (commits the post to a repo),
  Blogger and LinkedIn via OAuth, plus a generic webhook and the built-in site.
- **Public hub** — every user gets a public profile at `<username>.<domain>`, and
  a global feed of all site-published articles at `read.<domain>`.
- **Live updates** — job progress streams to the UI over SSE.

## Stack

| Layer      | Tech                                                             |
| ---------- | ---------------------------------------------------------------- |
| Frontend   | Next.js 15 (App Router), React 19, Tailwind, TanStack Query, Zustand, Tiptap, Clerk |
| API        | NestJS 10, TypeORM, PostgreSQL, BullMQ + Redis                   |
| AI         | `@ai-router/core` with fallback chain (env defaults + per-user BYOK providers) |
| Converter  | FastAPI + MarkItDown + feedparser (content extraction)           |
| Monorepo   | npm workspaces + Turborepo                                       |

## Architecture

```
apps/web (Next.js)  ──►  apps/api (NestJS)  ──►  Postgres
                              │
              ┌───────────────┼───────────────────────────────┐
              │               │                               │
        Redis / BullMQ   services/converter (FastAPI)   @repo/ai
      articles · publishes   extraction (MarkItDown        ─► @ai-router/core
      · derivatives          + feeds)                        ─► LLM providers
              │
              └─► publishers: devto · hashnode · blogger · linkedin · github · webhook · site
```

Flow: `POST /api/articles` enqueues a job → converter extracts the content →
`@repo/ai` generates Markdown + SEO frontmatter → article marked `COMPLETED` →
`POST /api/articles/:id/publish` enqueues a publish job to a connected platform.
`POST /api/articles/:id/derivatives` enqueues a repurposing job. Live updates
stream over SSE (`GET /api/articles/:id/events`).

## Prerequisites

- Node.js 20+ and npm 10+
- Docker (for Postgres, Redis, converter)
- A Clerk account (auth)
- At least one AI provider key (`OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `DEEPSEEK_API_KEY`, or `OPENCODE_API_KEY`) — or add providers in-app

> `@repo/ai` needs `@ai-router/core` at runtime. The `postinstall` script
> (`scripts/setup-ai-router.mjs`) finds the `ai-router` checkout, builds its core
> if needed, and copies it into `node_modules/@ai-router/core`. By default it
> looks beside this repo (`../ai-router`); set `AI_ROUTER_DIR=/path/to/ai-router`
> to point elsewhere. If the checkout is missing, install still succeeds and
> prints a warning — re-run `npm install` after cloning it.

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
- **Encryption** — `TOKEN_ENCRYPTION_KEY` (encrypts stored platform + AI provider credentials)
- **Publishing OAuth** — `GOOGLE_*` (Blogger), `LINKEDIN_*`, `GITHUB_*`
- **Public profiles / hub** — `APP_DOMAIN` / `NEXT_PUBLIC_APP_DOMAIN` (e.g. `inkfeed.online`)

## AI providers (BYOK)

Users can add their own provider credentials under **Settings → AI providers**.
Each provider has a model, optional base URL, priority, and enabled flag. When
enabled providers exist they are tried in priority order before the env-configured
defaults, so a user's own keys take precedence. Credentials are encrypted at rest
with `TOKEN_ENCRYPTION_KEY`.

Supported provider ids: `openai`, `anthropic`, `gemini`, `deepseek`, `groq`,
`mistral`, `openrouter`, `xai`, `openai-compatible` (requires a base URL).

## Public hub & profiles

Every user gets a public profile at their username subdomain, e.g.
`https://jane.inkfeed.online`, listing every article published to the built-in
**site** destination. The global feed of all published articles lives at
`https://read.inkfeed.online` (also reachable at `/explore`).

The username is derived from the Clerk username on first sign-in (falling back
to the email local-part) and can be changed under **Settings → Public profile**.

### How it works

- `apps/web` middleware rewrites the root of a profile subdomain
  (`jane.inkfeed.online/`) to `/u/jane`, and `read.<domain>/` to `/explore`.
  Article links (`/article/:slug`) resolve normally on any subdomain.
- `apps/api` serves `GET /api/public/profiles/:username` and
  `GET /api/public/feed` (both unauthenticated), plus `GET/PATCH /api/profile`
  (authenticated username management).
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
`/u/:username` and the feed at `/explore` (useful for local testing).

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
`/api/publications`, `/api/providers`, `/api/feeds`, and `/api/profile` routes
require a Clerk bearer token unless noted.

| Method   | Route                              | Purpose                          |
| -------- | ---------------------------------- | -------------------------------- |
| `POST`   | `/api/articles`                    | Create article from a URL/source  |
| `POST`   | `/api/articles/manual`             | Create a blank article for the editor |
| `POST`   | `/api/articles/upload`             | Create from a PDF/DOCX upload     |
| `GET`    | `/api/articles`                    | List current user's articles      |
| `GET`    | `/api/articles/:id`                | Get one article                   |
| `PATCH`  | `/api/articles/:id`                | Edit title / content / SEO        |
| `DELETE` | `/api/articles/:id`                | Delete article                    |
| `POST`   | `/api/articles/:id/regenerate`     | Re-run synthesis                  |
| `GET`    | `/api/articles/:id/events`         | SSE job progress stream           |
| `POST`   | `/api/articles/:id/publish`        | Publish to a connection           |
| `DELETE` | `/api/articles/:id/site`           | Unpublish from the built-in site  |
| `GET`    | `/api/articles/:id/publications`   | List publications for an article  |
| `POST`   | `/api/articles/:id/derivatives`    | Repurpose into a format           |
| `GET`    | `/api/articles/:id/derivatives`    | List derivatives                  |
| `PATCH`  | `/api/articles/:id/derivatives/:derivativeId` | Edit derivative content |
| `DELETE` | `/api/articles/:id/derivatives/:derivativeId` | Delete a derivative       |
| `POST`   | `/api/feeds/inspect`               | Parse an RSS/podcast feed         |
| `GET`    | `/api/connections`                 | List platform connections         |
| `POST`   | `/api/connections`                 | Add a connection (API-token platforms) |
| `DELETE` | `/api/connections/:id`             | Remove a connection               |
| `GET`    | `/api/connections/blogger/authorize`  | Start Blogger OAuth            |
| `GET`    | `/api/connections/linkedin/authorize` | Start LinkedIn OAuth           |
| `GET`    | `/api/publications`                | List current user's publications  |
| `GET`    | `/api/providers`                   | List AI providers                 |
| `POST`   | `/api/providers`                   | Add an AI provider                |
| `PATCH`  | `/api/providers/:id`               | Update an AI provider             |
| `DELETE` | `/api/providers/:id`               | Remove an AI provider             |
| `POST`   | `/api/providers/:id/test`          | Test an AI provider route         |
| `GET`    | `/api/profile`                     | Current user's profile (username)  |
| `PATCH`  | `/api/profile`                     | Update the current user's username |
| `GET`    | `/api/public/articles/:slugOrId`   | Public article permalink          |
| `GET`    | `/api/public/profiles/:username`   | Public profile + published articles |
| `GET`    | `/api/public/feed`                 | Global feed of site-published articles |
| `GET`    | `/api/health`                      | Health check                      |

## Project structure

```
apps/
  api/            NestJS API (controllers, commands, repositories, publishers, workers)
  web/            Next.js frontend
packages/
  ai/             LLM transform + repurposing + SEO frontmatter parsing (@repo/ai)
  database/       TypeORM entities + migrations (@repo/database)
  queue/          BullMQ queue definitions (@repo/queue)
  types/          Shared domain types (@repo/types)
services/
  converter/      FastAPI content extraction service (MarkItDown + feeds)
scripts/
  setup-ai-router.mjs
```
