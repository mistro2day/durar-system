import prisma from "../lib/prisma.ts";
import type { Request, Response } from "express";


type ActivityFilters = {
  page?: string;
  limit?: string;
  search?: string;
  action?: string;
  userId?: string;
  propertyId?: string;
  from?: string;
  to?: string;
};

export async function listActivityLogs(req: Request, res: Response) {
  try {
    const {
      page = "1",
      limit = "25",
      search,
      action,
      userId,
      propertyId,
      from,
      to,
    } = req.query as ActivityFilters;

    const take = Math.min(100, Math.max(1, Number(limit) || 25));
    const currentPage = Math.max(1, Number(page) || 1);
    const skip = (currentPage - 1) * take;

    const where: any = {};

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { action: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { user: { name: { contains: term, mode: "insensitive" } } },
      ];
    }

    if (action && action !== "all") {
      where.action = action;
    }

    if (userId) {
      const parsedUserId = Number(userId);
      if (!Number.isNaN(parsedUserId)) {
        where.userId = parsedUserId;
      }
    }

    if (propertyId) {
      const parsedPropertyId = Number(propertyId);
      if (!Number.isNaN(parsedPropertyId)) {
        where.contract = {
          unit: {
            propertyId: parsedPropertyId,
          },
        };
      }
    }

    if (from || to) {
      where.createdAt = {};
      if (from) {
        const fromDate = new Date(from);
        if (!Number.isNaN(fromDate.getTime())) {
          where.createdAt.gte = fromDate;
        }
      }
      if (to) {
        const toDate = new Date(to);
        if (!Number.isNaN(toDate.getTime())) {
          // include the entire day
          toDate.setHours(23, 59, 59, 999);
          where.createdAt.lte = toDate;
        }
      }
      if (Object.keys(where.createdAt).length === 0) {
        delete where.createdAt;
      }
    }

    const [items, total, distinctActions] = await prisma.$transaction([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true,
              email: true,
            },
          },
          contract: {
            select: {
              id: true,
              unit: {
                select: {
                  id: true,
                  number: true,
                  property: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        distinct: ["action"],
        select: { action: true },
        orderBy: { action: "asc" },
      }),
    ]);

    const actions = distinctActions
      .map((item) => item.action)
      .filter((val): val is string => Boolean(val));

    res.json({
      items: items.map((item) => ({
        id: item.id,
        action: item.action,
        description: item.description,
        createdAt: item.createdAt,
        user: item.user
          ? {
              id: item.user.id,
              name: item.user.name,
              role: item.user.role,
              email: item.user.email,
            }
          : null,
        contract: item.contract
          ? {
              id: item.contract.id,
              unitNumber: item.contract.unit?.number ?? null,
              propertyName: item.contract.unit?.property?.name ?? null,
            }
          : null,
      })),
      pagination: {
        page: currentPage,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
      actions,
    });
  } catch (error: any) {
    console.error("❌ Failed to load activity logs:", error);
    res.status(500).json({ message: "تعذر تحميل سجل النشاطات" });
  }
}

