import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { getPagination } from "../utils/pagination.ts";

const prisma = new PrismaClient();

export async function listTenants(req: Request, res: Response) {
  const { propertyId } = req.query as { propertyId?: string };
  const pg = getPagination(req);
  if (!propertyId) {
    if (!pg) {
      const tenants = await prisma.tenant.findMany({ orderBy: { name: "asc" } });
      return res.json(tenants);
    }
    const [items, total] = await Promise.all([
      prisma.tenant.findMany({ orderBy: { name: "asc" }, skip: pg.skip, take: pg.take }),
      prisma.tenant.count(),
    ]);
    return res.json({ items, total, page: pg.page, pageSize: pg.pageSize });
  }
  const pid = Number(propertyId);
  const where = { contracts: { some: { unit: { propertyId: pid } } } } as const;
  if (!pg) {
    const tenants = await prisma.tenant.findMany({ where, orderBy: { name: "asc" } });
    return res.json(tenants);
  }
  const [items, total] = await Promise.all([
    prisma.tenant.findMany({ where, orderBy: { name: "asc" }, skip: pg.skip, take: pg.take }),
    prisma.tenant.count({ where }),
  ]);
  res.json({ items, total, page: pg.page, pageSize: pg.pageSize });
}
