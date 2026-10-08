# Deployment

This branch targets Vercel Node.js functions with Supabase Postgres. Durable rental state lives in Postgres; the runtime does not require a persistent local disk or one long-running server process.

Read [Postgres setup and recovery](docs/postgres-backend.md) and the [protected Preview checklist](docs/protected-preview.md) before any deployment. The Git repository already serves production. Preview configuration must be branch-scoped, use a separate synthetic database and restricted runtime credentials, and preserve production settings. No push or deployment is authorized by these instructions.

The preserved coastal SQLite checkpoint still requires persistent-disk hosting and is not a Vercel rollback target. Stripe, screening and live rental launch remain separate work.
