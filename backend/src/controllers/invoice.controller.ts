import type { Request, Response } from "express";
import { PrismaClient } from "../lib/prisma.ts";
import { getPagination } from "../utils/pagination.ts";

const prisma = new PrismaClient();

export const getInvoices = async (req: Request, res: Response) => {
  const { propertyId } = req.query as { propertyId?: string };
  const where: any = {};
  if (propertyId) {
    where.contract = { is: { unit: { propertyId: Number(propertyId) } } };
  }
  const pg = getPagination(req);
  if (!pg) {
    const invoices = await prisma.invoice.findMany({ where, include: { contract: true }, orderBy: { dueDate: "asc" } });
    return res.json(invoices);
  }
  const [items, total] = await Promise.all([
    prisma.invoice.findMany({ where, include: { contract: true }, orderBy: { dueDate: "asc" }, skip: pg.skip, take: pg.take }),
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
    res.json(inv);
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "تعذر إنشاء الفاتورة" });
  }
};
