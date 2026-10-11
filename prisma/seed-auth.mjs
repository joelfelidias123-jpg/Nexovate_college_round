import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const db = new PrismaClient();

function hash(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

for (const email of ["admin@nexus.demo", "member@nexus.demo"]) {
  await db.user.update({ where: { email }, data: { passwordHash: hash("demo1234") } });
}
console.log("Demo passwords reset to demo1234.");
await db.$disconnect();