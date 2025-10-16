import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Home, FileText, Building2, Wrench, BarChart3, LogOut, Receipt, Settings as SettingsIcon, Shield, Users as UsersIcon, Hotel, Menu, X } from "lucide-react";
import { logout, getRole } from "../lib/auth";
import { hasPermission, getSettings } from "../lib/settings";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

export default function Layout() {
  const navigate = useNavigate();
  const role = getRole();
  const site = getSettings();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="w-72 min-h-screen tivo-sidebar flex-col hidden md:flex">
        <div className="tivo-brand">
          <div className="flex items-center gap-3">
            <Logo className="h-10" />
            <div>
              <h1 className="text-xl font-bold">درر العقارية</h1>
              <p className="text-[11px] text-white/70">لوحة الإدارة</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 tivo-nav">
          {hasPermission(role, "dashboard.view", site) && (
            <NavItem to="/dashboard" icon={<Home />} text="لوحة التحكم" />
          )}
          {hasPermission(role, "contracts.view", site) && (
            <NavItem to="/contracts" icon={<FileText />} text="العقود" />
          )}
          {hasPermission(role, "invoices.view", site) && (
            <NavItem to="/invoices" icon={<Receipt />} text="الفواتير" />
          )}
          {hasPermission(role, "units.view", site) && (
            <NavItem to="/properties" icon={<Building2 />} text="العقارات" />
          )}
          {hasPermission(role, "maintenance.view", site) && (
            <NavItem to="/maintenance" icon={<Wrench />} text="الصيانة" />
          )}
          <NavItem to="/reports" icon={<BarChart3 />} text="التقارير" />
          {hasPermission(role, "settings.view", site) && (
            <>
              <NavItem to="/settings" icon={<SettingsIcon />} text="الإعدادات" />
              {hasPermission(role, "users.view", site) && (
                <NavItem to="/settings/users" icon={<UsersIcon />} text="المستخدمون" />
              )}
              {hasPermission(role, "settings.edit", site) && (
                <NavItem to="/settings/permissions" icon={<Shield />} text="الصلاحيات" />
              )}
            </>
          )}

          {/* رابط تجريبي لفندق محدد (يمكن لاحقاً جعل اختيار الفندق ديناميكياً) */}
          <div className="mt-4 border-t border-white/10 pt-4">
            <NavItem to="/hotel/1/dashboard" icon={<Hotel />} text="الفندق" />
          </div>
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 rounded-lg text-white/80 hover:bg-white/10 transition"
          >
            <span className="w-5 h-5"><LogOut /></span>
            <span className="text-sm">تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Mobile sidebar (drawer) */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <aside className="absolute inset-y-0 right-0 w-72 tivo-sidebar flex flex-col shadow-xl">
            <div className="tivo-brand flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Logo className="h-8" />
                <h1 className="text-lg font-bold">درر</h1>
              </div>
              <button className="p-2 rounded-lg hover:bg-white/10" onClick={() => setMobileOpen(false)} aria-label="إغلاق القائمة">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 tivo-nav overflow-y-auto">
              {hasPermission(role, "dashboard.view", site) && (
                <NavItem to="/dashboard" icon={<Home />} text="لوحة التحكم" />
              )}
              {hasPermission(role, "contracts.view", site) && (
                <NavItem to="/contracts" icon={<FileText />} text="العقود" />
              )}
              {hasPermission(role, "invoices.view", site) && (
                <NavItem to="/invoices" icon={<Receipt />} text="الفواتير" />
              )}
              {hasPermission(role, "units.view", site) && (
                <NavItem to="/properties" icon={<Building2 />} text="العقارات" />
              )}
              {hasPermission(role, "maintenance.view", site) && (
                <NavItem to="/maintenance" icon={<Wrench />} text="الصيانة" />
              )}
              <NavItem to="/reports" icon={<BarChart3 />} text="التقارير" />
              {hasPermission(role, "settings.view", site) && (
                <>
                  <NavItem to="/settings" icon={<SettingsIcon />} text="الإعدادات" />
                  {hasPermission(role, "users.view", site) && (
                    <NavItem to="/settings/users" icon={<UsersIcon />} text="المستخدمون" />
                  )}
                  {hasPermission(role, "settings.edit", site) && (
                    <NavItem to="/settings/permissions" icon={<Shield />} text="الصلاحيات" />
                  )}
                </>
              )}
              <div className="mt-4 border-t border-white/10 pt-4">
                <NavItem to="/hotel/1/dashboard" icon={<Hotel />} text="الفندق" />
              </div>
            </nav>
            <div className="p-4 border-t border-white/10">
              <button
                onClick={() => { setMobileOpen(false); handleLogout(); }}
                className="w-full flex items-center gap-3 p-3 rounded-lg text-white/80 hover:bg-white/10 transition"
              >
                <span className="w-5 h-5"><LogOut /></span>
                <span className="text-sm">تسجيل الخروج</span>
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="tivo-topbar">
          <div className="tivo-container h-full flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button className="md:hidden inline-flex items-center justify-center p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                onClick={() => setMobileOpen(true)} aria-label="فتح القائمة">
                <Menu className="w-5 h-5" />
              </button>
              <input className="hidden md:block w-72 px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring focus:ring-indigo-100" placeholder="بحث..." />
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <div className="hidden sm:block text-sm text-gray-600">مرحبا!</div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500" />
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 md:p-8 tivo-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavItem({ to, icon, text }: { to: string; icon: React.ReactNode; text: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => (isActive ? "tivo-link-active" : "tivo-link")}
    >
      <span className="w-5 h-5">{icon}</span>
      <span className="text-sm">{text}</span>
    </NavLink>
  );
}
