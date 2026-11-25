import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

// Reuse the connection across hot reloads in dev.
const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };
const client =
  globalForDb.pg ??
  postgres(url, {
    // Serverless functions each hold their own pool: keep it small.
    max: Number(process.env.DB_POOL_MAX ?? 5),
    // Neon's pooled endpoint (PgBouncer, transaction mode) doesn't support prepared statements.
    prepare: false,
  });
if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema, casing: "snake_case" });
export { schema };
