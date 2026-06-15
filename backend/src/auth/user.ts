import bcrypt from "bcrypt";
import { query } from "../db/connection.js";
import { v4 as uuidv4 } from "uuid";
import type { User } from "../types/index.js";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createUser(email: string, password: string, name?: string): Promise<User> {
  const id = uuidv4();
  const password_hash = await hashPassword(password);

  const result = await query(
    `INSERT INTO users (id, email, password_hash, name) 
     VALUES ($1, $2, $3, $4) 
     RETURNING id, email, name, created_at`,
    [id, email, password_hash, name || null]
  );

  return result.rows[0];
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await query(
    `SELECT id, email, name, created_at FROM users WHERE email = $1`,
    [email]
  );

  return result.rows[0] || null;
}

export async function getUserById(id: string): Promise<User | null> {
  const result = await query(
    `SELECT id, email, name, created_at FROM users WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
}

export async function getUserWithPassword(email: string): Promise<(User & { password_hash: string }) | null> {
  const result = await query(
    `SELECT id, email, password_hash, name, created_at FROM users WHERE email = $1`,
    [email]
  );

  return result.rows[0] || null;
}
