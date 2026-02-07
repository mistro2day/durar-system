const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function normalizeString(value) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const text = String(value).trim();
    return text.length ? text : null;
}

function calculateInstallmentCount(start, end, stepMonths) {
    if (stepMonths <= 0) return 1;
    const s = new Date(start);
    const e = new Date(end);
    const diffMonths = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    const diffDays = e.getDate() - s.getDate();
    const totalMonths = diffMonths + (diffDays / 30);
    if (totalMonths <= 0) return 1;
    const count = Math.round(totalMonths / stepMonths);
    return Math.max(1, count);
}

async function debug() {
    const id = 50;
    // Mimic what usually comes in req.body for a date change
    const startDate = "2025-12-10";
    const endDate = "2026-12-09";

    const currentContract = await prisma.contract.findUnique({
        where: { id: Number(id) },
        include: { invoices: true }
    });

    const newRentAmount = Number(currentContract.rentAmount || 0);
    const newPaymentFrequency = currentContract.paymentFrequency;

    const rentChanged = false;
    const freqChanged = false;
    const dateChanged = true; // Forced for debug

    console.log("Checking conditions:", { rentChanged, freqChanged, dateChanged, newRentAmount });

    if ((rentChanged || freqChanged || dateChanged) && newRentAmount) {
        const frequencyMap = {
            "شهري": 1, "MONTHLY": 1, "كل شهر": 1,
            "ربع سنوي": 3, "QUARTERLY": 3, "كل 3 أشهر": 3, "3 أشهر": 3, "3 شهور": 3, "أربع دفعات": 3, "اربع دفعات": 3,
            "3 دفعات": 4, "كل 4 أشهر": 4,
            "نصف سنوي": 6, "HALF_YEARLY": 6, "HALF-YEARLY": 6, "كل 6 أشهر": 6, "6 أشهر": 6, "6 شهور": 6, "دفعتين": 6,
            "سنوي": 12, "YEARLY": 12, "كل سنة": 12, "دفعة واحدة": 12,
        };

        const freqKey = (normalizeString(newPaymentFrequency) || "").toUpperCase();
        console.log("freqKey:", freqKey);

        const sortedFreqKeys = Object.keys(frequencyMap).sort((a, b) => b.length - a.length);
        const matchedKey = sortedFreqKeys.find(k => freqKey.includes(k.toUpperCase()) || k.toUpperCase() === freqKey);
        let monthStep = matchedKey ? frequencyMap[matchedKey] : 0;

        console.log("monthStep:", monthStep);

        const contractStart = new Date(startDate);
        const contractEnd = new Date(endDate);

        console.log("Dates:", { contractStart, contractEnd });

        const periods = calculateInstallmentCount(contractStart, contractEnd, monthStep);
        console.log("Periods:", periods);

        const amountPerInvoice = Number(newRentAmount) / periods;
        console.log("Amount per invoice:", amountPerInvoice);

        // We won't actually delete/create here, just log
    } else {
        console.log("Condition NOT met");
    }
}

debug();
