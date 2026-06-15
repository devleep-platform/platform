import * as dotenv from "dotenv";
import { Pool, PoolClient } from "pg";

// Load environment variables first
dotenv.config();

const connString = process.env.DATABASE_URL;
console.log(`🔗 Connecting to: ${connString?.substring(0, 50)}...`);

const pool = new Pool({
  connectionString: connString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err: Error) => {
  console.error("Unexpected error on idle client", err);
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`✓ Query executed (${duration}ms)`);
    return result;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  }
}

export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

export async function closePool() {
  await pool.end();
}

export { pool };
