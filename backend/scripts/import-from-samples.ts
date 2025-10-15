import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const prisma = new PrismaClient();

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let i = 0, field = '', row: string[] = [], inQuotes = false;
  while (i < input.length) {
    const ch = input[i];
    if (ch === '"') { if (inQuotes && input[i+1] === '"') { field += '"'; i += 2; continue; } inQuotes = !inQuotes; i++; continue; }
    if (!inQuotes && ch === ',') { row.push(field.trim()); field=''; i++; continue; }
    if (!inQuotes && (ch === '\n' || ch === '\r')) { if (field.length || row.length) { row.push(field.trim()); rows.push(row); } field=''; row=[]; while (i<input.length && (input[i]=='\n'||input[i]=='\r')) i++; continue; }
    field += ch; i++;
  }
  if (field.length || row.length) { row.push(field.trim()); rows.push(row); }
  return rows.filter(r => r.some(c => c!==''));
}

async function ensureHotel(): Promise<{ id:number; name:string }> {
  const existing = await prisma.property.findFirst({ where: { type: 'HOTEL' } });
  if (existing) return existing;
  const created = await prisma.property.create({ data: { name: 'فندق #1', type: 'HOTEL' } });
  return created;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..", "..", "..");
const unitsCsvPath = path.join(root, "durar-system", "sample-data", "hotel-units-import.csv");
const contractsCsvPath = path.join(root, "durar-system", "sample-data", "hotel-contracts-import.csv");

function idx(header: string[], ...names: string[]) {
  for (const n of names) { const i = header.findIndex(h => h.toLowerCase() === n.toLowerCase()); if (i>=0) return i; }
  return -1;
}

function toStatus(v?: string) { if (!v) return undefined as any; const m: any = { 'متاحة':'AVAILABLE','مشغولة':'OCCUPIED','صيانة':'MAINTENANCE' }; return m[v] || v.toUpperCase(); }
function toType(v?: string) { if (!v) return undefined as any; const m: any = { 'شهري':'MONTHLY','يومي':'DAILY' }; return m[v] || v.toUpperCase(); }

function parseDate(s?: string) {
  if (!s) return undefined;
  const t = s.trim();
  const d = new Date(t);
  if (!isNaN(d.getTime())) return d;
  const parts = t.split(/[\/-]/).map(x=>x.trim());
  if (parts.length===3) {
    const [a,b,c] = parts.map(Number);
    if (c>1900 && a<=12) return new Date(c, a-1, b);
    if (c>1900 && b<=12) return new Date(c, b-1, a);
  }
  return undefined;
}

async function importUnits(propertyId: number, hotelName: string) {
  const text = fs.readFileSync(unitsCsvPath, 'utf8');
  const rows = parseCsv(text); if (!rows.length) return { imported:0, updated:0 };
  const header = rows.shift()!.map(h => h.replace(/\ufeff/g,'').trim());
  const iProp = idx(header,'العقار','property');
  const iUnit = idx(header,'الوحدة','unit');
  const iStatus = idx(header,'الحالة','status');
  const iType = idx(header,'النوع','type');
  const iFloor = idx(header,'الدور','floor');
  const iRooms = idx(header,'الغرف','rooms');
  const iBaths = idx(header,'الحمامات','baths');
  const iArea = idx(header,'المساحة','area');
  let imported=0, updated=0;
  for (const r of rows) {
    const unitNumber = r[iUnit]; if (!unitNumber) continue;
    // نتجاهل اسم العقار داخل العينة ونضع كل الوحدات تحت العقار المحدد
    const status = toStatus(r[iStatus]);
    const type = toType(r[iType]);
    const floor = iFloor>=0 && r[iFloor]!=='' ? Number(r[iFloor]) : undefined;
    const rooms = iRooms>=0 && r[iRooms]!=='' ? Number(r[iRooms]) : undefined;
    const baths = iBaths>=0 && r[iBaths]!=='' ? Number(r[iBaths]) : undefined;
    const area = iArea>=0 && r[iArea]!=='' ? Number(r[iArea]) : undefined;
    const finalType: any = type || 'MONTHLY';
    const existing = await prisma.unit.findFirst({ where: { number: unitNumber, propertyId } });
    if (!existing) { await prisma.unit.create({ data: { number: unitNumber, propertyId, status: status || 'AVAILABLE', type: finalType, floor, rooms, baths, area } }); imported++; }
    else { await prisma.unit.update({ where: { id: existing.id }, data: { status, type: finalType, floor, rooms, baths, area } }); updated++; }
  }
  return { imported, updated };
}

async function wipeProperty(propertyId: number) {
  const unitIds = (await prisma.unit.findMany({ where: { propertyId }, select: { id: true } })).map(u=>u.id);
  const contractIds = (await prisma.contract.findMany({ where: { unitId: { in: unitIds } }, select: { id: true } })).map(c=>c.id);
  const invoiceIds = (await prisma.invoice.findMany({ where: { contractId: { in: contractIds } }, select: { id: true } })).map(i=>i.id);
  const ticketIds = (await prisma.maintenanceTicket.findMany({ where: { unitId: { in: unitIds } }, select: { id: true } })).map(t=>t.id);
  await prisma.$transaction([
    prisma.maintenanceAction.deleteMany({ where: { ticketId: { in: ticketIds } } }),
    prisma.maintenanceTicket.deleteMany({ where: { id: { in: ticketIds } } }),
    prisma.booking.deleteMany({ where: { unitId: { in: unitIds } } }),
    prisma.payment.deleteMany({ where: { invoiceId: { in: invoiceIds } } }),
    prisma.invoice.deleteMany({ where: { id: { in: invoiceIds } } }),
    prisma.contract.deleteMany({ where: { id: { in: contractIds } } }),
    prisma.unit.deleteMany({ where: { id: { in: unitIds } } }),
  ]);
  return { unitCount: unitIds.length, contractCount: contractIds.length, invoiceCount: invoiceIds.length };
}

async function importContracts(propertyId: number) {
  const text = fs.readFileSync(contractsCsvPath, 'utf8');
  const rows = parseCsv(text); if (!rows.length) return { imported:0 };
  const header = rows.shift()!.map(h => h.replace(/\ufeff/g,'').trim());
  const I = {
    name: idx(header,'اسم النزيل','النزيل','name'),
    rental: idx(header,'النوع','شهري - يومي','rental'),
    unit: idx(header,'رقم الغرفة','الوحدة','room','unit'),
    rent: idx(header,'الإيجار','ايجار الغرفة (المبالغ المسددة)','rent'),
    start: idx(header,'تاريخ الدخول','start'),
    end: idx(header,'تاريخ الخروج','end'),
    payStatus: idx(header,'السداد','حالة السداد'),
    payDate: idx(header,'تاريخ السداد','payment date'),
    deposit: idx(header,'التأمين','التامين','deposit'),
    phone: idx(header,'رقم الجوال','الهاتف','phone'),
  } as const;

  const toRental = (v?: string) => !v ? 'MONTHLY' : (v.includes('يومي')||v.toUpperCase().includes('DAILY')?'DAILY':'MONTHLY');
  let imported=0;
  for (const r of rows) {
    const name = I.name>=0 ? r[I.name] : '';
    if (!name || name.includes('غرفة فاضية')) continue;
    const unitNumber = I.unit>=0 ? r[I.unit] : '';
    if (!unitNumber) continue;
    const unit = await prisma.unit.findFirst({ where: { number: unitNumber, propertyId } });
    if (!unit) continue;

    const phone = I.phone>=0 ? (r[I.phone]||'') : '';
    let tenant = await prisma.tenant.findFirst({ where: { name } });
    if (!tenant) tenant = await prisma.tenant.create({ data: { name, phone: phone || '—' } });

    const rent = I.rent>=0 ? Number(String(r[I.rent]).replace(/[^0-9.]+/g,'')) : 0;
    const startDate = parseDate(I.start>=0 ? r[I.start] : undefined) || new Date();
    const endDate = parseDate(I.end>=0 ? r[I.end] : undefined) || new Date(startDate.getTime()+1000*60*60*24*30);
    const rentalType = toRental(I.rental>=0 ? r[I.rental] : undefined);
    const deposit = I.deposit>=0 ? Number(String(r[I.deposit]).replace(/[^0-9.]+/g,'')) : 0;

    const contract = await prisma.contract.create({ data: { tenantName: name, tenantId: tenant.id, unitId: unit.id, startDate, endDate, amount: rent, rentAmount: rent, rentalType, status: 'ACTIVE', deposit } });
    const paid = (I.payStatus>=0 ? (r[I.payStatus]||'') : '').includes('سدد');
    const payDate = parseDate(I.payDate>=0 ? r[I.payDate] : undefined) || startDate;
    await prisma.invoice.create({ data: { tenantId: tenant.id, contractId: contract.id, amount: rent, dueDate: payDate, status: paid ? 'PAID' : 'PENDING' } });
    await prisma.unit.update({ where: { id: unit.id }, data: { status: 'OCCUPIED' } });
    imported++;
  }
  return { imported };
}

async function main() {
  const hotel = await ensureHotel();
  const hotelName = hotel.name;
  console.log('Using hotel:', hotelName, '#'+hotel.id);
  console.log('Wiping existing data...');
  const w = await wipeProperty(hotel.id);
  console.log('Wipe =>', w);
  const a = await importUnits(hotel.id, hotelName);
  console.log('Units =>', a);
  const b = await importContracts(hotel.id);
  console.log('Contracts =>', b);
}

main().then(()=>prisma.$disconnect()).catch(async (e)=>{ console.error(e); await prisma.$disconnect(); process.exit(1); });
