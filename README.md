# YouTube to Article

Turn a YouTube URL into a polished, SEO-ready article and publish it to your blog
platforms. Paste a link, watch the pipeline pull the transcript, synthesize an
article with an LLM, edit it, then publish to Dev.to, Hashnode, Blogger, LinkedIn,
or GitHub.

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
                              │   ├─► services/converter (FastAPI)  ─► YouTube transcript
                              │   └─► @repo/ai ─► @ai-router/core ─► LLM providers
                              └─► publishers: devto · hashnode · blogger · linkedin · github
```

Flow: `POST /api/articles` enqueues a job → converter extracts the transcript →
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
  converter/      FastAPI transcript extraction service
scripts/
  setup-ai-router.sh
```
