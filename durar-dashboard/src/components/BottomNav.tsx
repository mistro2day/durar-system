import { NavLink } from "react-router-dom";
import { Home, FileText, Receipt, Building2, Settings as SettingsIcon, Wrench } from "lucide-react";
import { getRole } from "../lib/auth";
import { getSettings, hasPermission } from "../lib/settings";

export default function BottomNav() {
  const role = getRole();
  const site = getSettings();

  const items = [
    hasPermission(role, "dashboard.view", site) && { to: "/dashboard", label: "الرئيسية", icon: <Home className="w-5 h-5" /> },
    hasPermission(role, "contracts.view", site) && { to: "/contracts", label: "العقود", icon: <FileText className="w-5 h-5" /> },
    hasPermission(role, "invoices.view", site) && { to: "/invoices", label: "الفواتير", icon: <Receipt className="w-5 h-5" /> },
    hasPermission(role, "units.view", site) && { to: "/properties", label: "العقارات", icon: <Building2 className="w-5 h-5" /> },
    hasPermission(role, "maintenance.view", site) && { to: "/maintenance", label: "الصيانة", icon: <Wrench className="w-5 h-5" /> },
    hasPermission(role, "settings.view", site) && { to: "/settings", label: "الإعدادات", icon: <SettingsIcon className="w-5 h-5" /> },
  ].filter(Boolean) as Array<{ to: string; label: string; icon: JSX.Element }>;

  // حد أقصى 5 عناصر لعرض أنيق على الموبايل
  const visible = items.slice(0, 5);

  return (
    <div
      className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t bg-white/90 dark:bg-[var(--surface)]/90 backdrop-blur"
      style={{ borderColor: "var(--border)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px))" }}
      aria-label="شريط تنقل سفلي"
    >
      <nav className={`grid grid-cols-${visible.length} gap-1`}>
        {visible.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2 text-[11px] ${
                isActive ? "text-[--color-primary] font-semibold" : "text-gray-500"
              }`
            }
          >
            {item.icon}
            <span className="leading-none mt-0.5">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

