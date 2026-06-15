# Neon database migrations

Schema changes are versioned SQL files applied in filename order. Applied migrations are recorded in `schema_migrations`.

## Run migrations

```bash
cd backend
cp .env.example .env   # set DATABASE_URL to your Neon connection string
npm run migrate
```

The API also runs pending migrations on startup via `initializeDatabase()` in `src/db/schema.ts`.

## Migration history

| File | Description |
|------|-------------|
| `001_baseline_core.sql` | `users`, `aws_integrations`, `lab_definitions`, `lab_sessions`, `validation_runs` |
| `002_lab_definitions_connect_once.sql` | Drop `iam_policy_key` / `validation_config_key`; add `content`, `outputs_mapping`, `scenario_id` |
| `003_lab_environments.sql` | `lab_environments` table (24h shared infra per module) |
| `004_lab_sessions_environment.sql` | `environment_id`, DO id, terraform outputs, session timestamps |
| `005_lab_environments_tunnel_hostname.sql` | `tunnel_hostname` for Cloudflare SSH ingress |

## Adding a new migration

1. Create `006_your_change.sql` in this folder.
2. Use idempotent statements where possible (`IF NOT EXISTS`, `IF EXISTS`).
3. Run `npm run migrate`.

Do not edit files that have already been applied to production — add a new file instead.

## Neon notes

- Use the **direct** connection string (not pooled) for migrations if you hit DDL issues with PgBouncer.
- River queue tables (`river_*`) are created by the Go worker, not these migrations.
