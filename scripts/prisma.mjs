import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

if (!process.env.DATABASE_URL) {
  try {
    const env = await readFile(new URL("../.env.local", import.meta.url), "utf8");
    const line = env.split(/\r?\n/).find((item) => /^\s*DATABASE_URL\s*=/.test(item));
    if (line) process.env.DATABASE_URL = line.replace(/^\s*DATABASE_URL\s*=\s*/, "").replace(/^['"]|['"]$/g, "").trim();
  } catch { /* use DATABASE_URL supplied by the shell */ }
}
if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL in .env.local or the shell environment.");

const require = createRequire(import.meta.url);
const cli = require.resolve("prisma/build/index.js");
const result = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], { stdio: "inherit", env: process.env });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
