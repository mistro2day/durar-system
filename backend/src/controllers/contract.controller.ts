import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { getPagination } from "../utils/pagination.js";
import type { AuthedRequest } from "../middlewares/auth.js";
import { logActivity } from "../utils/activity-log.js";


function normalizeString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

/**
 * Calculates the number of payment installments based on duration and frequency.
 * Uses a heuristic: if the remaining duration is less than half of the frequency step,
 * it's absorbed into the previous installments.
 */
function calculateInstallmentCount(start: Date, end: Date, stepMonths: number): number {
  if (stepMonths <= 0) return 1;
  const s = new Date(start);
  const e = new Date(end);

  // Calculate total months difference
  const diffMonths = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  const diffDays = e.getDate() - s.getDate();
  const totalMonths = diffMonths + (diffDays / 30);

  if (totalMonths <= 0) return 1;

  // Use rounding to decide installment count
  // e.g., 12.6 months / 6 month step = 2.1 cycles -> 2 installments
  // e.g., 15 months / 6 month step = 2.5 cycles -> 3 installments
  const count = Math.round(totalMonths / stepMonths);
  return Math.max(1, count);
}

// 📝 إنشاء عقد جديد + إنشاء المستأجر تلقائيًا + إصدار أول فاتورة
export const createContract = async (req: AuthedRequest, res: Response) => {
  try {
    const {
      tenantName,
      unitId,
      startDate,
      endDate,
      amount,
      rentAmount,
      rentalType,
      deposit,
      ejarContractNumber,
      paymentMethod,
      paymentFrequency,
      servicesIncluded,
      notes,
    } = req.body;

    // 🔍 تحقق من وجود الوحدة
    if (!unitId) {
      return res.status(400).json({ message: "رقم الوحدة مطلوب" });
    }
    const unit = await prisma.unit.findUnique({ where: { id: Number(unitId) } });
    if (!unit) {
      return res.status(404).json({ message: "الوحدة غير موجودة" });
    }

    // 🔍 التحقق من اسم المستأجر
    if (!tenantName || typeof tenantName !== 'string' || !tenantName.trim()) {
      return res.status(400).json({ message: "اسم المستأجر مطلوب" });
    }

    const safeTenantName = tenantName.trim();

    // 🔍 البحث عن المستأجر أو إنشاؤه
    let tenant = await prisma.tenant.findFirst({ where: { name: safeTenantName } });
    if (!tenant) {
      try {
        tenant = await prisma.tenant.create({
          data: { name: safeTenantName, phone: "0000000000" },
        });
      } catch (createErr: any) {
        console.error("Error creating tenant:", createErr);
        return res.status(500).json({ message: "فشل إنشاء سجل المستأجر: " + createErr.message });
      }
    }

    // ✅ إنشاء العقد
    const totalAmount = amount !== undefined ? Number(amount) : rentAmount !== undefined ? Number(rentAmount) : 0;
    const periodicRent = rentAmount !== undefined ? Number(rentAmount) : totalAmount;

    const contract = await prisma.contract.create({
      data: {
        tenantName,
        tenantId: tenant.id,
        unitId: Number(unitId),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        amount: totalAmount,
        rentAmount: periodicRent,
        status: "ACTIVE",
        rentalType,
        deposit: deposit !== undefined ? Number(deposit) : undefined,
        ejarContractNumber: normalizeString(ejarContractNumber),
        paymentMethod: normalizeString(paymentMethod),
        paymentFrequency: normalizeString(paymentFrequency),
        servicesIncluded: normalizeString(servicesIncluded),
        notes: normalizeString(notes),
      },
      include: { unit: true, tenant: true },
    });

    // 💵 حساب الفواتير بناءً على تكرار الدفع
    const frequencyMap: Record<string, number> = {
      "شهري": 1, "MONTHLY": 1, "كل شهر": 1,
      "ربع سنوي": 3, "QUARTERLY": 3, "كل 3 أشهر": 3, "3 أشهر": 3, "3 شهور": 3, "أربع دفعات": 3, "اربع دفعات": 3,
      "3 دفعات": 4, "كل 4 أشهر": 4,
      "نصف سنوي": 6, "HALF_YEARLY": 6, "HALF-YEARLY": 6, "كل 6 أشهر": 6, "6 أشهر": 6, "6 شهور": 6, "دفعتين": 6,
      "سنوي": 12, "YEARLY": 12, "كل سنة": 12, "دفعة واحدة": 12,
    };

    const freqKey = (normalizeString(paymentFrequency) || "").toUpperCase();

    // 🔍 تحسين البحث عن الكلمات المفتاحية
    const sortedFreqKeys = Object.keys(frequencyMap).sort((a, b) => b.length - a.length);
    const matchedKey = sortedFreqKeys.find(k => freqKey.includes(k.toUpperCase()) || k.toUpperCase() === freqKey);
    let monthStep = matchedKey ? frequencyMap[matchedKey] : 0;

    // 🔍 محاولة استخراج رقم إذا لم يتم العثور على كلمة مفتاحية (مثلاً "كل 4 أشهر")
    if (monthStep === 0 && freqKey) {
      const match = freqKey.match(/(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        if (num > 0 && num <= 12) monthStep = num;
      }
    }

    console.log(`[InvoiceDebug] Input: "${paymentFrequency}", Matched: "${matchedKey}", Steps: ${monthStep}`);

    const createdInvoices: any[] = [];

    if (monthStep > 0) {
      // حساب عدد الدفعات وتوزيع المبلغ
      const start = new Date(startDate);
      const end = new Date(endDate);
      const periods = calculateInstallmentCount(start, end, monthStep);
      const amountPerInvoice = totalAmount / periods;

      let currentInvoiceDate = new Date(start);
      for (let i = 0; i < periods; i++) {
        const inv = await prisma.invoice.create({
          data: {
            tenantId: tenant.id,
            contractId: contract.id,
            amount: amountPerInvoice,
            dueDate: new Date(currentInvoiceDate),
            status: "PENDING",
          },
        });
        createdInvoices.push(inv);
        currentInvoiceDate.setMonth(currentInvoiceDate.getMonth() + monthStep);
      }
    } else {
      // إذا لم يتم تحديد تكرار (دفعة واحدة)
      const inv = await prisma.invoice.create({
        data: {
          tenantId: tenant.id,
          contractId: contract.id,
          amount: totalAmount,
          dueDate: new Date(startDate),
          status: "PENDING",
        },
      });
      createdInvoices.push(inv);
    }

    await logActivity(prisma, req, {
      action: "CONTRACT_CREATE",
      description: `تم إنشاء عقد جديد للوحدة ${contract.unit?.number ?? contract.unitId} باسم ${contract.tenantName}`,
      contractId: contract.id,
    });

    res.json({
      message: "✅ تم إنشاء العقد والفواتير بنجاح",
      contract,
      invoices: createdInvoices,
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
      const contracts = await prisma.contract.findMany({
        where,
        include: { unit: { include: { property: true } }, tenant: true },
        orderBy: { createdAt: "desc" },
      });
      return res.json(contracts);
    }
    const [items, total] = await prisma.$transaction([
      prisma.contract.findMany({
        where,
        include: { unit: { include: { property: true } }, tenant: true },
        orderBy: { createdAt: "desc" },
        skip: pg.skip,
        take: pg.take,
      }),
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
    const {
      startDate,
      endDate,
      amount,
      rentAmount,
      rentalType,
      status,
      deposit,
      ejarContractNumber,
      paymentMethod,
      paymentFrequency,
      servicesIncluded,
      notes,
      renewalStatus,
    } = req.body;

    // Get current contract to check if rentAmount or paymentFrequency changed
    const currentContract = await prisma.contract.findUnique({
      where: { id: Number(id) },
      include: { invoices: true }
    });

    if (!currentContract) {
      return res.status(404).json({ message: "❌ العقد غير موجود" });
    }

    const contract = await prisma.contract.update({
      where: { id: Number(id) },
      data: {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        amount: amount !== undefined ? Number(amount) : undefined,
        rentAmount: rentAmount !== undefined ? Number(rentAmount) : undefined,
        rentalType,
        status,
        deposit: deposit !== undefined ? Number(deposit) : undefined,
        ejarContractNumber: normalizeString(ejarContractNumber),
        paymentMethod: normalizeString(paymentMethod),
        paymentFrequency: normalizeString(paymentFrequency),
        servicesIncluded: normalizeString(servicesIncluded),
        notes: normalizeString(notes),
        renewalStatus,
      } as any,
    });

    // 💵 إعادة إنشاء الفواتير المعلقة إذا تغير مبلغ الإيجار أو تكرار الدفع
    const newRentAmount = rentAmount !== undefined ? Number(rentAmount) : Number(currentContract.rentAmount || 0);
    const newPaymentFrequency = paymentFrequency || currentContract.paymentFrequency;
    const rentChanged = rentAmount !== undefined && Number(rentAmount) !== Number(currentContract.rentAmount);
    const freqChanged = paymentFrequency && normalizeString(paymentFrequency) !== normalizeString(currentContract.paymentFrequency || "");
    const dateChanged = (startDate && new Date(startDate).getTime() !== new Date(currentContract.startDate).getTime()) ||
      (endDate && new Date(endDate).getTime() !== new Date(currentContract.endDate).getTime());

    if ((rentChanged || freqChanged || dateChanged) && newRentAmount) {
      // حساب المبلغ الجديد لكل فاتورة
      const frequencyMap: Record<string, number> = {
        "شهري": 1, "MONTHLY": 1, "كل شهر": 1,
        "ربع سنوي": 3, "QUARTERLY": 3, "كل 3 أشهر": 3, "3 أشهر": 3, "3 شهور": 3, "أربع دفعات": 3, "اربع دفعات": 3,
        "3 دفعات": 4, "كل 4 أشهر": 4,
        "نصف سنوي": 6, "HALF_YEARLY": 6, "HALF-YEARLY": 6, "كل 6 أشهر": 6, "6 أشهر": 6, "6 شهور": 6, "دفعتين": 6,
        "سنوي": 12, "YEARLY": 12, "كل سنة": 12, "دفعة واحدة": 12,
      };

      const freqKey = (normalizeString(newPaymentFrequency) || "").toUpperCase();
      const sortedFreqKeys = Object.keys(frequencyMap).sort((a, b) => b.length - a.length);
      const matchedKey = sortedFreqKeys.find(k => freqKey.includes(k.toUpperCase()) || k.toUpperCase() === freqKey);
      let monthStep = matchedKey ? frequencyMap[matchedKey] : 0;

      if (monthStep === 0 && freqKey) {
        const match = freqKey.match(/(\d+)/);
        if (match) {
          const num = parseInt(match[1]);
          if (num > 0 && num <= 12) monthStep = num;
        }
      }

      // حساب عدد الدفعات
      const contractStart = startDate ? new Date(startDate) : currentContract.startDate;
      const contractEnd = endDate ? new Date(endDate) : currentContract.endDate;

      // 1. حذف جميع الفواتير المعلقة
      const pendingInvoices = currentContract.invoices.filter(inv => inv.status === "PENDING");
      for (const inv of pendingInvoices) {
        await prisma.invoice.delete({ where: { id: inv.id } });
      }
      console.log(`[ContractUpdate] Deleted ${pendingInvoices.length} pending invoices`);

      // 2. إنشاء فواتير جديدة
      const createdInvoices: any[] = [];
      if (monthStep > 0 && contractStart && contractEnd) {
        const periods = calculateInstallmentCount(contractStart, contractEnd, monthStep);
        const amountPerInvoice = Number(newRentAmount) / periods;

        let currentInvoiceDate = new Date(contractStart);
        for (let i = 0; i < periods; i++) {
          const inv = await prisma.invoice.create({
            data: {
              tenantId: currentContract.tenantId,
              contractId: currentContract.id,
              amount: amountPerInvoice,
              dueDate: new Date(currentInvoiceDate),
              status: "PENDING",
            },
          });
          createdInvoices.push(inv);
          currentInvoiceDate.setMonth(currentInvoiceDate.getMonth() + monthStep);
        }
      } else {
        // إذا لم يتم تحديد تكرار (دفعة واحدة)
        const inv = await prisma.invoice.create({
          data: {
            tenantId: currentContract.tenantId,
            contractId: currentContract.id,
            amount: Number(newRentAmount),
            dueDate: contractStart ? new Date(contractStart) : new Date(),
            status: "PENDING",
          },
        });
        createdInvoices.push(inv);
      }

      console.log(`[ContractUpdate] Created ${createdInvoices.length} new invoices with amount ${createdInvoices[0]?.amount || 0} each`);
    }


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

    // 🔄 إذا كان هذا العقد تجديداً لعقد سابق، قم بإعادة العقد السابق للحالة النشطة عند الحذف
    const renewalNoteMatch = contract.notes?.match(/تجديد للعقد رقم (\d+)/);
    if (renewalNoteMatch) {
      const parentId = Number(renewalNoteMatch[1]);
      await prisma.contract.updateMany({
        where: { id: parentId, renewalStatus: "RENEWED" },
        data: {
          renewalStatus: "PENDING",
          status: "ACTIVE"
        }
      });
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
        action: "إنهاء العقد",
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
          if (inQuotes && input[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQuotes = !inQuotes; i++; continue;
        }
        if (!inQuotes && ch === ',') { row.push(field.trim()); field = ''; i++; continue; }
        if (!inQuotes && (ch === '\n' || ch === '\r')) { if (field.length || row.length) { row.push(field.trim()); rows.push(row); } field = ''; row = []; while (i < input.length && (input[i] == '\n' || input[i] == '\r')) i++; continue; }
        field += ch; i++;
      }
      if (field.length || row.length) { row.push(field.trim()); rows.push(row); }
      return rows.filter(r => r.some(c => c !== ''));
    }

    const rows = parseCsv(text);
    if (!rows.length) return res.json({ imported: 0, errors: ["ملف فارغ"] });
    const header = rows.shift()!.map(h => h.replace(/\ufeff/g, '').trim());
    const idx = (names: string[]) => {
      for (const n of names) { const i = header.findIndex(h => h.toLowerCase() === n.toLowerCase()); if (i >= 0) return i; }
      return -1;
    };
    const I = {
      name: idx(['اسم النزيل', 'النزيل', 'name']),
      rental: idx(['النوع', 'شهري - يومي', 'rental']),
      unit: idx(['رقم الغرفة', 'الوحدة', 'room', 'unit']),
      rent: idx(['الإيجار', 'ايجار الغرفة (المبالغ المسددة)', 'rent']),
      start: idx(['تاريخ الدخول', 'start']),
      end: idx(['تاريخ الخروج', 'end']),
      payStatus: idx(['السداد', 'حالة السداد']),
      payDate: idx(['تاريخ السداد', 'payment date']),
      payType: idx(['طريقة السداد', 'نوع السداد كاش / حوالة']),
      deposit: idx(['التأمين', 'التامين', 'deposit']),
      notes: idx(['ملاحظات', 'notes']),
      cstatus: idx(['حالة العقد', 'contract status']),
      phone: idx(['رقم الجوال', 'الهاتف', 'phone']),
    } as const;

    function parseDate(s?: string) {
      if (!s) return undefined;
      const t = s.replace(/\s+/g, '').replace(/^\D+|\D+$/g, '');
      const parts = t.split(/[\/-]/).map(x => x.trim()).filter(Boolean);
      const toDate = (y: number, m: number, d: number) => new Date(y, m - 1, d);
      if (parts.length === 3) {
        const [a, b, c] = parts;
        const A = Number(a), B = Number(b), C = Number(c);
        // try M/D/Y then D/M/Y then Y/M/D
        if (C > 1900 && A <= 12) return toDate(C, A, B);
        if (C > 1900 && B <= 12) return toDate(C, B, A);
        if (A > 1900 && B <= 12) return toDate(A, B, C);
      }
      const d = new Date(s);
      return isNaN(d.getTime()) ? undefined : d;
    }
    const toRental = (v?: string) => !v ? 'MONTHLY' : (v.includes('يومي') || v.toUpperCase().includes('DAILY') ? 'DAILY' : 'MONTHLY');
    const toStatus = (v?: string) => v && v.includes('منتهي') ? 'ENDED' : (v && v.includes('ملغ') ? 'CANCELLED' : 'ACTIVE');

    let imported = 0; const errors: string[] = [];
    for (const r of rows) {
      try {
        const name = I.name >= 0 ? r[I.name] : '';
        if (!name || name.includes('غرفة فاضية')) continue; // تخطّي الغرف الفارغة
        const unitNumber = I.unit >= 0 ? r[I.unit] : '';
        if (!unitNumber) { errors.push(`سطر بدون رقم غرفة للنزيل ${name}`); continue; }
        const unitWhere: any = { number: unitNumber };
        if (pid) unitWhere.propertyId = pid;
        const unit = await prisma.unit.findFirst({ where: unitWhere });
        if (!unit) { errors.push(`الوحدة غير موجودة: ${unitNumber}`); continue; }

        // المستأجر
        const phone = I.phone >= 0 ? r[I.phone] : '';
        let tenant = await prisma.tenant.findFirst({ where: { name } });
        if (!tenant) tenant = await prisma.tenant.create({ data: { name, phone: phone || '—' } });

        const rentalType = toRental(I.rental >= 0 ? r[I.rental] : undefined);
        const rent = I.rent >= 0 ? Number(String(r[I.rent]).replace(/[^0-9.]+/g, '')) : 0;
        const startDate = parseDate(I.start >= 0 ? r[I.start] : undefined) || new Date();
        const endDate = parseDate(I.end >= 0 ? r[I.end] : undefined) || new Date(startDate.getTime() + 1000 * 60 * 60 * 24 * 30);
        const deposit = I.deposit >= 0 ? Number(String(r[I.deposit]).replace(/[^0-9.]+/g, '')) : 0;
        const cstatus = toStatus(I.cstatus >= 0 ? r[I.cstatus] : undefined);

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
            paymentMethod: normalizeString(I.payType >= 0 ? r[I.payType] : undefined),
            notes: normalizeString(I.notes >= 0 ? r[I.notes] : undefined),
          },
        });

        // إنشاء فاتورة واحدة كبداية للفترة
        const payStatus = (I.payStatus >= 0 ? r[I.payStatus] : '').includes('سدد') ? 'PAID' : 'PENDING';
        const payDate = parseDate(I.payDate >= 0 ? r[I.payDate] : undefined) || startDate;
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
// 🔄 تجديد عقد (إنشاء عقد جديد + تحديث حالة العقد القديم)
export const renewContract = async (req: AuthedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, amount } = req.body;

    const oldContract = await prisma.contract.findUnique({
      where: { id: Number(id) },
      include: { unit: true },
    });

    if (!oldContract) {
      return res.status(404).json({ message: "❌ العقد غير موجود" });
    }

    if (oldContract.renewalStatus === "RENEWED") {
      return res.status(400).json({ message: "❌ هذا العقد تم تجديده بالفعل، يوجد عقد ساري" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. إنشاء العقد الجديد
      const newContract = await tx.contract.create({
        data: {
          tenantId: oldContract.tenantId,
          tenantName: oldContract.tenantName,
          unitId: oldContract.unitId,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          amount: Number(amount),
          rentAmount: Number(amount),
          rentalType: oldContract.rentalType,
          paymentFrequency: oldContract.paymentFrequency,
          paymentMethod: oldContract.paymentMethod,
          deposit: oldContract.deposit,
          notes: `تجديد للعقد رقم ${oldContract.id}`,
          status: "ACTIVE",
          renewalStatus: "PENDING",
        },
      });

      // 2. تحديث حالة العقد القديم إلى منتهي + تم تجديده
      await tx.contract.update({
        where: { id: oldContract.id },
        data: {
          renewalStatus: "RENEWED",
          status: "ENDED" // إنهاء العقد القديم
        },
      });

      // 3. حساب الفواتير بناءً على تكرار الدفع
      const frequencyMap: Record<string, number> = {
        "شهري": 1, "MONTHLY": 1, "كل شهر": 1,
        "ربع سنوي": 3, "QUARTERLY": 3, "كل 3 أشهر": 3, "3 أشهر": 3, "3 شهور": 3, "أربع دفعات": 3, "اربع دفعات": 3,
        "3 دفعات": 4, "كل 4 أشهر": 4,
        "نصف سنوي": 6, "HALF_YEARLY": 6, "HALF-YEARLY": 6, "كل 6 أشهر": 6, "6 أشهر": 6, "6 شهور": 6, "دفعتين": 6,
        "سنوي": 12, "YEARLY": 12, "كل سنة": 12, "دفعة واحدة": 12,
      };

      const freqKey = (normalizeString(oldContract.paymentFrequency) || "").toUpperCase();
      const sortedFreqKeys = Object.keys(frequencyMap).sort((a, b) => b.length - a.length);
      const matchedKey = sortedFreqKeys.find(k => freqKey.includes(k.toUpperCase()) || k.toUpperCase() === freqKey);
      let monthStep = matchedKey ? frequencyMap[matchedKey] : 0;

      // 🔍 محاولة استخراج رقم إذا لم يتم العثور على كلمة مفتاحية
      if (monthStep === 0 && freqKey) {
        const match = freqKey.match(/(\d+)/);
        if (match) {
          const num = parseInt(match[1]);
          if (num > 0 && num <= 12) monthStep = num;
        }
      }

      if (monthStep > 0) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const periods = calculateInstallmentCount(start, end, monthStep);
        const amountPerInvoice = Number(amount) / periods;

        let currentInvoiceDate = new Date(start);
        for (let i = 0; i < periods; i++) {
          await tx.invoice.create({
            data: {
              tenantId: oldContract.tenantId,
              contractId: newContract.id,
              amount: amountPerInvoice,
              dueDate: new Date(currentInvoiceDate),
              status: "PENDING",
            },
          });
          currentInvoiceDate.setMonth(currentInvoiceDate.getMonth() + monthStep);
        }
      } else {
        await tx.invoice.create({
          data: {
            tenantId: oldContract.tenantId,
            contractId: newContract.id,
            amount: Number(amount),
            dueDate: new Date(startDate),
            status: "PENDING",
          },
        });
      }

      // 4. تسجيل النشاط
      await logActivity(tx, req, {
        action: "CONTRACT_RENEWAL",
        description: `تجديد العقد رقم ${oldContract.id} بعقد جديد رقم ${newContract.id} للوحدة ${oldContract.unit?.number}`,
        contractId: newContract.id,
      });

      return newContract;
    });

    res.json({ message: "✅ تم تجديد العقد بنجاح", contract: result });
  } catch (error: any) {
    console.error("❌ خطأ أثناء تجديد العقد:", error);
    res.status(500).json({ message: error.message });
  }
};
