import { readdir, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { pool, query } from "./connection.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "migrations");

export async function ensureMigrationsTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

export async function getAppliedMigrations(): Promise<Set<string>> {
  const result = await query(`SELECT name FROM schema_migrations ORDER BY name`);
  return new Set(result.rows.map((row: { name: string }) => row.name));
}

async function listMigrationFiles(): Promise<string[]> {
  const entries = await readdir(MIGRATIONS_DIR);
  return entries.filter((f) => f.endsWith(".sql")).sort();
}

export async function runMigrations(): Promise<void> {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();
  const files = await listMigrationFiles();

  if (files.length === 0) {
    console.log("⚠ No migration files found in", MIGRATIONS_DIR);
    return;
  }

  const client = await pool.connect();
  try {
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`⏭  Skip ${file} (already applied)`);
        continue;
      }

      const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
      console.log(`▶  Applying ${file}...`);

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO schema_migrations (name) VALUES ($1)`,
          [file]
        );
        await client.query("COMMIT");
        console.log(`✓  Applied ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }
  } finally {
    client.release();
  }

  console.log("✓ All pending migrations applied");
}
