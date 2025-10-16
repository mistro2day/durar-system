import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { getPagination } from "../utils/pagination.ts";

const prisma = new PrismaClient();

// 🆕 إنشاء بلاغ صيانة
export const createTicket = async (req: Request, res: Response) => {
  try {
    const { unitId, description, priority } = req.body;

    const ticket = await prisma.maintenanceTicket.create({
      data: {
        unitId,
        description,
        priority,
        status: "NEW",
      },
    });

    res.json(ticket);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// 📋 عرض جميع البلاغات
export const getTickets = async (req: Request, res: Response) => {
  const { propertyId } = req.query as { propertyId?: string };
  const where: any = {};
  if (propertyId) where.unit = { propertyId: Number(propertyId) };
  const pg = getPagination(req);
  if (!pg) {
    const tickets = await prisma.maintenanceTicket.findMany({ where, include: { unit: true }, orderBy: { createdAt: "desc" } });
    return res.json(tickets);
  }
  const [items, total] = await Promise.all([
    prisma.maintenanceTicket.findMany({ where, include: { unit: true }, orderBy: { createdAt: "desc" }, skip: pg.skip, take: pg.take }),
    prisma.maintenanceTicket.count({ where }),
  ]);
  res.json({ items, total, page: pg.page, pageSize: pg.pageSize });
};

// 🔄 تحديث حالة البلاغ
export const updateTicketStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const updated = await prisma.maintenanceTicket.update({
    where: { id: Number(id) },
    data: { status },
  });

  res.json(updated);
};

// 🧰 إضافة إجراء صيانة
export const addAction = async (req: Request, res: Response) => {
  const { ticketId, actionTaken, performedBy } = req.body;

  const action = await prisma.maintenanceAction.create({
    data: { ticketId, actionTaken, performedBy },
  });

  res.json(action);
};
