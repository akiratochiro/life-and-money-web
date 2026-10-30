# Life and Money — web

[![CI](https://github.com/akiratochiro/life-and-money-web/actions/workflows/ci.yml/badge.svg)](https://github.com/akiratochiro/life-and-money-web/actions/workflows/ci.yml)

Front-end for Life and Money, a personal finance app: day-to-day transactions, budgets per
category, savings goals and month-by-month analytics.

It consumes the [Life and Money API](https://github.com/akiratochiro/life-and-money-api), and it
is designed mobile-first: the phone is where an expense gets recorded, right when it happens.

## Live demo

**https://life-and-money-web.akira-tochiro23.workers.dev**

> The API runs on a free instance that sleeps after 15 minutes of inactivity.
> The first request after that can take up to a minute while it wakes up.

Create an account to try it: new users start with a default set of categories.

## Screens

| Screen | What it solves |
|---|---|
| Home | A feed ordered by what matters now: the month's balance, what needs attention, goals and budget |
| New transaction | Record an income, an expense or a saving in a few taps, with "today" and "yesterday" shortcuts |
| Statement | The month's transactions grouped by day, with editing and deletion |
| Budget | A limit per category, as a fixed amount or a percentage of income, effective by month |
| Goals | How much is left, how much to save each month and the deadline of each goal |
| Analytics | Expenses by category in a donut and month-by-month bars, with the average of closed months |
| Categories | Create, rename and archive your own categories |

## Stack

React 19 · TypeScript · Vite · React Router · TanStack Query · Tailwind CSS 4 · openapi-fetch + openapi-typescript

## Architecture decisions

The main ones are in [docs/decisions.md](docs/decisions.md), and [docs/revisao.md](docs/revisao.md)
covers the same choices as questions and answers. In short:

- **Types generated from the API's OpenAPI spec**, never written by hand: the back-end contract is
  the source of truth, and a breaking change shows up as a compile error
- **Organized by feature** (`features/transactions`, `features/budget`...), with shared code in `shared/`
- **TanStack Query owns server state**; there is no global store for server data
- **Money as integer cents** in forms, so values are never rounded wrong before being sent
- **Errors come ready from the API** (RFC 9457): the `detail` arrives in Portuguese and goes straight to the screen
- **The access token lives only in memory**; after a reload, the session comes back through an
  `HttpOnly` cookie that this code never reads
- **Front and API on the same origin**: the Worker that serves the front proxies `/api/*` to the
  API, so the session cookie is not a third-party cookie and Safari does not block it
- **A sleeping API does not look like an error**: the free Render instance hibernates, so the app
  checks `/api/health` on start and, if it takes more than about 2 seconds, shows a "waking up the
  server" screen until the API answers. Queries retry only transient failures (network, timeout,
  502/503/504); writes never retry, so a transaction is never saved twice

## Running locally

Requirements: Node 22.22+ or 24.15+ (required by jsdom, used in the tests) and the API running at
`http://localhost:8080`.

```bash
git clone https://github.com/akiratochiro/life-and-money-web.git
cd life-and-money-web
npm install
npm run dev
```

The app runs at `http://localhost:5173`. The Vite proxy forwards `/api/*` to `localhost:8080`, so
the browser only talks to the front's origin, as in production. There is no environment variable
to set.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Development server with HMR |
| `npm run build` | Type-checks (`tsc -b`) and builds the production bundle |
| `npm run preview` | Serves the built bundle, to check the build |
| `npm run lint` | Runs ESLint on the whole project |
| `npm test` | Runs the tests once (Vitest + Testing Library on jsdom) |
| `npm run test:watch` | Runs the tests in watch mode, re-running on every change |
| `npm run api:types` | Regenerates `src/shared/api/schema.d.ts` from the API's OpenAPI spec |

Whenever an endpoint or a field changes in the API, run `npm run api:types` with the API running
and commit the generated file together with the change that uses it.

## Tests

```bash
npm test
```

Tests live next to the code they cover (`money.ts` → `money.test.ts`) and run on Vitest, which
reuses the Vite configuration. Pure functions, such as the cents conversion and the order of the
budget alerts, have unit tests; components are tested with Testing Library, which interacts with
them the way a user would, on a DOM simulated by jsdom. CI runs the tests on every push, before
the build.

## Deployment

The front is deployed as a **Cloudflare Worker** that does two things:

- serves the static files in `dist`, straight from the assets layer;
- proxies `/api/*` to the API on Render ([`worker/index.ts`](worker/index.ts)), without rewriting
  the path. Only those requests run the Worker script.

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

There is no build variable. The API address is `vars.API_ORIGIN` in [`wrangler.jsonc`](wrangler.jsonc),
without a trailing slash, and it is read at runtime: pointing the front at another API only needs
a new `wrangler deploy`, not a new build.

To try the Worker locally against the local API, create a `.dev.vars` file (ignored by git) with
`API_ORIGIN=http://localhost:8080` and run `npm run build && npx wrangler dev`.

Routing is handled by [`wrangler.jsonc`](wrangler.jsonc): `not_found_handling: "single-page-application"`
serves `index.html` for any path that is not a file, so that opening `/goals` directly, or
reloading it, reaches React Router instead of returning a 404.

The full step by step, including the API and the database, is in the
[API's docs/deploy.md](https://github.com/akiratochiro/life-and-money-api/blob/main/docs/deploy.md).

## Roadmap

- Installable as a PWA, with a home-screen shortcut
- Withdrawals from savings goals (depends on the API)
