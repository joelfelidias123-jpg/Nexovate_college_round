import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import initSqlJs from "sql.js";

const root = process.cwd();
try {
  const envFile = await readFile(path.join(root, ".env.local"), "utf8");
  for (const line of envFile.split(/\r?\n/)) {
    const match = line.match(/^\s*DATABASE_PATH\s*=\s*(.*?)\s*$/);
    if (match && !process.env.DATABASE_PATH) process.env.DATABASE_PATH = match[1].replace(/^['"]|['"]$/g, "");
  }
} catch { /* .env.local is optional */ }

const configured = process.env.DATABASE_PATH || ".data/nexus.sqlite";
const databasePath = path.isAbsolute(configured) ? configured : path.resolve(root, configured);
await mkdir(path.dirname(databasePath), { recursive: true });
let fileBytes;
try { fileBytes = await readFile(databasePath); } catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const SQL = await initSqlJs({ locateFile: (file) => path.join(root, "node_modules", "sql.js", "dist", file) });
const database = new SQL.Database(fileBytes ? new Uint8Array(fileBytes) : undefined);
database.run("PRAGMA foreign_keys = ON;");
database.run(await readFile(path.join(root, "db", "schema.sql"), "utf8"));
const seeded = Number(database.exec("SELECT COUNT(*) FROM plans")[0]?.values[0]?.[0] ?? 0) > 0;
if (!seeded) {
  database.run("BEGIN");
  try {
    database.run(await readFile(path.join(root, "db", "seed.sql"), "utf8"));
    database.run("COMMIT");
  } catch (error) { database.run("ROLLBACK"); throw error; }
}
const temporaryPath = `${databasePath}.${process.pid}.tmp`;
await writeFile(temporaryPath, Buffer.from(database.export()));
await rename(temporaryPath, databasePath);
database.close();
console.log(seeded ? `Database already seeded: ${databasePath}` : `Database schema and demo data created: ${databasePath}`);
