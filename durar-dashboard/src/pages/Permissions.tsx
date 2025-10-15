import { useMemo, useState } from "react";
import {
  ALL_PERMISSIONS,
  getSettings,
  saveSettings,
  type PermissionKey,
  type RoleKey,
  type SiteSettings,
  fetchSettingsFromServer,
  saveSettingsToServer,
} from "../lib/settings";

const GROUPS: { title: string; keys: PermissionKey[] }[] = [
  { title: "لوحة التحكم", keys: ["dashboard.view"] },
  { title: "العقود", keys: ["contracts.view", "contracts.edit", "contracts.end", "contracts.delete"] },
  { title: "الفواتير", keys: ["invoices.view", "invoices.edit"] },
  { title: "الوحدات", keys: ["units.view", "units.edit"] },
  { title: "الصيانة", keys: ["maintenance.view", "maintenance.edit"] },
  { title: "الإعدادات", keys: ["settings.view", "settings.edit"] },
];

export default function Permissions() {
  const [site, setSite] = useState<SiteSettings>(getSettings());
  const [saving, setSaving] = useState(false);
  const roles = useMemo<RoleKey[]>(() => site.roles, [site.roles]);

  function isAll(role: RoleKey): boolean {
    return site.permissions[role] === "*";
  }
  function rolePerms(role: RoleKey): PermissionKey[] {
    const v = site.permissions[role];
    return v === "*" ? ALL_PERMISSIONS : (v as PermissionKey[]);
  }
  function toggleAll(role: RoleKey, value: boolean) {
    const clone = { ...site } as SiteSettings;
    clone.permissions = { ...clone.permissions };
    clone.permissions[role] = value ? "*" : ([] as PermissionKey[]);
    setSite(clone);
    saveSettings(clone);
    setSaving(true);
    saveSettingsToServer({ permissions: clone.permissions }).finally(() => setSaving(false));
  }
  function toggle(role: RoleKey, perm: PermissionKey, value: boolean) {
    const clone = { ...site } as SiteSettings;
    const current = rolePerms(role);
    const next = new Set(current);
    if (value) next.add(perm); else next.delete(perm);
    clone.permissions = { ...clone.permissions, [role]: Array.from(next) };
    setSite(clone);
    saveSettings(clone);
    setSaving(true);
    saveSettingsToServer({ permissions: clone.permissions }).finally(() => setSaving(false));
  }

  // تحميل أولي من السيرفر
  useState(() => {
    fetchSettingsFromServer().then((remote) => {
      if (remote) setSite(getSettings());
    });
  });

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">إعدادات الصلاحيات</h2>

      <div className="card p-4 overflow-x-auto">
        {saving ? <div className="text-xs text-gray-500 mb-2">جاري الحفظ...</div> : null}
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <Th>الصلاحية</Th>
              {roles.map((r) => (
                <Th key={r}>
                  <div className="flex items-center gap-2">
                    <span>{mapRole(r)}</span>
                    <label className="flex items-center gap-1 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={isAll(r)}
                        onChange={(e) => toggleAll(r, e.target.checked)}
                      />
                      الكل
                    </label>
                  </div>
                </Th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {GROUPS.map((g) => (
              <tr key={g.title} className="align-top">
                <Td>
                  <div>
                    <div className="font-semibold text-gray-800">{g.title}</div>
                    <div className="text-xs text-gray-500">{g.keys.map(mapPermLabel).join("، ")}</div>
                  </div>
                </Td>
                {roles.map((r) => (
                  <Td key={r}>
                    <div className="grid grid-cols-2 gap-2">
                      {g.keys.map((k) => (
                        <label key={k} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isAll(r) || rolePerms(r).includes(k)}
                            onChange={(e) => toggle(r, k, e.target.checked)}
                            disabled={isAll(r)}
                          />
                          <span className="text-xs">{mapPermLabel(k)}</span>
                        </label>
                      ))}
                    </div>
                  </Td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[12px] text-gray-500 mt-3">
        ملاحظة: يتم حفظ الصلاحيات محلياً حالياً. يمكن ربطها بقاعدة البيانات لاحقاً لتكون مشتركة بين جميع المستخدمين.
      </p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-right p-3 font-semibold text-gray-700">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="p-3 text-gray-800">{children}</td>;
}

function mapRole(r: RoleKey) {
  switch (r) {
    case "ADMIN":
      return "مدير";
    case "MANAGER":
      return "مشرف";
    case "STAFF":
      return "موظف";
    default:
      return r;
  }
}

function mapPermLabel(p: PermissionKey) {
  switch (p) {
    case "dashboard.view":
      return "عرض لوحة التحكم";
    case "contracts.view":
      return "عرض العقود";
    case "contracts.edit":
      return "تعديل العقود";
    case "contracts.end":
      return "إنهاء العقود";
    case "contracts.delete":
      return "حذف العقود";
    case "invoices.view":
      return "عرض الفواتير";
    case "invoices.edit":
      return "تعديل الفواتير";
    case "units.view":
      return "عرض الوحدات";
    case "units.edit":
      return "تعديل الوحدات";
    case "maintenance.view":
      return "عرض الصيانة";
    case "maintenance.edit":
      return "تعديل الصيانة";
    case "settings.view":
      return "عرض الإعدادات";
    case "settings.edit":
      return "تعديل الإعدادات";
    default:
      return p;
  }
}
