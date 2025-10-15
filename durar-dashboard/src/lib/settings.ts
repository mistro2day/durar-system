export type RoleKey = "ADMIN" | "MANAGER" | "STAFF";
export type PermissionKey =
  | "dashboard.view"
  | "contracts.view"
  | "contracts.edit"
  | "contracts.end"
  | "contracts.delete"
  | "invoices.view"
  | "invoices.edit"
  | "units.view"
  | "units.edit"
  | "maintenance.view"
  | "maintenance.edit"
  | "users.view"
  | "users.edit"
  | "settings.view"
  | "settings.edit";

export const ALL_PERMISSIONS: PermissionKey[] = [
  "dashboard.view",
  "contracts.view",
  "contracts.edit",
  "contracts.end",
  "contracts.delete",
  "invoices.view",
  "invoices.edit",
  "units.view",
  "units.edit",
  "maintenance.view",
  "maintenance.edit",
  "users.view",
  "users.edit",
  "settings.view",
  "settings.edit",
];

export type SiteSettings = {
  companyName: string;
  companyCR: string;
  companyPhone: string;
  companyEmail: string;
  companyAddress: string;
  vatPercent: number; // integer percent e.g., 15
  roles: RoleKey[];
  permissions: Record<RoleKey, PermissionKey[] | "*">; // "*" means all permissions
  locale: "ar" | "en";
  calendar: "gregorian" | "hijri";
};

const STORAGE_KEY = "siteSettings";

export function getDefaultSettings(): SiteSettings {
  const env: any = (import.meta as any).env || {};
  const vat = Number(env.VITE_VAT_PERCENT || 0);
  return {
    companyName: env.VITE_COMPANY_NAME || "شركة درر العقارية",
    companyCR: env.VITE_COMPANY_CR || "1234567890",
    companyPhone: env.VITE_COMPANY_PHONE || "9200 00000",
    companyEmail: env.VITE_COMPANY_EMAIL || "info@durar.sa",
    companyAddress: env.VITE_COMPANY_ADDRESS || "الرياض، المملكة العربية السعودية",
    vatPercent: Number.isFinite(vat) ? vat : 0,
    roles: ["ADMIN", "MANAGER", "STAFF"],
    permissions: {
      ADMIN: "*",
      MANAGER: [
        "dashboard.view",
        "contracts.view",
        "contracts.edit",
        "contracts.end",
        "invoices.view",
        "invoices.edit",
        "units.view",
        "units.edit",
        "maintenance.view",
        "maintenance.edit",
        "users.view",
        "settings.view",
      ],
      STAFF: [
        "dashboard.view",
        "contracts.view",
        "invoices.view",
        "units.view",
        "maintenance.view",
      ],
    },
    locale: (env.VITE_DEFAULT_LOCALE === 'en' ? 'en' : 'ar') as any,
    calendar: (env.VITE_DEFAULT_CALENDAR === 'hijri' ? 'hijri' : 'gregorian') as any,
  };
}

export function getSettings(): SiteSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultSettings();
    const parsed = JSON.parse(raw);
    const def = getDefaultSettings();
    return {
      companyName: parsed.companyName ?? def.companyName,
      companyCR: parsed.companyCR ?? def.companyCR,
      companyPhone: parsed.companyPhone ?? def.companyPhone,
      companyEmail: parsed.companyEmail ?? def.companyEmail,
      companyAddress: parsed.companyAddress ?? def.companyAddress,
      vatPercent: Number.isFinite(Number(parsed.vatPercent)) ? Number(parsed.vatPercent) : def.vatPercent,
      roles: Array.isArray(parsed.roles) ? (parsed.roles as RoleKey[]) : def.roles,
      permissions: parsed.permissions ?? def.permissions,
      locale: parsed.locale === 'en' ? 'en' : 'ar',
      calendar: parsed.calendar === 'hijri' ? 'hijri' : 'gregorian',
    };
  } catch {
    return getDefaultSettings();
  }
}

export function saveSettings(s: SiteSettings) {
  const payload: SiteSettings = {
    ...getDefaultSettings(),
    ...s,
    vatPercent: Number.isFinite(Number(s.vatPercent)) ? Number(s.vatPercent) : 0,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('settings:changed'));
  }
}

export function hasPermission(role: string | undefined, perm: PermissionKey, settings?: SiteSettings): boolean {
  const site = settings || getSettings();
  const upper = (role || "").toUpperCase();
  const key = (upper === "USER" ? "STAFF" : (upper as RoleKey)) || "STAFF";
  const set = site.permissions[key];
  if (set === "*") return true;
  return Array.isArray(set) ? set.includes(perm) : false;
}

// --- ربط بالباكند ---
import api from "./api";

export async function fetchSettingsFromServer(): Promise<Partial<SiteSettings> | null> {
  try {
    const res = await api.get("/api/settings/permissions");
    const current = getSettings();
    const merged = { ...current, ...res.data } as SiteSettings;
    saveSettings(merged);
    return res.data as Partial<SiteSettings>;
  } catch {
    return null;
  }
}

export async function saveSettingsToServer(partial: Partial<SiteSettings>): Promise<boolean> {
  try {
    // فقط أرسل حقول الصلاحيات/الأدوار إلى السيرفر حالياً
    const payload: any = {};
    if (partial.roles) payload.roles = partial.roles;
    if (partial.permissions) payload.permissions = partial.permissions;
    await api.put("/api/settings/permissions", payload);
    // حدث التخزين المحلي ليبقى متزامناً
    const current = getSettings();
    saveSettings({ ...current, ...partial });
    return true;
  } catch {
    return false;
  }
}

// i18n helpers
export function getLocaleTag(): string {
  // توحيد التقويم إلى الميلادي في كامل المشروع
  const s = getSettings();
  if (s.locale === 'en') return 'en-US';
  // تقويم ميلادي مع عرض عربي للأشهر والأرقام
  return 'ar-u-ca-gregory';
}
