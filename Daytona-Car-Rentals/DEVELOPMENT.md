# Development

The coastal app uses Next.js with a server-only Postgres backend, intended for Vercel + Supabase Postgres. See [Postgres setup and recovery](docs/postgres-backend.md) for migrations, private roles, isolated local tests, environment variables and rollback. SQLite has no runtime fallback. Run migrations and initialize a deliberately selected development database before starting the app.

[The pilot guide](PILOT-IMPLEMENTATION.md) remains the reference for owner review and launch requirements; its historical SQLite setup is superseded by the Postgres guide. Stripe and screening are not implemented services.
