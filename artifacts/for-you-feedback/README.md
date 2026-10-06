# For You Feedback

A guest feedback form and staff dashboard for For You Chinese Restaurant. The app stores ratings and optional guest comments in Neon Postgres. The staff dashboard is intentionally open, matching the supplied reference; anyone with the website link can view submitted comments and names.

## Deploy from GitHub to Vercel

1. Push the entire workspace repository to GitHub.
2. Import that repository in Vercel and set **Root Directory** to `artifacts/for-you-feedback`.
3. Keep the framework preset as **Vite**. The included `vercel.json` builds the frontend and exposes the `/api` serverless functions.
4. In Vercel project settings, add `NEON_DATABASE_URL` using the connection string from the Neon project. Do not prefix it with `VITE_`; the value must stay server-side.
5. If you are using a new Neon database, run `pnpm run db:setup` from this directory with `NEON_DATABASE_URL` set. The connected `for-you-Chinese` database already has the feedback table created.

Vercel runs the website and API on the same domain. No browser-side database credentials or CORS configuration are needed.

## Local development

Install dependencies from the workspace root with `pnpm install`. Add `NEON_DATABASE_URL` to the server environment, then start the existing API Server and the For You Feedback web workflow. The web app calls the API server at `/api`.

For a separate Vercel-compatible local environment, copy `.env.example` to `.env.local`, add the Neon connection string, and run `pnpm run db:setup` before starting the app.

## API

- `POST /api/feedback` — validate and save a rating.
- `GET /api/dashboard` — return rating averages, rating mix, and recent comments.
- `GET /api/feedback/export` — download all feedback as CSV.

The schema is also included in `db/schema.sql`. Names and comments are optional. The dashboard is public by design; add staff authentication before collecting private or sensitive information.
