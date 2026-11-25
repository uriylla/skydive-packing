import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "../src/db/schema";
import { E2E_DATABASE_URL } from "../playwright.config";
import { ADMIN } from "./helpers";

/** Fresh database for every run: migrate, wipe, seed a known dataset. */
export default async function globalSetup() {
  const client = postgres(E2E_DATABASE_URL, { max: 1, onnotice: () => {} });
  const db = drizzle(client, { schema, casing: "snake_case" });
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    await db.execute(
      sql`TRUNCATE packs, operating_days, parachutes, stations, users, auth_failures RESTART IDENTITY CASCADE`,
    );
    await db.insert(schema.users).values([
      {
        name: "Responsable",
        role: "supervisor",
        username: ADMIN.username,
        passwordHash: await bcrypt.hash(ADMIN.password, 10),
      },
      { name: "Ana" },
      { name: "Carlos" },
      { name: "Juan" },
    ]);
    await db.insert(schema.parachutes).values([
      { number: "012", kind: "tandem", model: "Sigma 340" },
      { number: "023", kind: "normal", model: "Navigator 260" },
      { number: "031", kind: "normal", model: "Navigator 260" },
      { number: "045", kind: "normal", status: "out_of_service" },
    ]);
  } finally {
    await client.end();
  }
}
