import type { Request, Response } from "express";
import type { Contract, Unit, Property, Invoice } from "@prisma/client";
import { PrismaClient } from "../lib/prisma.ts";
import { getPagination } from "../utils/pagination.ts";

const prisma = new PrismaClient();

export async function listTenants(req: Request, res: Response) {
  const { propertyId } = req.query as { propertyId?: string };
  const pg = getPagination(req);
  const pid = propertyId ? Number(propertyId) : undefined;

  const where = pid
    ? {
        contracts: {
          some: { unit: { propertyId: pid } },
        },
      }
    : undefined;

  const contractFilter = pid ? { unit: { propertyId: pid } } : undefined;
  const invoiceFilter = pid ? { contract: { unit: { propertyId: pid } } } : undefined;

  const query = prisma.tenant.findMany({
    where,
    orderBy: { name: "asc" },
    ...(pg ? { skip: pg.skip, take: pg.take } : {}),
    include: {
      contracts: {
        where: contractFilter,
        include: {
          unit: { include: { property: true } },
        },
        orderBy: { startDate: "desc" },
      },
      invoices: {
        where: invoiceFilter,
        select: { id: true, status: true, amount: true, dueDate: true },
        orderBy: { dueDate: "desc" },
      },
    },
  });

  if (pg) {
    const [items, total] = await Promise.all([query, prisma.tenant.count({ where })]);
    return res.json({
      items: items.map((tenant) => enrichTenant(tenant)),
      total,
      page: pg.page,
      pageSize: pg.pageSize,
    });
  }

  const tenants = await query;
  return res.json(tenants.map((tenant) => enrichTenant(tenant)));
}

export async function getTenantById(req: Request, res: Response) {
  const { id } = req.params;
  const tenantId = Number(id);
  if (!tenantId) {
    return res.status(400).json({ message: "معرّف المستأجر غير صالح" });
  }

  const { propertyId } = req.query as { propertyId?: string };
  const pid = propertyId ? Number(propertyId) : undefined;

  const contractFilter = pid ? { unit: { propertyId: pid } } : undefined;
  const invoiceFilter = pid ? { contract: { unit: { propertyId: pid } } } : undefined;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      contracts: {
        where: contractFilter,
        include: {
          unit: { include: { property: true } },
        },
        orderBy: { startDate: "desc" },
      },
      invoices: {
        where: invoiceFilter,
        select: { id: true, status: true, amount: true, dueDate: true },
        orderBy: { dueDate: "desc" },
      },
    },
  });

  if (!tenant) {
    return res.status(404).json({ message: "المستأجر غير موجود" });
  }

  if (pid) {
    const belongsToProperty = tenant.contracts.some((contract) => contract.unit?.propertyId === pid);
    if (!belongsToProperty) {
      return res.status(404).json({ message: "المستأجر غير مرتبط بهذا العقار" });
    }
  }

  return res.json(enrichTenant(tenant));
}

export async function updateTenant(req: Request, res: Response) {
  const { id } = req.params;
  const tenantId = Number(id);
  if (!tenantId) {
    return res.status(400).json({ message: "معرّف المستأجر غير صالح" });
  }

  const data: Record<string, unknown> = {};
  const allowed = [
    "name",
    "phone",
    "email",
    "nationalId",
    "birthDate",
    "gender",
    "nationality",
    "address",
    "city",
    "country",
    "employer",
    "emergencyContactName",
    "emergencyContactPhone",
    "notes",
  ] as const;

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      data[key] = req.body[key];
    }
  }

  if (data.birthDate) {
    const dt = new Date(String(data.birthDate));
    if (Number.isNaN(dt.getTime())) {
      return res.status(400).json({ message: "تاريخ الميلاد غير صالح" });
    }
    data.birthDate = dt;
  }

  try {
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data,
    });
    res.json({ message: "تم تحديث بيانات المستأجر بنجاح", tenant: updated });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return res.status(409).json({ message: "الهوية الوطنية مستخدمة بالفعل" });
    }
    res.status(500).json({ message: e?.message || "تعذر تحديث المستأجر" });
  }
}

export async function deleteTenant(req: Request, res: Response) {
  const { id } = req.params;
  const tenantId = Number(id);
  if (!tenantId) {
    return res.status(400).json({ message: "معرّف المستأجر غير صالح" });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.contract.deleteMany({ where: { tenantId } });
      await tx.invoice.deleteMany({ where: { tenantId } });
      await tx.booking.deleteMany({ where: { tenantId } });
      await tx.tenant.delete({ where: { id: tenantId } });
    });
    res.json({ message: "تم حذف المستأجر بنجاح" });
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "تعذر حذف المستأجر" });
  }
}

type TenantWithRelations = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  nationalId: string | null;
  birthDate: Date | null;
  gender: string | null;
  nationality: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  employer: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notes: string | null;
  createdAt: Date;
  contracts: Array<Contract & { unit: (Unit & { property: Property | null }) | null }>;
  invoices: Array<Pick<Invoice, "id" | "status" | "amount" | "dueDate">>;
};

function enrichTenant(tenant: TenantWithRelations) {
  const { contracts, invoices, birthDate, createdAt, ...rest } = tenant;

  const activeContracts = contracts.filter((c) => c.status === "ACTIVE");
  const latestContract = contracts[0] || null;
  const pendingInvoices = invoices.filter((inv) => inv.status === "PENDING");
  const receivables = pendingInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const lastInvoice = invoices[0] || null;

  const contractPayload = contracts.map((contract) => ({
    id: contract.id,
    status: contract.status,
    rentalType: contract.rentalType,
    startDate: contract.startDate.toISOString(),
    endDate: contract.endDate.toISOString(),
    unitNumber: contract.unit?.number || (contract.unit as any)?.unitNumber || null,
    propertyName: contract.unit?.property?.name || null,
    propertyId: contract.unit?.propertyId ?? null,
    rentAmount: contract.rentAmount,
    amount: contract.amount,
    deposit: contract.deposit ?? null,
    ejarContractNumber: contract.ejarContractNumber || null,
    paymentMethod: contract.paymentMethod || null,
    paymentFrequency: contract.paymentFrequency || null,
    servicesIncluded: contract.servicesIncluded || null,
    notes: contract.notes || null,
  }));

  const invoicePayload = invoices.map((invoice) => ({
    id: invoice.id,
    status: invoice.status,
    amount: invoice.amount,
    dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
  }));

  return {
    ...rest,
    birthDate: birthDate ? birthDate.toISOString() : null,
    createdAt: createdAt.toISOString(),
    stats: {
      totalContracts: contracts.length,
      activeContracts: activeContracts.length,
      totalInvoices: invoices.length,
      pendingInvoices: pendingInvoices.length,
      lastInvoiceDueDate: lastInvoice?.dueDate ? lastInvoice.dueDate.toISOString() : null,
      receivables,
      latestContract: latestContract
        ? {
            id: latestContract.id,
            status: latestContract.status,
            rentalType: latestContract.rentalType,
            startDate: latestContract.startDate.toISOString(),
            endDate: latestContract.endDate.toISOString(),
            unitNumber: latestContract.unit?.number || (latestContract.unit as any)?.unitNumber || null,
            propertyName: latestContract.unit?.property?.name || null,
            propertyId: latestContract.unit?.propertyId ?? null,
            rentAmount: latestContract.rentAmount,
            amount: latestContract.amount,
            deposit: latestContract.deposit ?? null,
            ejarContractNumber: latestContract.ejarContractNumber || null,
            paymentMethod: latestContract.paymentMethod || null,
            paymentFrequency: latestContract.paymentFrequency || null,
            servicesIncluded: latestContract.servicesIncluded || null,
            notes: latestContract.notes || null,
          }
        : null,
    },
    recentContracts: contractPayload.slice(0, 3),
    contracts: contractPayload,
    invoices: invoicePayload,
  };
}


