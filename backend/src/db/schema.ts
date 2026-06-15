/**
 * Database schema for Neon PostgreSQL.
 *
 * Migrations are the source of truth for schema changes.
 * SQL files live in ./migrations/ and are applied via runMigrations().
 *
 * Run manually:  npm run migrate
 * On API boot:   initializeDatabase() → runMigrations()
 */

import { runMigrations } from "./run-migrations.js";

/**
 * Applies pending SQL migrations to Neon.
 * Safe to call on every API startup — already-applied files are skipped.
 */
export async function initializeDatabase(): Promise<void> {
  await runMigrations();
}
