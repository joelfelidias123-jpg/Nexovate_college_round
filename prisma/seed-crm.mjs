import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "node:crypto";

const db = new PrismaClient();

// Password format: "salt:hash" (we'll reuse this exact format for login)
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

// [name, email, status, source, daysAgo]
const leads = [
  ["Aarav Mehta", "aarav.mehta@example.com", "WON", "WEBINAR", 13],
  ["Priya Nair", "priya.nair@example.com", "WON", "SITE", 12],
  ["Rohan Iyer", "rohan.iyer@example.com", "WON", "WEBINAR", 11],
  ["Sneha Kulkarni", "sneha.k@example.com", "QUALIFIED", "SITE", 10],
  ["Vikram Singh", "vikram.singh@example.com", "QUALIFIED", "WEBINAR", 9],
  ["Ananya Rao", "ananya.rao@example.com", "QUALIFIED", "SITE", 9],
  ["Karan Shah", "karan.shah@example.com", "QUALIFIED", "WEBINAR", 8],
  ["Meera Joshi", "meera.joshi@example.com", "QUALIFIED", "SITE", 7],
  ["Arjun Patel", "arjun.patel@example.com", "CONTACTED", "SITE", 7],
  ["Divya Menon", "divya.menon@example.com", "CONTACTED", "WEBINAR", 6],
  ["Rahul Verma", "rahul.verma@example.com", "CONTACTED", "SITE", 6],
  ["Neha Gupta", "neha.gupta@example.com", "CONTACTED", "WEBINAR", 5],
  ["Siddharth Rao", "siddharth.rao@example.com", "CONTACTED", "SITE", 5],
  ["Isha Desai", "isha.desai@example.com", "CONTACTED", "SITE", 4],
  ["Manish Kumar", "manish.kumar@example.com", "NEW", "WEBINAR", 3],
  ["Pooja Reddy", "pooja.reddy@example.com", "NEW", "SITE", 3],
  ["Aditya Bose", "aditya.bose@example.com", "NEW", "WEBINAR", 2],
  ["Kavya Shetty", "kavya.shetty@example.com", "NEW", "SITE", 2],
  ["Nikhil Jain", "nikhil.jain@example.com", "NEW", "WEBINAR", 1],
  ["Tanvi Kapoor", "tanvi.kapoor@example.com", "NEW", "SITE", 1],
];

async function main() {
  const workspace = await db.workspace.upsert({
    where: { id: "ws_demo" },
    update: {},
    create: { id: "ws_demo", name: "Nexus Demo Workspace" },
  });

  const users = [
    ["admin@nexus.demo", "Admin User", "ADMIN"],
    ["member@nexus.demo", "Member User", "MEMBER"],
  ];
  for (const [email, name, role] of users) {
    await db.user.upsert({
      where: { email },
      update: {},
      create: { email, name, role, passwordHash: hashPassword("demo1234"), workspaceId: workspace.id },
    });
  }

  for (const [name, email, status, source, daysAgo] of leads) {
    const createdAt = new Date(Date.now() - daysAgo * 86400000);
    const lead = await db.lead.upsert({
      where: { workspaceId_email: { workspaceId: workspace.id, email } },
      update: { name, status, source, createdAt },
      create: { workspaceId: workspace.id, name, email, status, source, createdAt },
    });

    await db.leadEvent.deleteMany({ where: { leadId: lead.id } });
    const events = [
      {
        type: "created",
        note: source === "WEBINAR" ? "Registered for a webinar" : "Submitted the website form",
        createdAt,
      },
    ];
    if (status !== "NEW") {
      events.push({
        type: "status",
        note: `Status changed to ${status}`,
        createdAt: new Date(createdAt.getTime() + 6 * 3600000),
      });
    }
    await db.leadEvent.createMany({ data: events.map((e) => ({ ...e, leadId: lead.id })) });
  }

  console.log(`Seeded workspace, ${users.length} users and ${leads.length} leads.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());