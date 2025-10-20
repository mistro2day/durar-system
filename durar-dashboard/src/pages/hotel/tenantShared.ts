import { DEFAULT_DATE_LOCALE } from "../../lib/settings";

export type TenantContract = {
  id: number;
  status: string;
  rentalType?: string | null;
  startDate: string;
  endDate: string;
  unitNumber?: string | null;
  propertyName?: string | null;
  propertyId?: number | null;
  rentAmount?: number | null;
  amount?: number | null;
  deposit?: number | null;
  ejarContractNumber?: string | null;
  paymentMethod?: string | null;
  paymentFrequency?: string | null;
  servicesIncluded?: string | null;
  notes?: string | null;
};

export type TenantInvoice = {
  id: number;
  amount: number;
  status: string;
  dueDate?: string | null;
};

export type TenantStats = {
  totalContracts: number;
  activeContracts: number;
  totalInvoices: number;
  pendingInvoices: number;
  lastInvoiceDueDate?: string | null;
  receivables: number;
  latestContract: TenantContract | null;
};

export type TenantSummary = {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  nationalId?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  nationality?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  employer?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  notes?: string | null;
  createdAt: string;
  stats?: TenantStats;
  recentContracts?: TenantContract[];
  contracts?: TenantContract[];
  invoices?: TenantInvoice[];
};

export type TenantDetail = TenantSummary & {
  contracts: TenantContract[];
  invoices: TenantInvoice[];
};

export const NATIONALITIES: string[] = [
  "سعودي",
  "إماراتي",
  "كويتي",
  "بحريني",
  "قطري",
  "عماني",
  "يمني",
  "مصري",
  "سوداني",
  "أردني",
  "فلسطيني",
  "سوري",
  "لبناني",
  "عراقي",
  "مغربي",
  "جزائري",
  "تونسي",
  "ليبي",
  "موريتاني",
  "صومالي",
  "إريتري",
  "إثيوبي",
  "باكستاني",
  "هندي",
  "بنغالي",
  "فلبيني",
  "تركي",
  "إيراني",
  "أفغاني",
  "نيبالي",
  "سريلانكي",
  "إندونيسي",
  "ماليزي",
  "صيني",
  "ياباني",
  "كوري",
  "أمريكي",
  "كندي",
  "بريطاني",
  "فرنسي",
  "ألماني",
  "إسباني",
  "إيطالي",
  "يوناني",
  "روسي",
  "برازيلي",
  "أسترالي",
  "جنوب أفريقي",
  "نيجيري",
  "أوكراني",
  "بولندي",
];

export const EMPTY_STATS: TenantStats = {
  totalContracts: 0,
  activeContracts: 0,
  totalInvoices: 0,
  pendingInvoices: 0,
  lastInvoiceDueDate: null,
  receivables: 0,
  latestContract: null,
};

export function formatValue(value?: string | null) {
  if (!value) return "—";
  const trimmed = value.toString().trim();
  return trimmed.length ? trimmed : "—";
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(DEFAULT_DATE_LOCALE);
  } catch {
    return value;
  }
}

export function formatBirth(value?: string | null) {
  if (!value) return "—";
  const date = formatDate(value);
  const age = calculateAge(value);
  return age ? `${date} — ${age} سنة` : date;
}

export function calculateAge(value?: string | null) {
  if (!value) return null;
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

export function mapGender(value?: string | null) {
  if (!value) return "—";
  const normalized = value.toUpperCase();
  if (normalized === "MALE") return "ذكر";
  if (normalized === "FEMALE") return "أنثى";
  return value;
}

export function buildAddress(tenant: { address?: string | null; city?: string | null; country?: string | null }) {
  const parts = [tenant.address, tenant.city, tenant.country].filter((part) => part && part.trim().length);
  return parts.length ? parts.join(" - ") : null;
}

export function buildEmergency(tenant: { emergencyContactName?: string | null; emergencyContactPhone?: string | null }) {
  const parts = [tenant.emergencyContactName, tenant.emergencyContactPhone]
    .filter((part) => part && part.trim().length)
    .join(" — ");
  return parts || null;
}

export function formatRange(start?: string | null, end?: string | null) {
  if (!start && !end) return "—";
  return `${formatDate(start || undefined)} → ${formatDate(end || undefined)}`;
}

export function mapContractStatus(status?: string | null) {
  switch (status) {
    case "ACTIVE":
      return "نشط";
    case "ENDED":
      return "منتهي";
    case "CANCELLED":
      return "ملغى";
    default:
      return status || "غير معروف";
  }
}

export function mapRentalType(value?: string | null) {
  switch (value) {
    case "DAILY":
      return "يومي";
    case "YEARLY":
      return "سنوي";
    case "MONTHLY":
    default:
      return "شهري";
  }
}
