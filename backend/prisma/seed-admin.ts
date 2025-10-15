import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@durar.local";
  const password = process.env.ADMIN_PASSWORD || "Admin@123";

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hashed, role: "ADMIN" },
    create: {
      name: "مدير درر",
      email,
      password: hashed,
      role: "ADMIN",
    },
  });

  console.log("✅ Admin user ready:", { email: user.email, role: user.role });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

