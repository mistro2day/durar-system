import math
from datetime import datetime, timedelta
from typing import Optional
from dataclasses import dataclass

@dataclass
class InvoiceEntry:
    hijri: Optional[tuple] = None  # (day, month, year)
    due_greg: Optional[str] = None
    amount: float = 0.0
    payments: Optional[list] = None  # list of dicts {amount, date}
    note: Optional[str] = None

from prisma import Prisma
from prisma import enums

prisma = Prisma()

# Helper conversion functions

def hijri_to_julian(year: int, month: int, day: int) -> float:
    return math.floor((11 * year + 3) / 30) + 354 * year + 30 * month - math.floor((month - 1) / 2) + day + 1948440 - 385


def julian_to_gregorian(jd: float) -> datetime:
    jd = jd + 0.5
    z = int(jd)
    f = jd - z
    if z < 2299161:
        a = z
    else:
        alpha = int((z - 1867216.25) / 36524.25)
        a = z + 1 + alpha - (alpha // 4)
    b = a + 1524
    c = int((b - 122.1) / 365.25)
    d = int(365.25 * c)
    e = int((b - d) / 30.6001)
    day = b - d - int(30.6001 * e) + f
    month = e - 1 if e < 14 else e - 13
    year = c - 4716 if month > 2 else c - 4715
    return datetime(year, month, int(day))


def hijri_to_gregorian_date(year: int, month: int, day: int) -> datetime:
    jd = hijri_to_julian(year, month, day)
    greg = julian_to_gregorian(jd)
    return greg

entries = [
    InvoiceEntry(hijri=(6, 9, 1445), amount=4666, payments=[{"amount": 4666, "date": "2024-03-14"}], note="إيجار الفترة 1445/09/06 - 1445/11/05"),
    InvoiceEntry(hijri=(6, 11, 1445), amount=2333, payments=[{"amount": 2333, "date": "2024-05-13"}], note="إيجار الفترة 1445/11/06 - 1445/12/05"),
    InvoiceEntry(hijri=(6, 12, 1445), amount=2333, payments=[{"amount": 2333, "date": "2024-06-11"}], note="إيجار الفترة 1445/12/06 - 1445/12/30"),
    InvoiceEntry(due_greg="2024-07-12", amount=2333, payments=[{"amount": 2333, "date": "2024-07-12"}], note="إيجار الفترة 1446/02/06 - 1446/03/05"),
    InvoiceEntry(due_greg="2024-08-12", amount=2333, payments=[{"amount": 2333, "date": "2024-08-12"}], note="إيجار الفترة 1446/03/06 - 1446/04/05"),
    InvoiceEntry(due_greg="2024-09-12", amount=2333, payments=[{"amount": 2333, "date": "2024-09-12"}], note="إيجار الفترة 1446/04/06 - 1446/05/05"),
    InvoiceEntry(due_greg="2024-10-12", amount=2333, payments=[{"amount": 2333, "date": "2024-10-12"}], note="إيجار الفترة 1446/05/06 - 1446/06/05"),
    InvoiceEntry(due_greg="2024-11-12", amount=2333, payments=[{"amount": 2333, "date": "2024-11-12"}], note="إيجار الفترة 1446/06/06 - 1446/07/05"),
    InvoiceEntry(hijri=(6, 7, 1446), amount=2333, payments=[{"amount": 2333, "date": "2025-01-04"}], note="إيجار الفترة 1446/07/06 - 1446/08/05"),
    InvoiceEntry(hijri=(6, 8, 1446), amount=4666, payments=[{"amount": 4666, "date": "2025-03-02"}], note="إيجار الفترة 1446/08/06 - 1446/10/05"),
    InvoiceEntry(hijri=(6, 10, 1446), amount=2333, payments=[{"amount": 2333, "date": "2025-04-03"}], note="إيجار الفترة 1446/10/06 - 1446/11/05"),
    InvoiceEntry(hijri=(6, 11, 1446), amount=2333, payments=[{"amount": 2333, "date": "2025-05-03"}], note="إيجار الفترة 1446/11/06 - 1446/12/05"),
    InvoiceEntry(hijri=(6, 12, 1446), amount=2333, payments=[{"amount": 2333, "date": "2025-05-29"}], note="إيجار الفترة 1446/12/06 - 1447/01/05"),
    InvoiceEntry(hijri=(6, 1, 1447), amount=2333, payments=[{"amount": 2333, "date": "2025-06-29"}], note="إيجار الفترة 1447/01/06 - 1447/02/05"),
    InvoiceEntry(hijri=(6, 2, 1447), amount=2333, payments=[{"amount": 2333, "date": "2025-07-29"}], note="إيجار الفترة 1447/02/06 - 1447/03/05"),
    InvoiceEntry(hijri=(6, 3, 1447), amount=2333, payments=[{"amount": 2333, "date": "2025-08-27"}], note="إيجار الفترة 1447/03/06 - 1447/04/05"),
    InvoiceEntry(hijri=(6, 4, 1447), amount=2333, payments=[{"amount": 2333, "date": "2025-09-25"}], note="إيجار الفترة 1447/04/06 - 1447/05/05"),
]

async def main_async():
    await prisma.connect()

    property = await prisma.property.upsert(
        where={"name": propertyName},
        update={},
        create={"name": propertyName, "type": PropertyType.BUILDING}
    )

    unit = await prisma.unit.find_first(
        where={"propertyId": property.id, "number": {"in": [unitName, *aliases]}}
    )
    if unit:
        unit = await prisma.unit.update(where={"id": unit.id}, data={"number": unitName, "status": UnitStatus.OCCUPIED, "type": UnitType.YEARLY})
    else:
        unit = await prisma.unit.create(data={"number": unitName, "propertyId": property.id, "status": UnitStatus.OCCUPIED, "type": UnitType.YEARLY})

    tenant = await prisma.tenant.find_first(where={"phone": tenantPhone})
    if tenant:
        tenant = await prisma.tenant.update(where={"id": tenant.id}, data={"name": tenantName})
    else:
        tenant = await prisma.tenant.create(data={"name": tenantName, "phone": tenantPhone})

    existing_contracts = await prisma.contract.find_many(
        where={"unitId": unit.id, "startDate": {"lte": contractEnd}, "endDate": {"gte": contractStart}},
        include={"invoices": {"include": {"payments": True}}}
    )
    for contract in existing_contracts:
        for invoice in contract.invoices:
            await prisma.payment.delete_many(where={"invoiceId": invoice.id})
            await prisma.invoice.delete(where={"id": invoice.id})
        await prisma.contract.delete(where={"id": contract.id})

    contract = await prisma.contract.create(
        data={
            "tenantId": tenant.id,
            "unitId": unit.id,
            "startDate": hijri_to_gregorian_date(1445, 9, 6),  # 1st recorded period start
            "endDate": contractEnd,
            "rentAmount": 28000,
            "amount": 28000,
            "status": ContractStatus.ACTIVE,
            "rentalType": "سند لأمر",
            "tenantName": tenantName,
            "deposit": 2000,
            "paymentMethod": "دفعات شهرية",
            "paymentFrequency": "شهري",
            "ejarContractNumber": "20257742737",
            "notes": "تم توقيع سند لأمر بدلاً من عقد إلكتروني، مع تسجيل الدفعات الشهرية",
            "autoInvoice": True,
        }
    )

    # سجل فاتورة التأمين (لم يتم السداد)
    await prisma.invoice.create(
        data={
            "contractId": contract.id,
            "tenantId": tenant.id,
            "amount": 2000,
            "dueDate": contract.startDate,
            "status": InvoiceStatus.PENDING,
        }
    )

    for entry in entries:
        if entry.hijri:
            day, month, year = entry.hijri
            due = hijri_to_gregorian_date(year, month, day)
        else:
            due = datetime.fromisoformat(entry.due_greg)

        inv = await prisma.invoice.create(
            data={
                "contractId": contract.id,
                "tenantId": tenant.id,
                "amount": entry.amount,
                "dueDate": due,
                "status": InvoiceStatus.PAID if entry.payments else InvoiceStatus.PENDING,
                "description": entry.note,
            }
        )

        if entry.payments:
            for pay in entry.payments:
                await prisma.payment.create(
                    data={
                        "invoiceId": inv.id,
                        "amount": pay["amount"],
                        "method": PaymentMethod.BANK_TRANSFER,
                        "paidAt": datetime.fromisoformat(pay["date"]),
                    }
                )

    print("✅ تم تسجيل عقد مكتب 10 مع جميع الدفعات")

    await prisma.disconnect()

import asyncio
if __name__ == "__main__":
    asyncio.run(main_async())
