import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function listTenants(req: Request, res: Response) {
  const { propertyId } = req.query as { propertyId?: string };
  if (!propertyId) {
    const tenants = await prisma.tenant.findMany({ orderBy: { name: "asc" } });
    return res.json(tenants);
  }
  const pid = Number(propertyId);
  // المستأجرون الذين لديهم عقود مرتبطة بوحدات في هذا العقار
  const tenants = await prisma.tenant.findMany({
    where: {
      contracts: { some: { unit: { propertyId: pid } } },
    },
    orderBy: { name: "asc" },
  });
  res.json(tenants);
}

