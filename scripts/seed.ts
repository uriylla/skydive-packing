/**
 * Seeds an initial supervisor plus sample packers and parachutes.
 * Safe to run more than once. Usage: pnpm db:seed [--no-sample]
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { parachutes, users } from "../src/db/schema";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client, { casing: "snake_case" });

async function main() {
  const username = process.env.SEED_ADMIN_USERNAME ?? "admin";
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password || password === "change-me") {
    console.warn("⚠ SEED_ADMIN_PASSWORD is unset or default. Change it before deploying.");
  }

  await db
    .insert(users)
    .values({
      name: "Responsable",
      role: "supervisor",
      username,
      passwordHash: await bcrypt.hash(password ?? "change-me", 10),
    })
    .onConflictDoNothing({ target: users.username });
  console.log(`✓ supervisor "${username}"`);

  if (process.argv.includes("--no-sample")) return;

  const existing = await db.select({ id: users.id }).from(users);
  if (existing.length <= 1) {
    await db.insert(users).values(
      ["Carlos", "Ana", "Juan"].map((name) => ({ name, role: "packer" as const })),
    );
  }
  console.log("✓ sample packers");

  const sampleChutes = [12, 18, 23, 25, 31, 41, 45].map((n) => ({
    number: String(n).padStart(3, "0"),
    model: n % 2 ? "Navigator 260" : "Sabre3 210",
    owner: "Saltamos",
    status: n === 45 ? ("out_of_service" as const) : ("active" as const),
  }));
  await db.insert(parachutes).values(sampleChutes).onConflictDoNothing({
    target: parachutes.number,
  });
  console.log("✓ sample parachutes");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
