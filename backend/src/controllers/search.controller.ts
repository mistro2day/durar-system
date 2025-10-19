import type { Request, Response } from "express";
import prisma from "../lib/prisma.ts";


type SearchResult = {
  id: string;
  type: "tenant" | "contract" | "unit" | "property";
  title: string;
  subtitle?: string;
  href: string;
};

const PER_SECTION_LIMIT = 5;

export async function globalSearch(req: Request, res: Response) {
  try {
    const { q } = req.query as { q?: string };
    const term = (q || "").trim();
    if (!term) {
      return res.json([]);
    }

    const contains = { contains: term, mode: "insensitive" as const };

    const [tenants, contracts, units, properties] = await prisma.$transaction([
      prisma.tenant.findMany({
        where: {
          OR: [
            { name: contains },
            { phone: contains },
            { email: contains },
            { nationalId: contains },
          ],
        },
        take: PER_SECTION_LIMIT,
        orderBy: { createdAt: "desc" },
        include: {
          contracts: {
            orderBy: { startDate: "desc" },
            take: 1,
            include: {
              unit: {
                include: {
                  property: true,
                },
              },
            },
          },
        },
      }),
      prisma.contract.findMany({
        where: {
          OR: [
            { tenantName: contains },
            { tenant: { name: contains } },
            { unit: { number: contains } },
            { unit: { property: { name: contains } } },
          ],
        },
        take: PER_SECTION_LIMIT,
        orderBy: { createdAt: "desc" },
        include: {
          tenant: true,
          unit: { include: { property: true } },
        },
      }),
      prisma.unit.findMany({
        where: {
          OR: [
            { number: contains },
            { property: { name: contains } },
          ],
        },
        take: PER_SECTION_LIMIT,
        orderBy: { createdAt: "desc" },
        include: { property: true },
      }),
      prisma.property.findMany({
        where: {
          OR: [
            { name: contains },
            { address: contains },
          ],
        },
        take: PER_SECTION_LIMIT,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const results: SearchResult[] = [];

    for (const tenant of tenants) {
      const latestContract = tenant.contracts[0] ?? null;
      const unit = latestContract?.unit ?? null;
      const property = unit?.property ?? null;
      const subtitleParts = [
        tenant.phone ? `جوال ${tenant.phone}` : null,
        unit ? `وحدة ${unit.number}` : null,
        property?.name ? `عقار ${property.name}` : null,
      ].filter(Boolean) as string[];
      const propertyId = property?.id ?? unit?.propertyId ?? null;
      results.push({
        id: `tenant-${tenant.id}`,
        type: "tenant",
        title: tenant.name,
        subtitle: subtitleParts.length ? subtitleParts.join(" • ") : undefined,
        href: propertyId ? `/hotel/${propertyId}/tenants/${tenant.id}` : `/contracts`,
      });
    }

    for (const contract of contracts) {
      const unit = contract.unit;
      const property = unit?.property;
      results.push({
        id: `contract-${contract.id}`,
        type: "contract",
        title: contract.tenantName || contract.tenant?.name || `#${contract.id}`,
        subtitle: [
          unit ? `وحدة ${unit.number}` : null,
          property?.name ? `عقار ${property.name}` : null,
        ]
          .filter(Boolean)
          .join(" • "),
        href: `/contracts?editId=${contract.id}`,
      });
    }

    for (const unit of units) {
      const property = unit.property;
      results.push({
        id: `unit-${unit.id}`,
        type: "unit",
        title: `وحدة ${unit.number}`,
        subtitle: property?.name ? `ضمن ${property.name}` : undefined,
        href: `/units/${unit.id}`,
      });
    }

    for (const property of properties) {
      results.push({
        id: `property-${property.id}`,
        type: "property",
        title: property.name,
        subtitle: property.address || undefined,
        href: `/hotel/${property.id}/dashboard`,
      });
    }

    res.json(results.slice(0, 15));
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "تعذر تنفيذ البحث" });
  }
}
