import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // 🏢 إنشاء العقارات
  const hotel = await prisma.property.upsert({
    where: { name: "فندق درر للخدمات العقارية" },
    update: {},
    create: {
      name: "فندق درر للخدمات العقارية",
      type: "HOTEL",
      address: "الباحة - طريق الملك عبدالعزيز",
    },
  });

  const building1 = await prisma.property.upsert({
    where: { name: "عمارة الجدوى" },
    update: {},
    create: {
      name: "عمارة الجدوى",
      type: "BUILDING",
      address: "الجدوى - الباحة",
    },
  });

  const building2 = await prisma.property.upsert({
    where: { name: "عمارة السلامة" },
    update: {},
    create: {
      name: "عمارة السلامة",
      type: "BUILDING",
      address: "السلامة - الباحة",
    },
  });

  const shops = await prisma.property.upsert({
    where: { name: "المحلات التجارية - السوق" },
    update: {},
    create: {
      name: "المحلات التجارية - السوق",
      type: "COMMERCIAL",
      address: "وسط الباحة - السوق الرئيسي",
    },
  });

  // 🏨 وحدات الفندق
  for (let i = 1; i <= 42; i++) {
    await prisma.unit.create({
      data: {
        number: `${i < 10 ? "10" + i : i}`,
        type: i <= 40 ? "DAILY" : "MONTHLY",
        status: "AVAILABLE",
        propertyId: hotel.id,
      },
    });
  }
  console.log("✅ تمت إضافة 42 شقة لفندق درر بنجاح!");

  // 🏢 مكاتب الجدوى
  for (let i = 1; i <= 25; i++) {
    await prisma.unit.create({
      data: {
        number: `Office-${i}`,
        type: "YEARLY",
        status: "AVAILABLE",
        propertyId: building1.id,
      },
    });
  }
  console.log("🏢 تمت إضافة 25 مكتب في عمارة الجدوى بنجاح!");

  // 🏠 شقق السلامة
  for (let i = 1; i <= 7; i++) {
    await prisma.unit.create({
      data: {
        number: `S-${i}`,
        type: "YEARLY",
        status: "AVAILABLE",
        propertyId: building2.id,
      },
    });
  }
  console.log("🏠 تمت إضافة 7 شقق في عمارة السلامة بنجاح!");

  // 🏬 المحلات التجارية
  for (let i = 1; i <= 10; i++) {
    await prisma.unit.create({
      data: {
        number: `Shop-${i}`,
        type: "YEARLY",
        status: "AVAILABLE",
        propertyId: shops.id,
      },
    });
  }
  console.log("🛍️ تمت إضافة 10 محلات تجارية في السوق بنجاح!");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
