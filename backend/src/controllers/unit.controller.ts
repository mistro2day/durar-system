import type { Request, Response } from "express";
import { PrismaClient } from "../lib/prisma.ts";
import { getPagination } from "../utils/pagination.ts";

const prisma = new PrismaClient();

// ✅ عرض جميع الوحدات
export const getUnits = async (req: Request, res: Response) => {
  const { propertyId } = req.query as { propertyId?: string };
  const where: any = {};
  if (propertyId) where.propertyId = Number(propertyId);
  const pg = getPagination(req);
  if (!pg) {
    const units = await prisma.unit.findMany({ where, include: { property: true } });
    return res.json(units);
  }
  const [items, total] = await Promise.all([
    prisma.unit.findMany({ where, include: { property: true }, skip: pg.skip, take: pg.take, orderBy: { id: "desc" } }),
    prisma.unit.count({ where }),
  ]);
  res.json({ items, total, page: pg.page, pageSize: pg.pageSize });
};

// ✅ عرض وحدة محددة
export const getUnitById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const unit = await prisma.unit.findUnique({
    where: { id: Number(id) },
    include: {
      property: true,
      contracts: true,
      maintenance: {
        include: { actions: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!unit) return res.status(404).json({ message: "الوحدة غير موجودة" });
  res.json(unit);
};

// ✅ إنشاء وحدة جديدة
export const createUnit = async (req: Request, res: Response) => {
  try {
    const { unitNumber, type, rentalType, status, propertyId, floor, rooms, baths, area } = req.body;
    const unit = await prisma.unit.create({
      data: {
        number: unitNumber || req.body.number,
        type,
        status,
        propertyId,
        // حقول إضافية اختيارية
        floor: floor !== undefined ? Number(floor) : undefined,
        rooms: rooms !== undefined ? Number(rooms) : undefined,
        baths: baths !== undefined ? Number(baths) : undefined,
        area: area !== undefined ? Number(area) : undefined,
      },
    });
    res.json(unit);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ تحديث بيانات وحدة
export const updateUnit = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { unitNumber, type, rentalType, status, floor, rooms, baths, area, number } = req.body;
  const updated = await prisma.unit.update({
    where: { id: Number(id) },
    data: {
      number: unitNumber || number,
      type,
      status,
      floor: floor !== undefined ? Number(floor) : undefined,
      rooms: rooms !== undefined ? Number(rooms) : undefined,
      baths: baths !== undefined ? Number(baths) : undefined,
      area: area !== undefined ? Number(area) : undefined,
    },
  });
  res.json(updated);
};

// 📥 استيراد وحدات من CSV (نفس قالب التصدير)
// الأعمدة المتوقعة: Property,Unit,Status,Type,Rental,Floor,Rooms,Baths,Area
export const importUnitsCsv = async (req: Request, res: Response) => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ message: "الرجاء رفع ملف CSV" });
    const text = file.buffer.toString("utf8");

    function parseCsv(input: string): string[][] {
      const rows: string[][] = [];
      let i = 0, field = '', row: string[] = [], inQuotes = false;
      while (i < input.length) {
        const ch = input[i];
        if (ch === '"') {
          if (inQuotes && input[i+1] === '"') { field += '"'; i += 2; continue; }
          inQuotes = !inQuotes; i++; continue;
        }
        if (!inQuotes && (ch === ',')) { row.push(field.trim()); field = ''; i++; continue; }
        if (!inQuotes && (ch === '\n' || ch === '\r')) {
          if (field.length || row.length) { row.push(field.trim()); rows.push(row); }
          field=''; row=[]; while (i < input.length && (input[i]==='\n'||input[i]==='\r')) i++; continue;
        }
        field += ch; i++;
      }
      if (field.length || row.length) { row.push(field.trim()); rows.push(row); }
      return rows.filter(r=>r.some(c=>c!==''));
    }

    const rows = parseCsv(text);
    if (!rows.length) return res.json({ imported: 0, updated: 0, errors: ["ملف فارغ"] });
    const header = rows.shift()!.map(h => h.replace(/\ufeff/g,'').trim().toLowerCase());
    const findIdx = (...names: string[]) => {
      for (const n of names) {
        const i = header.indexOf(n.toLowerCase());
        if (i >= 0) return i;
      }
      return -1;
    };
    // دعم العربية والإنجليزية في أسماء الأعمدة
    const iProp = findIdx('property','العقار');
    const iUnit = findIdx('unit','الوحدة');
    const iStatus = findIdx('status','الحالة');
    const iType = findIdx('type','النوع');
    const iFloor = findIdx('floor','الدور');
    const iRooms = findIdx('rooms','الغرف');
    const iBaths = findIdx('baths','الحمامات');
    const iArea = findIdx('area','المساحة');
    if (iUnit < 0) return res.status(400).json({ message: "الملف لا يحتوي على عمود 'الوحدة'" });

    let imported = 0, updated = 0;
    const errors: string[] = [];

    function normStatus(s?: string) {
      if (!s) return undefined;
      const v = s.trim().toUpperCase();
      const map: Record<string,string> = {
        'AVAILABLE': 'AVAILABLE', 'متاحة': 'AVAILABLE',
        'OCCUPIED': 'OCCUPIED', 'مشغولة': 'OCCUPIED',
        'MAINTENANCE': 'MAINTENANCE', 'صيانة': 'MAINTENANCE',
      };
      return map[v] as any;
    }
    function normType(s?: string) {
      if (!s) return undefined;
      const v = s.trim().toUpperCase();
      const map: Record<string,string> = {
        'DAILY': 'DAILY', 'يومي': 'DAILY',
        'MONTHLY': 'MONTHLY', 'شهري': 'MONTHLY',
      };
      return map[v] as any;
    }

    for (const r of rows) {
      try {
        const unitNumber = r[iUnit];
        if (!unitNumber) { errors.push('سطر بدون رقم/اسم وحدة'); continue; }
        const propName = iProp >= 0 ? r[iProp] : '';
        let propertyId: number | undefined = undefined;
        if (propName) {
          const prop = await prisma.property.findFirst({ where: { name: propName } });
          if (!prop) { errors.push(`عقار غير موجود: ${propName}`); continue; }
          propertyId = prop.id;
        }

        const status = normStatus(iStatus>=0 ? r[iStatus] : undefined);
        const type = normType(iType>=0 ? r[iType] : (iType<0 && iFloor<0 && iRooms<0 && iBaths<0 && iArea<0 && (iStatus<0) ? undefined : undefined));
        const floor = iFloor>=0 && r[iFloor]!=='' ? Number(r[iFloor]) : undefined;
        const rooms = iRooms>=0 && r[iRooms]!=='' ? Number(r[iRooms]) : undefined;
        const baths = iBaths>=0 && r[iBaths]!=='' ? Number(r[iBaths]) : undefined;
        const area = iArea>=0 && r[iArea]!=='' ? Number(r[iArea]) : undefined;

        // ابحث عن الوحدة حسب (propertyId, number) إن توفر العقار؛ وإلا حسب number فقط
        const where: any = propertyId ? { number: unitNumber, propertyId } : { number: unitNumber };
        const existing = await prisma.unit.findFirst({ where });
        if (!existing) {
          if (!propertyId) { errors.push(`لا يمكن إنشاء وحدة ${unitNumber} بدون عمود العقار`); continue; }
          await prisma.unit.create({
            data: { number: unitNumber, propertyId, ...(status?{status}:{}), ...(type?{type}:{}), floor, rooms, baths, area }
          });
          imported++;
        } else {
          const data: any = { floor, rooms, baths, area };
          if (status) data.status = status;
          if (type) data.type = type;
          await prisma.unit.update({ where: { id: existing.id }, data });
          updated++;
        }
      } catch (e: any) {
        errors.push(e?.message || 'خطأ غير معروف');
      }
    }

    res.json({ imported, updated, errors });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ message: e?.message || 'فشل استيراد CSV' });
  }
};

// ✅ حذف وحدة
export const deleteUnit = async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.unit.delete({ where: { id: Number(id) } });
  res.json({ message: "تم حذف الوحدة بنجاح ✅" });
};

// 🗑️ حذف جميع وحدات عقار محدد (مع العلاقات التابعة)
export const deleteUnitsByProperty = async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params as any;
    const pid = Number(propertyId);
    if (!pid) return res.status(400).json({ message: "propertyId غير صالح" });

    const unitRows = await prisma.unit.findMany({ where: { propertyId: pid }, select: { id: true } });
    const unitIds = unitRows.map(u => u.id);
    if (!unitIds.length) return res.json({ deletedUnits: 0, message: "لا توجد وحدات لهذا العقار" });

    // اجمع عقود الوحدات
    const contractRows = await prisma.contract.findMany({ where: { unitId: { in: unitIds } }, select: { id: true } });
    const contractIds = contractRows.map(c => c.id);

    // اجمع فواتير العقود
    const invoiceRows = contractIds.length ? await prisma.invoice.findMany({ where: { contractId: { in: contractIds } }, select: { id: true } }) : [];
    const invoiceIds = invoiceRows.map(i => i.id);

    // الترتيب: Actions -> Tickets -> Bookings -> Payments -> Invoices -> Contracts -> Units
    const ticketRows = await prisma.maintenanceTicket.findMany({ where: { unitId: { in: unitIds } }, select: { id: true } });
    const ticketIds = ticketRows.map(t => t.id);

    await prisma.$transaction([
      // Maintenance
      prisma.maintenanceAction.deleteMany({ where: { ticketId: { in: ticketIds } } }),
      prisma.maintenanceTicket.deleteMany({ where: { id: { in: ticketIds } } }),
      // Bookings
      prisma.booking.deleteMany({ where: { unitId: { in: unitIds } } }),
      // Payments -> Invoices
      prisma.payment.deleteMany({ where: { invoiceId: { in: invoiceIds } } }),
      prisma.invoice.deleteMany({ where: { id: { in: invoiceIds } } }),
      // Contracts
      prisma.contract.deleteMany({ where: { id: { in: contractIds } } }),
      // Units
      prisma.unit.deleteMany({ where: { id: { in: unitIds } } }),
    ]);

    res.json({ deletedUnits: unitIds.length, deletedContracts: contractIds.length, deletedInvoices: invoiceIds.length, deletedTickets: ticketIds.length });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ message: e?.message || 'تعذر حذف الوحدات' });
  }
};
