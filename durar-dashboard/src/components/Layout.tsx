import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Home,
  FileText,
  Building2,
  Wrench,
  BarChart3,
  LogOut,
  Receipt,
  Settings as SettingsIcon,
  Shield,
  Users as UsersIcon,
  Hotel,
  Menu,
  X,
  ClipboardList,
  ChevronDown,
  Bell,
  User,
  LogOut as LogOutIcon,
} from "lucide-react";
import { logout, getRole, getUser } from "../lib/auth";
import { hasPermission, getSettings } from "../lib/settings";
import { useLocaleTag } from "../lib/settings-react";
import api from "../lib/api";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import BottomNav from "./BottomNav";
import GlobalSearch from "./GlobalSearch";

type PropertySummary = { id: number; name: string };
type RawActivityUser = { name?: string | null } | string | null;
type RawActivityItem = {
  id?: number;
  action?: string;
  description?: string | null;
  createdAt?: string;
  user?: RawActivityUser;
};

type ActivityItem = {
  id: number;
  action: string;
  description?: string | null;
  createdAt: string;
  userName?: string | null;
};

const ACTIVITY_ACTION_LABELS: Record<string, string> = {
  "End Contract": "إنهاء العقد",
  "PROPERTY_CREATE": "إضافة عقار",
  "PROPERTY_UPDATE": "تحديث عقار",
  "MAINTENANCE_CREATE": "إضافة بلاغ صيانة",
  "MAINTENANCE_STATUS_UPDATE": "تغيير حالة الصيانة",
  "MAINTENANCE_ACTION_ADD": "إضافة إجراء صيانة",
  "MAINTENANCE_DELETE": "حذف بلاغ صيانة",
  "INVOICE_CREATE": "إنشاء فاتورة",
  "INVOICE_STATUS_UPDATE": "تغيير حالة فاتورة",
  "PAYMENT_RECORD": "تسجيل دفعة",
  "PAYMENT_UPDATE": "تعديل دفعة",
  "PAYMENT_DELETE": "حذف دفعة",
  "CONTRACT_CREATE": "إنشاء عقد",
  "CONTRACT_UPDATE": "تعديل عقد",
  "TENANT_CREATE": "إضافة مستأجر"
};

function translateActivityAction(action: string) {
  return ACTIVITY_ACTION_LABELS[action] || action;
}

export default function Layout() {
  const navigate = useNavigate();
  const role = getRole();
  const site = getSettings();
  const localeTag = useLocaleTag();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [mobilePropertiesOpen, setMobilePropertiesOpen] = useState(false);
  const user = getUser();
  const userName = user?.name || (site as any)?.userName || "مستخدم";
  const userInitial = userName.trim().charAt(0).toUpperCase() || "م";
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const propertiesHoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canViewActivities = hasPermission(role, "activity.view", site);

  useEffect(() => {
    if (!hasPermission(role, "units.view", site)) return;
    api
      .get<PropertySummary[]>("/api/properties")
      .then((res) => setProperties(res.data ?? []))
      .catch(() => setProperties([]));
  }, [role, site]);

  const loadActivities = useCallback(() => {
    if (!canViewActivities) {
      setActivities([]);
      return;
    }
    api
      .get("/api/activity?limit=10")
      .then((res) => {
        const body = res.data;
        const items = Array.isArray(body) ? body : body?.items;
        const rawItems = (Array.isArray(items) ? items : []) as RawActivityItem[];
        const normalized: ActivityItem[] = rawItems.map((item) => ({
          id: item.id ?? 0,
          action: item.action ?? "",
          description: item.description ?? null,
          createdAt: item.createdAt ?? "",
          userName:
            typeof item.user === "string"
              ? item.user
              : item.user?.name ?? null,
        }));
        setActivities(normalized);
      })
      .catch(() => setActivities([]));
  }, [canViewActivities]);

  useEffect(() => {
    loadActivities();
  }, [canViewActivities, loadActivities]);

  useEffect(() => {
    if (notificationsOpen) {
      loadActivities();
    }
  }, [notificationsOpen, loadActivities]);

  const clearPropertiesHoverTimeout = useCallback(() => {
    if (propertiesHoverTimeout.current !== null) {
      clearTimeout(propertiesHoverTimeout.current);
      propertiesHoverTimeout.current = null;
    }
  }, []);

  const openPropertiesMenu = useCallback(() => {
    clearPropertiesHoverTimeout();
    setPropertiesOpen(true);
  }, [clearPropertiesHoverTimeout]);

  const scheduleClosePropertiesMenu = useCallback(() => {
    clearPropertiesHoverTimeout();
    propertiesHoverTimeout.current = setTimeout(() => {
      setPropertiesOpen(false);
      propertiesHoverTimeout.current = null;
    }, 150);
  }, [clearPropertiesHoverTimeout]);

  useEffect(() => {
    return () => {
      clearPropertiesHoverTimeout();
    };
  }, [clearPropertiesHoverTimeout]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  function goToProfile() {
    setUserMenuOpen(false);
    navigate("/settings");
  }

  function logoutAndClose() {
    setUserMenuOpen(false);
    handleLogout();
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
            <div
              className="relative"
              onMouseEnter={openPropertiesMenu}
              onMouseLeave={scheduleClosePropertiesMenu}
            >
              <button
                type="button"
                className="tivo-link w-full justify-between"
                onClick={() => {
                  clearPropertiesHoverTimeout();
                  setPropertiesOpen(false);
                  navigate("/properties");
                }}
                onFocus={openPropertiesMenu}
                onBlur={scheduleClosePropertiesMenu}
                aria-haspopup="true"
                aria-expanded={propertiesOpen}
              >
                <span className="flex items-center gap-3">
                  <span className="w-5 h-5">
                    <Building2 />
                  </span>
                  <span className="text-sm">العقارات</span>
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${propertiesOpen ? "rotate-180" : ""}`} />
              </button>
              {propertiesOpen && (
                <div
                  className="sidebar-submenu absolute top-0 max-h-[70vh] overflow-y-auto backdrop-blur-lg min-w-[13rem]"
                  style={{ right: "calc(100% + 8px)" }}
                  onMouseEnter={openPropertiesMenu}
                  onMouseLeave={scheduleClosePropertiesMenu}
                >
                  {properties.length ? (
                    <div className="flex flex-col gap-1">
                      {properties.map((property) => (
                        <NavLink
                          key={property.id}
                          to={`/hotel/${property.id}/dashboard`}
                          onClick={() => {
                            clearPropertiesHoverTimeout();
                            setPropertiesOpen(false);
                          }}
                          className={({ isActive }) =>
                            `sidebar-submenu-item ${isActive ? "sidebar-submenu-item-active" : ""}`
                          }
                        >
                          <span className="inline-flex items-center justify-center w-5 h-5">
                            <Hotel />
                          </span>
                          <span className="flex-1 text-sm">{property.name || `#${property.id}`}</span>
                        </NavLink>
                      ))}
                    </div>
                  ) : (
                    <span className="sidebar-submenu-empty text-xs">لا توجد عقارات مسجلة</span>
                  )}
                </div>
              )}
            </div>
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
              {hasPermission(role, "activity.view", site) && (
                <NavItem to="/settings/activity" icon={<ClipboardList />} text="النشاطات" />
              )}
            </>
          )}

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
                <>
                  <button
                    type="button"
                    className="tivo-link w-full justify-between"
                    onClick={() => setMobilePropertiesOpen((prev) => !prev)}
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-5 h-5">
                        <Building2 />
                      </span>
                      <span className="text-sm">العقارات</span>
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${mobilePropertiesOpen ? "rotate-180" : ""}`} />
                  </button>
                  {mobilePropertiesOpen && (
                    <div className="flex flex-col gap-1 ms-6 mt-2">
                      {properties.length ? (
                        properties.map((property) => (
                          <NavLink
                            key={property.id}
                            to={`/hotel/${property.id}/dashboard`}
                            onClick={() => setMobileOpen(false)}
                            className={({ isActive }) =>
                              (isActive ? "tivo-link-active" : "tivo-link") + " text-[13px]"
                            }
                          >
                            <span className="w-5 h-5">
                              <Hotel />
                            </span>
                            <span className="text-sm">{property.name || `#${property.id}`}</span>
                          </NavLink>
                        ))
                      ) : (
                        <span className="text-xs text-white/60 px-3 py-1">لا توجد عقارات مسجلة</span>
                      )}
                    </div>
                  )}
                </>
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
                  {hasPermission(role, "activity.view", site) && (
                    <NavItem to="/settings/activity" icon={<ClipboardList />} text="النشاطات" />
                  )}
                </>
              )}
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
              <GlobalSearch />
            </div>
            <div className="flex items-center gap-3 relative z-20">
              <div className="relative" ref={notificationsRef}>
                <button
                  type="button"
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
                  onClick={() => setNotificationsOpen((prev) => !prev)}
                  aria-label="الإشعارات"
                >
                  <Bell className="w-5 h-5 text-gray-600" />
                </button>
                {notificationsOpen ? (
                  <div className="absolute top-full left-1/2 mt-2 w-[calc(100vw-32px)] max-w-sm -translate-x-1/2 translate-y-2 rounded-xl border border-gray-200 bg-white shadow-xl z-[60] md:left-auto md:right-0 md:top-auto md:mt-2 md:w-72 md:translate-x-0 md:translate-y-0">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <h4 className="text-sm font-semibold text-gray-800">آخر الأنشطة</h4>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {!canViewActivities ? (
                        <div className="px-4 py-6 text-center text-sm text-gray-500">
                          لا تملك صلاحية عرض سجل النشاطات.
                        </div>
                      ) : activities.length ? (
                        <ul className="flex flex-col gap-2">
                          {activities.map((a) => (
                            <li key={a.id} className="px-4 py-3 text-sm">
                              <p className="font-medium text-gray-800">{translateActivityAction(a.action)}</p>
                              {a.description ? <p className="text-xs text-gray-500 mt-1">{a.description}</p> : null}
                              <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2">
                                <span>{new Date(a.createdAt).toLocaleString(localeTag)}</span>
                                {a.userName ? <span>بواسطة: {a.userName}</span> : null}
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="px-4 py-6 text-center text-sm text-gray-500">لا توجد أنشطة حديثة.</div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
              <ThemeToggle />
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  aria-label="قائمة المستخدم"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 grid place-items-center text-white font-semibold">
                    {userInitial}
                  </div>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-sm font-medium text-gray-900">مرحباً، {userName}</span>
                    <span className="text-xs text-gray-500">إدارة الملف الشخصي</span>
                  </div>
                  <ChevronDown className={`hidden sm:block w-4 h-4 text-gray-400 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {userMenuOpen ? (
                  <div className="absolute top-full left-1/2 mt-2 w-[calc(100vw-32px)] max-w-sm -translate-x-1/2 translate-y-2 rounded-xl border border-gray-200 bg-white shadow-xl z-[60] md:left-auto md:right-0 md:w-64 md:translate-x-0 md:translate-y-0 md:top-auto md:mt-2">
                    <button
                      type="button"
                      onClick={goToProfile}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      <User className="w-4 h-4" />
                      <span>تعديل الملف الشخصي</span>
                    </button>
                    <button
                      type="button"
                      onClick={logoutAndClose}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOutIcon className="w-4 h-4" />
                      <span>تسجيل الخروج</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 md:p-8 pb-24 md:pb-8 tivo-container">
          <Outlet />
        </main>
        {/* Bottom navigation on mobile */}
        <BottomNav />
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

