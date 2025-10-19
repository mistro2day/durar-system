import { PrismaClient, ContractStatus, InvoiceStatus, PaymentMethod, PropertyType, UnitStatus, UnitType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const property = await prisma.property.upsert({
    where: { name: "عمارة الجدوى" },
    update: {},
    create: { name: "عمارة الجدوى", type: PropertyType.BUILDING },
  });

  const unit = await prisma.unit.upsert({
    where: {
      propertyId_number: {
        propertyId: property.id,
        number: "مكتب 11",
      },
    } as any,
    update: { status: UnitStatus.OCCUPIED, type: UnitType.YEARLY },
    create: { number: "مكتب 11", propertyId: property.id, status: UnitStatus.OCCUPIED, type: UnitType.YEARLY },
  });

  let tenant = await prisma.tenant.findFirst({ where: { phone: "0509466667" } });
  if (tenant) {
    tenant = await prisma.tenant.update({ where: { id: tenant.id }, data: { name: "مؤسسة افكار بتال للملتقيات والمعارض" } });
  } else {
    tenant = await prisma.tenant.create({ data: { name: "مؤسسة افكار بتال للملتقيات والمعارض", phone: "0509466667" } });
  }

  const existing = await prisma.contract.findMany({
    where: { unitId: unit.id },
    include: { invoices: { include: { payments: true } } },
  });
  for (const c of existing) {
    for (const inv of c.invoices) {
      await prisma.payment.deleteMany({ where: { invoiceId: inv.id } });
      await prisma.invoice.delete({ where: { id: inv.id } });
    }
    await prisma.contract.delete({ where: { id: c.id } });
  }

  const schedule = [
    { due: "2024-07-18", amount: 9487, payments: [{ amount: 9487, date: "2024-07-21" }] },
    { due: "2024-10-20", amount: 9487, payments: [{ amount: 9487, date: "2024-10-20" }] },
    { due: "2025-01-20", amount: 9487, payments: [{ amount: 9487, date: "2025-03-02" }] },
    { due: "2025-04-20", amount: 9487, payments: [{ amount: 9487, date: "2025-04-27" }] },
    { due: "2025-07-20", amount: 9487, payments: [{ amount: 9487, date: "2025-07-22" }] },
    { due: "2025-10-20", amount: 9487, payments: [] },
  ];

  const contractAmount = schedule.reduce((sum, item) => sum + item.amount, 0);

  const contract = await prisma.contract.create({
    data: {
      tenantId: tenant.id,
      unitId: unit.id,
      startDate: new Date("2024-04-20T00:00:00Z"),
      endDate: new Date("2026-01-19T00:00:00Z"),
      rentAmount: 33000,
      amount: contractAmount,
      status: ContractStatus.ACTIVE,
      rentalType: "الكتروني",
      tenantName: "مؤسسة افكار بتال للملتقيات والمعارض",
      deposit: 0,
      paymentMethod: "أقساط ربع سنوية",
      paymentFrequency: "ربع سنوي",
      autoInvoice: true,
    },
  });

  for (const item of schedule) {
    const invoice = await prisma.invoice.create({
      data: {
        contractId: contract.id,
        tenantId: tenant.id,
        amount: item.amount,
        dueDate: new Date(item.due + "T00:00:00Z"),
        status: item.payments?.length ? InvoiceStatus.PAID : InvoiceStatus.PENDING,
      },
    });

    if (item.payments) {
      for (const pay of item.payments) {
        await prisma.payment.create({
          data: {
            invoiceId: invoice.id,
            amount: pay.amount,
            method: PaymentMethod.BANK_TRANSFER,
            paidAt: new Date(pay.date + "T00:00:00Z"),
          },
        });
      }
    }
  }

  console.log("✅ تم تسجيل عقد مكتب 11 في عمارة الجدوى");
}

main()
  .catch((error) => {
    console.error("❌ فشل إدخال مكتب 11:", error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
