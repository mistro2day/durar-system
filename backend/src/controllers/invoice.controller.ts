import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { logActivity } from "../utils/activity-log.js";
import { getPagination } from "../utils/pagination.js";


export const getInvoices = async (req: Request, res: Response) => {
  const { propertyId, status } = req.query as { propertyId?: string; status?: string };
  const where: any = {};

  if (propertyId) {
    where.contract = { is: { unit: { propertyId: Number(propertyId) } } };
  }

  if (status === 'overdue') {
    where.status = 'PENDING';
    where.dueDate = { lt: new Date() };
  } else if (status === 'upcoming') {
    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + 30);
    where.status = 'PENDING';
    where.dueDate = { gte: today, lte: future };
  } else if (status) {
    where.status = status.toUpperCase();
  }
  const pg = getPagination(req);
  const include = {
    contract: {
      include: {
        unit: {
          include: {
            property: true,
          },
        },
        tenant: true,
      },
    },
    tenant: true,
  } as const;
  if (!pg) {
    const invoices = await prisma.invoice.findMany({ where, include, orderBy: { dueDate: "asc" } });
    return res.json(invoices);
  }
  const [items, total] = await prisma.$transaction([
    prisma.invoice.findMany({
      where,
      include,
      orderBy: { dueDate: "asc" },
      skip: pg.skip,
      take: pg.take,
    }),
    prisma.invoice.count({ where }),
  ]);
  res.json({ items, total, page: pg.page, pageSize: pg.pageSize });
};

export const updateInvoiceStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const invoice = await prisma.invoice.update({
    where: { id: Number(id) },
    data: { status },
  });

  await logActivity(prisma, req, {
    action: "INVOICE_STATUS_UPDATE",
    description: `تحديث حالة فاتورة #${id} إلى ${status}`,
    contractId: invoice.contractId ?? null,
  });

  res.json(invoice);
};

export const createInvoice = async (req: Request, res: Response) => {
  try {
    const { contractId, tenantId, amount, dueDate, status } = req.body as any;
    const data: any = {
      amount: Number(amount),
      dueDate: new Date(dueDate || Date.now()),
      status: status || "PENDING",
    };
    if (contractId) data.contractId = Number(contractId);
    if (tenantId) data.tenantId = Number(tenantId);
    const inv = await prisma.invoice.create({ data });

    await logActivity(prisma, req, {
      action: "INVOICE_CREATE",
      description: `إضافة فاتورة جديدة بقيمة ${Number(amount).toLocaleString("ar-SA")} ريال`,
      contractId: inv.contractId ?? null,
    });

    res.json(inv);
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "تعذر إنشاء الفاتورة" });
  }
};
