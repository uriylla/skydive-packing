import "dotenv/config";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "@/db/schema";

/**
 * Integration tests run against DATABASE_URL_TEST (a throwaway database).
 * When it's unset, DB tests are skipped.
 */
export const testDbUrl = process.env.DATABASE_URL_TEST;

export function createTestDb() {
  const client = postgres(testDbUrl!, { max: 1, onnotice: () => {} });
  const db = drizzle(client, { schema, casing: "snake_case" });
  return {
    db,
    async setup() {
      await migrate(db, { migrationsFolder: "drizzle" });
    },
    async reset() {
      await db.execute(
        sql`TRUNCATE packs, operating_days, parachutes, users RESTART IDENTITY CASCADE`,
      );
    },
    close: () => client.end(),
  };
}
