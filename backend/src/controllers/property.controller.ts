import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function listProperties(req: Request, res: Response) {
  const { type } = req.query as { type?: string };
  const where: any = {};
  if (type) where.type = String(type).toUpperCase();
  const properties = await prisma.property.findMany({
    where,
    orderBy: { name: "asc" },
    include: { _count: { select: { units: true } } },
  });
  // أضف عدادات المستأجرين والفواتير لكل عقار
  const results = [] as any[];
  for (const p of properties) {
    const tenantsCount = await prisma.tenant.count({
      where: { contracts: { some: { unit: { propertyId: p.id } } } },
    });
    const invoicesCount = await prisma.invoice.count({
      where: { contract: { is: { unit: { propertyId: p.id } } } },
    });
    results.push({ ...p, tenantsCount, invoicesCount });
  }
  res.json(results);
}

// جلب عقار محدد
export async function getProperty(req: Request, res: Response) {
  const { id } = req.params;
  const p = await prisma.property.findUnique({ where: { id: Number(id) } });
  if (!p) return res.status(404).json({ message: "العقار غير موجود" });
  res.json(p);
}

// إنشاء عقار جديد (يدعم إنشاء وحدات اختيارياً)
export async function createProperty(req: Request, res: Response) {
  try {
    const { name, type, address, units } = req.body as any;
    if (!name) return res.status(400).json({ message: "الاسم مطلوب" });
    const data: any = {
      name,
      type: (type || 'BUILDING').toUpperCase(),
      address: address || null,
    };
    // وحدات اختيارية: يمكن إرسال مصفوفة من الأسماء أو كائنات فيها number,floor,...
    if (Array.isArray(units) && units.length) {
      const createUnits = units.map((u: any) => {
        const number = typeof u === 'string' ? u : (u?.number ?? u?.unitNumber);
        return {
          number: String(number),
          type: ((typeof u === 'object' && u?.type) ? String(u.type).toUpperCase() : 'MONTHLY'),
          status: 'AVAILABLE',
          floor: (typeof u === 'object' && u?.floor != null) ? Number(u.floor) : undefined,
          rooms: (typeof u === 'object' && u?.rooms != null) ? Number(u.rooms) : undefined,
          baths: (typeof u === 'object' && u?.baths != null) ? Number(u.baths) : undefined,
          area: (typeof u === 'object' && u?.area != null) ? Number(u.area) : undefined,
        };
      });
      data.units = { create: createUnits };
    }
    const created = await prisma.property.create({ data });
    res.json(created);
  } catch (e: any) {
    res.status(500).json({ message: e?.message || 'تعذر إنشاء العقار' });
  }
}

// تحديث عقار
export async function updateProperty(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, type, address } = req.body as any;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (type !== undefined) data.type = String(type).toUpperCase();
    if (address !== undefined) data.address = address;
    const updated = await prisma.property.update({ where: { id: Number(id) }, data });
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ message: e?.message || 'تعذر تحديث العقار' });
  }
}
