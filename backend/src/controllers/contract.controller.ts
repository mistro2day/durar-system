import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { getPagination } from "../utils/pagination.ts";

const prisma = new PrismaClient();

// 📝 إنشاء عقد جديد + إنشاء المستأجر تلقائيًا + إصدار أول فاتورة
export const createContract = async (req: Request, res: Response) => {
  try {
    const { tenantName, unitId, startDate, endDate, amount, rentAmount, rentalType } = req.body;

    // 🔍 تحقق من وجود الوحدة
    const unit = await prisma.unit.findUnique({ where: { id: Number(unitId) } });
    if (!unit) {
      return res.status(404).json({ message: "الوحدة غير موجودة" });
    }

    // 🔍 البحث عن المستأجر أو إنشاؤه
    let tenant = await prisma.tenant.findFirst({ where: { name: tenantName } });
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: { name: tenantName, phone: "0000000000" },
      });
    }

    // ✅ إنشاء العقد
    const contract = await prisma.contract.create({
      data: {
        tenantName,
        tenantId: tenant.id,
        unitId: Number(unitId),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        amount: Number(amount),
        rentAmount: Number(rentAmount) || Number(amount),
        status: "ACTIVE",
        rentalType,
      },
      include: { unit: true, tenant: true },
    });

    // 💵 إنشاء أول فاتورة تلقائيًا
    const invoice = await prisma.invoice.create({
      data: {
        tenantId: tenant.id,
        contractId: contract.id,
        amount: Number(rentAmount) || Number(amount),
        dueDate: new Date(startDate),
        status: "PENDING",
      },
    });

    res.json({
      message: "✅ تم إنشاء العقد والفاتورة الأولى بنجاح",
      contract,
      invoice,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// 📄 عرض جميع العقود
export const getContracts = async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.query as { propertyId?: string };
    const where: any = {};
    if (propertyId) {
      where.unit = { propertyId: Number(propertyId) };
    }
    const pg = getPagination(req);
    if (!pg) {
      const contracts = await prisma.contract.findMany({ where, include: { unit: true, tenant: true }, orderBy: { createdAt: "desc" } });
      return res.json(contracts);
    }
    const [items, total] = await Promise.all([
      prisma.contract.findMany({ where, include: { unit: true, tenant: true }, orderBy: { createdAt: "desc" }, skip: pg.skip, take: pg.take }),
      prisma.contract.count({ where }),
    ]);
    res.json({ items, total, page: pg.page, pageSize: pg.pageSize });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ✏️ تعديل عقد
export const updateContract = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, amount, rentAmount, rentalType, status } = req.body;

    const contract = await prisma.contract.update({
      where: { id: Number(id) },
      data: {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        amount: amount ? Number(amount) : undefined,
        rentAmount: rentAmount ? Number(rentAmount) : undefined,
        rentalType,
        status,
      },
    });

    res.json({ message: "✅ تم تحديث بيانات العقد بنجاح", contract });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 🗑️ حذف عقد
export const deleteContract = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const contract = await prisma.contract.findUnique({
      where: { id: Number(id) },
    });

    if (!contract) {
      return res.status(404).json({ message: "❌ العقد غير موجود" });
    }

    await prisma.contract.delete({ where: { id: Number(id) } });
    res.json({ message: "✅ تم حذف العقد بنجاح" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 🏁 إنهاء عقد + خصم التأمين أو استرداده حسب الحالة
export const endContract = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { refundDeposit = true } = req.body; // خيار يحدد هل يُعاد التأمين أم يُخصم

    const contract = await prisma.contract.findUnique({
      where: { id: Number(id) },
      include: { tenant: true, unit: true },
    });

    if (!contract) {
      return res.status(404).json({ message: "❌ العقد غير موجود" });
    }

    const deposit = (contract as any).deposit || 0;

    // تحديث حالة العقد إلى ENDED
    const updatedContract = await prisma.contract.update({
      where: { id: Number(id) },
      data: { status: "ENDED" },
    });

    // تحديث حالة الوحدة إلى AVAILABLE
    await prisma.unit.update({
      where: { id: contract.unitId },
      data: { status: "AVAILABLE" },
    });

    let exitInvoice = null;
    let refundInvoice = null;

    // 💵 إذا العقد يحتوي على تأمين
    if (deposit > 0) {
      if (refundDeposit) {
        // إنشاء فاتورة استرداد التأمين
        refundInvoice = await prisma.invoice.create({
          data: {
            tenantId: contract.tenantId!,
            contractId: contract.id,
            amount: -deposit,
            dueDate: new Date(),
            status: "PAID",
          },
        });
      } else {
        // إنشاء فاتورة خروج بخصم التأمين
        exitInvoice = await prisma.invoice.create({
          data: {
            tenantId: contract.tenantId!,
            contractId: contract.id,
            amount: contract.rentAmount - deposit,
            dueDate: new Date(),
            status: "PENDING",
          },
        });
      }
    } else {
      // بدون تأمين: إنشاء فاتورة خروج عادية
      exitInvoice = await prisma.invoice.create({
        data: {
          tenantId: contract.tenantId!,
          contractId: contract.id,
          amount: contract.rentAmount,
          dueDate: new Date(),
          status: "PENDING",
        },
      });
    }

    // 🧾 إضافة سجل النشاط داخل نفس الدالة (بدون await خارجها)
    await prisma.activityLog.create({
      data: {
        action: "End Contract",
        description: refundDeposit
          ? `تم إنهاء العقد رقم ${contract.id} واسترداد التأمين للعميل ${contract.tenantName}`
          : `تم إنهاء العقد رقم ${contract.id} بعد خصم التأمين`,
        contractId: contract.id,
        userId: (req as any).user?.id || null,
      },
    });

    res.json({
      message: refundDeposit
        ? "✅ تم إنهاء العقد وتحرير الوحدة واسترداد التأمين للعميل"
        : "✅ تم إنهاء العقد وتحرير الوحدة بعد خصم التأمين",
      contract: updatedContract,
      unit: { id: contract.unitId, status: "AVAILABLE" },
      exitInvoice,
      refundInvoice,
    });
  } catch (error: any) {
    console.error("❌ خطأ أثناء إنهاء العقد:", error);
    res.status(500).json({ message: error.message });
  }
};

// 📥 استيراد عقود/نزلاء من CSV عربي (مع تمرير propertyId لاختيار الفندق)
// الأعمدة المدعومة: اسم النزيل,الجنسية,النوع,رقم الغرفة,الإيجار,تاريخ الدخول,تاريخ الخروج,حالة السداد,تاريخ السداد,طريقة السداد,التأمين,ملاحظات,حالة العقد,رقم الجوال
export const importContractsCsv = async (req: Request, res: Response) => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    const { propertyId } = req.query as { propertyId?: string };
    if (!file) return res.status(400).json({ message: "الرجاء رفع ملف CSV" });
    const pid = propertyId ? Number(propertyId) : undefined;
    const text = file.buffer.toString('utf8');

    function parseCsv(input: string): string[][] {
      const rows: string[][] = [];
      let i = 0, field = '', row: string[] = [], inQuotes = false;
      while (i < input.length) {
        const ch = input[i];
        if (ch === '"') {
          if (inQuotes && input[i+1] === '"') { field += '"'; i += 2; continue; }
          inQuotes = !inQuotes; i++; continue;
        }
        if (!inQuotes && ch === ',') { row.push(field.trim()); field=''; i++; continue; }
        if (!inQuotes && (ch === '\n' || ch === '\r')) { if (field.length || row.length) { row.push(field.trim()); rows.push(row); } field=''; row=[]; while (i<input.length && (input[i]=='\n'||input[i]=='\r')) i++; continue; }
        field += ch; i++;
      }
      if (field.length || row.length) { row.push(field.trim()); rows.push(row); }
      return rows.filter(r => r.some(c => c!==''));
    }

    const rows = parseCsv(text);
    if (!rows.length) return res.json({ imported: 0, errors: ["ملف فارغ"] });
    const header = rows.shift()!.map(h => h.replace(/\ufeff/g,'').trim());
    const idx = (names: string[]) => {
      for (const n of names) { const i = header.findIndex(h => h.toLowerCase() === n.toLowerCase()); if (i>=0) return i; }
      return -1;
    };
    const I = {
      name: idx(['اسم النزيل','النزيل','name']),
      rental: idx(['النوع','شهري - يومي','rental']),
      unit: idx(['رقم الغرفة','الوحدة','room','unit']),
      rent: idx(['الإيجار','ايجار الغرفة (المبالغ المسددة)','rent']),
      start: idx(['تاريخ الدخول','start']),
      end: idx(['تاريخ الخروج','end']),
      payStatus: idx(['السداد','حالة السداد']),
      payDate: idx(['تاريخ السداد','payment date']),
      payType: idx(['طريقة السداد','نوع السداد كاش / حوالة']),
      deposit: idx(['التأمين','التامين','deposit']),
      notes: idx(['ملاحظات','notes']),
      cstatus: idx(['حالة العقد','contract status']),
      phone: idx(['رقم الجوال','الهاتف','phone']),
    } as const;

    function parseDate(s?: string) {
      if (!s) return undefined;
      const t = s.replace(/\s+/g,'').replace(/^\D+|\D+$/g,'');
      const parts = t.split(/[\/-]/).map(x=>x.trim()).filter(Boolean);
      const toDate = (y:number,m:number,d:number)=> new Date(y,m-1,d);
      if (parts.length===3) {
        const [a,b,c] = parts;
        const A = Number(a), B = Number(b), C = Number(c);
        // try M/D/Y then D/M/Y then Y/M/D
        if (C>1900 && A<=12) return toDate(C,A,B);
        if (C>1900 && B<=12) return toDate(C,B,A);
        if (A>1900 && B<=12) return toDate(A,B,C);
      }
      const d = new Date(s);
      return isNaN(d.getTime()) ? undefined : d;
    }
    const toRental = (v?: string) => !v ? 'MONTHLY' : (v.includes('يومي')||v.toUpperCase().includes('DAILY')?'DAILY':'MONTHLY');
    const toStatus = (v?: string) => v && v.includes('منتهي') ? 'ENDED' : (v && v.includes('ملغ') ? 'CANCELLED' : 'ACTIVE');

    let imported = 0; const errors: string[] = [];
    for (const r of rows) {
      try {
        const name = I.name>=0 ? r[I.name] : '';
        if (!name || name.includes('غرفة فاضية')) continue; // تخطّي الغرف الفارغة
        const unitNumber = I.unit>=0 ? r[I.unit] : '';
        if (!unitNumber) { errors.push(`سطر بدون رقم غرفة للنزيل ${name}`); continue; }
        const unitWhere: any = { number: unitNumber };
        if (pid) unitWhere.propertyId = pid;
        const unit = await prisma.unit.findFirst({ where: unitWhere });
        if (!unit) { errors.push(`الوحدة غير موجودة: ${unitNumber}`); continue; }

        // المستأجر
        const phone = I.phone>=0 ? r[I.phone] : '';
        let tenant = await prisma.tenant.findFirst({ where: { name } });
        if (!tenant) tenant = await prisma.tenant.create({ data: { name, phone: phone || '—' } });

        const rentalType = toRental(I.rental>=0 ? r[I.rental] : undefined);
        const rent = I.rent>=0 ? Number(String(r[I.rent]).replace(/[^0-9.]+/g,'')) : 0;
        const startDate = parseDate(I.start>=0 ? r[I.start] : undefined) || new Date();
        const endDate = parseDate(I.end>=0 ? r[I.end] : undefined) || new Date(startDate.getTime()+1000*60*60*24*30);
        const deposit = I.deposit>=0 ? Number(String(r[I.deposit]).replace(/[^0-9.]+/g,'')) : 0;
        const cstatus = toStatus(I.cstatus>=0 ? r[I.cstatus] : undefined);

        const contract = await prisma.contract.create({
          data: {
            tenantName: name,
            tenantId: tenant.id,
            unitId: unit.id,
            startDate,
            endDate,
            amount: rent,
            rentAmount: rent,
            rentalType,
            status: cstatus,
            deposit,
          },
        });

        // إنشاء فاتورة واحدة كبداية للفترة
        const payStatus = (I.payStatus>=0 ? r[I.payStatus] : '').includes('سدد') ? 'PAID' : 'PENDING';
        const payDate = parseDate(I.payDate>=0 ? r[I.payDate] : undefined) || startDate;
        await prisma.invoice.create({ data: { tenantId: tenant.id, contractId: contract.id, amount: rent, dueDate: payDate, status: payStatus as any } });

        // تحديث حالة الوحدة إلى مشغولة عند وجود عقد نشط
        await prisma.unit.update({ where: { id: unit.id }, data: { status: 'OCCUPIED' } });
        imported++;
      } catch (e: any) {
        errors.push(e?.message || 'خطأ في السطر');
      }
    }

    res.json({ imported, errors });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ message: e?.message || 'فشل استيراد العقود' });
  }
};
