import { readFile } from "node:fs/promises";
import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  await client.query("BEGIN");
  await client.query(
    await readFile(
      new URL("../migrations/001-recurring-transactions.sql", import.meta.url),
      "utf8",
    ),
  );
  await client.query("COMMIT");
  console.log("Recurring transaction schema is ready.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
