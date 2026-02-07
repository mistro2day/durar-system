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
    const today = new Date();
    where.OR = [
      { status: 'OVERDUE' },
      {
        status: { in: ['PENDING', 'PARTIAL'] },
        dueDate: { lt: today }
      }
    ];
  } else if (status === 'upcoming') {
    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + 30);
    where.status = { in: ['PENDING', 'PARTIAL'] };
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
    payments: true,
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

  const statusMap: Record<string, string> = {
    PAID: "مدفوعة",
    PARTIAL: "سداد جزئي",
    PENDING: "مستحقة",
    OVERDUE: "متأخرة",
    CANCELLED: "ملغية",
  };

  await logActivity(prisma, req, {
    action: "INVOICE_STATUS_UPDATE",
    description: `تحديث حالة فاتورة #${id} إلى ${statusMap[status] || status}`,
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
      description: `إضافة فاتورة جديدة بقيمة ${Number(amount).toLocaleString("en-US")} ريال`,
      contractId: inv.contractId ?? null,
    });

    res.json(inv);
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "تعذر إنشاء الفاتورة" });
  }
};
export const recordPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, method, paidAt } = req.body as { amount: number; method: any; paidAt: string };

    const invoiceId = Number(id);
    const paymentAmount = Number(amount);

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });

    if (!invoice) {
      return res.status(404).json({ message: "الفاتورة غير موجودة" });
    }

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        amount: paymentAmount,
        method,
        paidAt: new Date(paidAt || Date.now()),
      },
    });

    // Calculate new status
    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0) + paymentAmount;
    let newStatus = invoice.status;

    if (totalPaid >= invoice.amount) {
      newStatus = "PAID";
    } else if (totalPaid > 0) {
      newStatus = "PARTIAL";
    }

    if (newStatus !== invoice.status) {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: newStatus },
      });
    }

    const statusMap: Record<string, string> = {
      PAID: "مدفوعة",
      PARTIAL: "سداد جزئي",
      PENDING: "مستحقة",
      OVERDUE: "متأخرة",
      CANCELLED: "ملغية",
    };

    await logActivity(prisma, req, {
      action: "PAYMENT_RECORD",
      description: `تسجيل دفعة بقيمة ${paymentAmount.toLocaleString("en-US")} ريال للفاتورة #${invoiceId}. الحالة الجديدة: ${statusMap[newStatus] || newStatus}`,
      contractId: invoice.contractId ?? null,
    });

    res.json(payment);
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "تعذر تسجيل الدفعة" });
  }
};

export const getInvoicePayments = async (req: Request, res: Response) => {
  const { id } = req.params;
  const payments = await prisma.payment.findMany({
    where: { invoiceId: Number(id) },
    orderBy: { paidAt: "desc" },
  });
  res.json(payments);
};

export const updatePayment = async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const { amount, method, paidAt } = req.body as { amount: number; method: any; paidAt: string };

    const payment = await prisma.payment.findUnique({
      where: { id: Number(paymentId) },
    });

    if (!payment) {
      return res.status(404).json({ message: "الدفعة غير موجودة" });
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: Number(paymentId) },
      data: {
        amount: Number(amount),
        method,
        paidAt: new Date(paidAt),
      },
    });

    // Re-calculate invoice status
    const invoice = await prisma.invoice.findUnique({
      where: { id: payment.invoiceId },
      include: { payments: true },
    });

    if (invoice) {
      const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
      let newStatus: any = invoice.status;

      if (totalPaid >= invoice.amount) {
        newStatus = "PAID";
      } else if (totalPaid > 0) {
        newStatus = "PARTIAL";
      } else {
        newStatus = "PENDING";
      }

      if (newStatus !== invoice.status) {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: newStatus },
        });
      }

      await logActivity(prisma, req, {
        action: "PAYMENT_UPDATE",
        description: `تحديث دفعة بقيمة ${Number(amount).toLocaleString("ar-SA")} ريال للفاتورة #${invoice.id}. الحالة: ${newStatus}`,
        contractId: invoice.contractId ?? null,
      });
    }

    res.json(updatedPayment);
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "تعذر تحديث الدفعة" });
  }
};

export const deletePayment = async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id: Number(paymentId) },
    });

    if (!payment) {
      return res.status(404).json({ message: "الدفعة غير موجودة" });
    }

    const invoiceId = payment.invoiceId;

    await prisma.payment.delete({
      where: { id: Number(paymentId) },
    });

    // Re-calculate invoice status
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });

    if (invoice) {
      const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
      let newStatus: any = invoice.status;

      if (totalPaid >= invoice.amount) {
        newStatus = "PAID";
      } else if (totalPaid > 0) {
        newStatus = "PARTIAL";
      } else {
        newStatus = "PENDING";
      }

      if (newStatus !== invoice.status) {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: newStatus },
        });
      }

      await logActivity(prisma, req, {
        action: "PAYMENT_DELETE",
        description: `حذف دفعة للفاتورة #${invoice.id}. الرصيد المتبقي: ${(invoice.amount - totalPaid).toLocaleString("ar-SA")} ريال`,
        contractId: invoice.contractId ?? null,
      });
    }

    res.json({ message: "تم حذف الدفعة بنجاح" });
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "تعذر حذف الدفعة" });
  }
};
