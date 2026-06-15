import * as dotenv from "dotenv";
import { runMigrations } from "./run-migrations.js";
import { closePool } from "./connection.js";

dotenv.config();

async function main() {
  const dbName = process.env.DATABASE_URL?.split("/").pop()?.split("?")[0];
  console.log("🔄 Neon database migrations");
  console.log(`📦 Database: ${dbName ?? "(unknown)"}`);

  try {
    await runMigrations();
    console.log("✅ Migrations completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

main();
