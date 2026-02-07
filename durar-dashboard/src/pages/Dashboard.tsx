import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { RefreshCw, FileText, Building2, Wrench, Coins, Phone, RotateCcw, MessageCircle, MessageSquare, X } from "lucide-react";
// حمّل مكونات الرسوم بشكل كسول لتقليل وزن حزمة التحميل الأولى
const Line = lazy(() => import("react-chartjs-2").then(m => ({ default: m.Line })));
const Doughnut = lazy(() => import("react-chartjs-2").then(m => ({ default: m.Doughnut })));
const Bar = lazy(() => import("react-chartjs-2").then(m => ({ default: m.Bar })));
// سجّل فقط العناصر المطلوبة من Chart.js بدل "auto" لتقليل الحجم
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, BarElement, Tooltip, Legend } from "chart.js";
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, BarElement, Tooltip, Legend);
import { useLocaleTag } from "../lib/settings-react";
import { formatSAR } from "../lib/currency";
import Currency from "../components/Currency";
import SortHeader from "../components/SortHeader";
import { useTableSort } from "../hooks/useTableSort";
import useThemeMode from "../hooks/useThemeMode";
import { useParams, Link } from "react-router-dom";
import api from "../lib/api";
import LoadingOverlay from "../components/LoadingOverlay";
import { InvoiceStatusSelect } from "../components/InvoiceStatusSelect";
import { RenewContractModal } from "../components/RenewContractModal";

type DashboardResponse = {
  summary: {
    contracts: { active: number; ended: number; newThisMonth: number };
    units: { available: number; occupied: number; maintenance?: number };
    maintenance: { open: number; inProgress: number };
    revenue: number;
  };
  charts?: {
    revenueLast6Months?: Array<{ key: string; value: number }>;
    occupancy?: { labels: string[]; values: number[] };
    expiring?: { week: number; month: number };
  };
  activities: Array<{
    id: number;
    action: string;
    description: string;
    createdAt: string;
    user: string;
  }>;
  lastUpdated: string | Date;
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ label: string; value: number }[]>([]);
  const [invoiceStatusTotals, setInvoiceStatusTotals] = useState<{ paid: number; pending: number; overdue: number }>({
    paid: 0,
    pending: 0,
    overdue: 0,
  });
  const [renewingContract, setRenewingContract] = useState<any | null>(null);
  const [propertyRevenue, setPropertyRevenue] = useState<Array<{ label: string; value: number }>>([]);
  const [occupancy, setOccupancy] = useState<{ labels: string[]; values: number[] }>({ labels: [], values: [] });
  const params = useParams();
  const propertyId = (params as any)?.id as string | undefined;
  const [contracts, setContracts] = useState<any[]>([]);
  const [lateInvoices, setLateInvoices] = useState<any[]>([]);
  const [lateInvoicesPage, setLateInvoicesPage] = useState<number>(1);
  const [lateInvoicesTotal, setLateInvoicesTotal] = useState<number>(0);
  const lateInvoicesPageSize = 5;
  const [upcomingInvoices, setUpcomingInvoices] = useState<any[]>([]);
  const [upcomingInvoicesPage, setUpcomingInvoicesPage] = useState<number>(1);
  const [upcomingInvoicesTotal, setUpcomingInvoicesTotal] = useState<number>(0);
  const upcomingInvoicesPageSize = 5;
  const [range, setRange] = useState<'week' | 'month'>('week');
  const [rangeMonths, setRangeMonths] = useState<number>(6);
  const visibleRevenue = useMemo(() => {
    if (!monthlyRevenue.length) return [];
    if (!rangeMonths) return monthlyRevenue;
    return monthlyRevenue.slice(-rangeMonths);
  }, [monthlyRevenue, rangeMonths]);
  const visibleRevenueTotal = useMemo(
    () => visibleRevenue.reduce((sum, item) => sum + Number(item.value || 0), 0),
    [visibleRevenue]
  );
  const [showOverlay, setShowOverlay] = useState(false);
  const overlayTimers = useRef<{ delay?: any; hide?: any; startedAt?: number }>({});
  const [firstLoad, setFirstLoad] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const fontStack = 'Tajawal, Poppins, ui-sans-serif, system-ui, Segoe UI, Arial, sans-serif';
  // اقرأ ألوان التصميم من متغيرات CSS لضمان التناسق
  const themeMode = useThemeMode();
  const isDark = themeMode === "dark";

  const themeColors = useMemo(() => {
    const fallback = {
      success: "#54BA4A",
      danger: "#E4606D",
      warning: "#FFAA05",
      text: isDark ? "#DEE4FF" : "#1F2937",
      axis: isDark ? "#E7EAF3" : "#0F172A",
      grid: isDark ? "rgba(231,234,243,0.18)" : "rgba(15,23,42,0.14)",
      border: isDark ? "rgba(231,234,243,0.28)" : "rgba(15,23,42,0.18)",
    };
    try {
      const css = getComputedStyle(document.documentElement);
      const read = (name: string, fb: string) => {
        const value = css.getPropertyValue(name);
        return value ? value.trim() : fb;
      };
      return {
        success: read("--color-success", fallback.success),
        danger: read("--color-danger", fallback.danger),
        warning: read("--color-warning", fallback.warning),
        text: read("--text-primary", fallback.text),
        axis: read("--chart-axis", fallback.axis),
        grid: read("--chart-grid", fallback.grid),
        border: read("--chart-border", fallback.border),
      };
    } catch {
      return fallback;
    }
  }, [isDark]);

  const axisColor = themeColors.axis;
  const gridColor = themeColors.grid;
  const borderColor = themeColors.border;
  const tooltipBackground = isDark ? "rgba(8,12,32,0.92)" : "rgba(255,255,255,0.95)";
  const tooltipTitleColor = isDark ? "#F6F7FF" : "#111827";
  const tooltipBodyColor = isDark ? "#F6F7FF" : "#1F2937";
  const invoiceStatusEntries = useMemo(
    () => [
      { label: "مدفوعة", value: invoiceStatusTotals.paid, color: themeColors.success },
      { label: "مستحقة", value: invoiceStatusTotals.pending, color: themeColors.warning },
      { label: "متأخرة", value: invoiceStatusTotals.overdue, color: themeColors.danger },
    ],
    [invoiceStatusTotals.overdue, invoiceStatusTotals.paid, invoiceStatusTotals.pending, themeColors.danger, themeColors.success, themeColors.warning]
  );
  const invoiceOutstanding = useMemo(
    () => invoiceStatusTotals.pending + invoiceStatusTotals.overdue,
    [invoiceStatusTotals.pending, invoiceStatusTotals.overdue]
  );
  const propertyRevenueTop = useMemo(() => {
    const sorted = [...propertyRevenue].sort((a, b) => b.value - a.value);
    const top = sorted.slice(0, 5);
    const others = sorted.slice(5);
    const othersTotal = others.reduce((sum, item) => sum + item.value, 0);
    return othersTotal > 0
      ? [...top, { label: "أخرى", value: othersTotal }]
      : top;
  }, [propertyRevenue]);


  const propertyRevenueTotal = useMemo(
    () => propertyRevenue.reduce((sum, item) => sum + item.value, 0),
    [propertyRevenue]
  );
  const propertyRevenueColors = useMemo(() => {
    const palette = [
      themeColors.success,
      themeColors.warning,
      themeColors.danger,
      "#38BDF8",
      "#A855F7",
      "#F97316",
    ];
    return propertyRevenueTop.map((_, idx) => palette[idx % palette.length]);
  }, [propertyRevenueTop, themeColors.danger, themeColors.success, themeColors.warning]);


  const lastUpdatedText = useMemo(() => {
    if (!data?.lastUpdated) return "";
    try {
      const d = new Date(data.lastUpdated);
      return d.toLocaleString("ar-u-ca-gregory");
    } catch {
      return "";
    }
  }, [data?.lastUpdated]);

  const localeTag = useLocaleTag();

  function formatNumber(n: number) {
    return new Intl.NumberFormat('en-US').format(n ?? 0);
  }

  // استخدم رمز ﷼ أو المعرّف من البيئة بدل "ر.س"
  function formatCurrency(n: number) {
    return formatSAR(n);
  }

  async function fetchSummary(): Promise<void> {
    setError(null);
    try {
      // المحاولة أولاً على endpoint المطلوب
      const res = await api.get<DashboardResponse>(`/api/dashboard/summary${propertyId ? `?propertyId=${propertyId}` : ""}`);
      setData(res.data);
      if (res.data?.charts?.revenueLast6Months) {
        const formatter = new Intl.DateTimeFormat("ar-u-ca-gregory", { month: "short" });
        setMonthlyRevenue(res.data.charts.revenueLast6Months.map((m) => {
          const [y, mo] = m.key.split('-').map(Number);
          return { label: formatter.format(new Date(y, (mo || 1) - 1, 1)), value: m.value };
        }));
      }
      if (res.data?.charts?.occupancy) setOccupancy(res.data.charts.occupancy);
    } catch (error: unknown) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[dashboard] summary fallback", error);
      }
      // إن لم يتوفر (مثلاً 404) نرجع للمسار القديم /api/dashboard
      try {
        const res2 = await api.get<DashboardResponse>(`/api/dashboard${propertyId ? `?propertyId=${propertyId}` : ""}`);
        setData(res2.data);
      } catch (e2: any) {
        setError(e2?.response?.data?.message || "حدث خطأ أثناء الجلب");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setFirstLoad(false);
    }
  }

  async function waitForServer(maxMs = 15000) {
    setConnecting(true);
    const start = Date.now();
    let delay = 500;
    while (Date.now() - start < maxMs) {
      try {
        const r = await api.get("/api/health");
        if (r?.data?.status === "ok") break;
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.debug("[dashboard] health check pending", err);
        }
      }
      await new Promise((res) => setTimeout(res, delay));
      delay = Math.min(2500, Math.floor(delay * 1.5));
    }
    setConnecting(false);
  }

  async function fetchMonthlyRevenue() {
    try {
      const res = await api.get<any[]>(`/api/invoices${propertyId ? `?propertyId=${propertyId}` : ""}`);
      const now = new Date();
      // اجمع آخر 12 شهرًا بما فيها الشهر الحالي
      const months: { key: string; date: Date }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({ key: `${d.getFullYear()}-${d.getMonth() + 1}`.padStart(7, "0"), date: d });
      }

      const map = new Map<string, number>();
      const propertyMap = new Map<string, number>();
      months.forEach((m) => map.set(m.key, 0));
      const statusTotals = { paid: 0, pending: 0, overdue: 0 };

      const invoices = Array.isArray(res.data) ? res.data : [];

      for (const inv of invoices) {
        const amount = Number(inv.amount || 0);
        const status = String(inv.status || "").toUpperCase();
        const paidAmount = (inv.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
        const remainingAmount = amount - paidAmount;

        statusTotals.paid += paidAmount;

        switch (status) {
          case "PAID":
            // Already added to paidAmount
            break;
          case "OVERDUE":
            statusTotals.overdue += remainingAmount;
            break;
          case "PARTIAL":
          case "PENDING":
          default:
            const isLate = inv.dueDate && new Date(inv.dueDate) < new Date();
            if (isLate) {
              statusTotals.overdue += remainingAmount;
            } else {
              statusTotals.pending += remainingAmount;
            }
            break;
        }

        const propertyName =
          inv.contract?.unit?.property?.name ||
          inv.contract?.unit?.property?.id?.toString() ||
          "غير محدد";
        propertyMap.set(propertyName, (propertyMap.get(propertyName) || 0) + amount);

        const d = inv.dueDate ? new Date(inv.dueDate) : null;
        if (!d) continue;
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`.padStart(7, "0");
        if (map.has(key)) {
          const prev = map.get(key) || 0;
          map.set(key, prev + amount);
        }
      }

      const formatter = new Intl.DateTimeFormat("ar-u-ca-gregory", { month: "short" });
      const dataset = months.map((m) => ({ label: `${formatter.format(m.date)}`, value: map.get(m.key) || 0 }));
      setMonthlyRevenue(dataset);
      setInvoiceStatusTotals(statusTotals);
      const propertyData = Array.from(propertyMap.entries())
        .map(([label, value]) => ({ label, value }))
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value);
      setPropertyRevenue(propertyData);
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[dashboard] monthly revenue fetch failed", err);
      }
      setPropertyRevenue([]);
    }
  }

  useEffect(() => {
    // اضبط خط Chart.js ليتطابق مع خط الموقع
    try {
      ChartJS.defaults.font.family = fontStack;
      ChartJS.defaults.font.size = 12;
      // لون النص في الرسوم من متغير CSS العام
      const root = getComputedStyle(document.documentElement);
      const textColor = root.getPropertyValue('--text') || '#1f2937';
      ChartJS.defaults.color = String(textColor).trim();
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[dashboard] chart defaults not applied", err);
      }
    }
    // انتظر جاهزية الخادم عند إعادة التشغيل ثم حمّل البيانات
    (async () => {
      setLoading(true);
      await waitForServer();
      await fetchSummary();
      await fetchMonthlyRevenue();
    })();
    // جلب العقود لبطاقة "العقود القريبة الانتهاء"
    api.get(`/api/contracts${propertyId ? `?propertyId=${propertyId}` : ''}`)
      .then(r => setContracts(r.data || []))
      .catch(() => setContracts([]));

    fetchLateInvoices(1);
    fetchUpcomingInvoices(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  function fetchLateInvoices(page: number) {
    api.get(`/api/invoices?status=overdue&page=${page}&pageSize=${lateInvoicesPageSize}${propertyId ? `&propertyId=${propertyId}` : ''}`)
      .then(r => {
        if (r.data.items) {
          setLateInvoices(r.data.items);
          setLateInvoicesTotal(r.data.total || 0);
          setLateInvoicesPage(page);
        } else {
          setLateInvoices(Array.isArray(r.data) ? r.data : []);
          setLateInvoicesTotal(Array.isArray(r.data) ? r.data.length : 0);
          setLateInvoicesPage(1);
        }
      })
      .catch(() => {
        setLateInvoices([]);
        setLateInvoicesTotal(0);
      });
  }

  function fetchUpcomingInvoices(page: number) {
    api.get(`/api/invoices?status=upcoming&page=${page}&pageSize=${upcomingInvoicesPageSize}${propertyId ? `&propertyId=${propertyId}` : ''}`)
      .then(r => {
        if (r.data.items) {
          setUpcomingInvoices(r.data.items);
          setUpcomingInvoicesTotal(r.data.total || 0);
          setUpcomingInvoicesPage(page);
        } else {
          setUpcomingInvoices(Array.isArray(r.data) ? r.data : []);
          setUpcomingInvoicesTotal(Array.isArray(r.data) ? r.data.length : 0);
          setUpcomingInvoicesPage(1);
        }
      })
      .catch(() => {
        setUpcomingInvoices([]);
        setUpcomingInvoicesTotal(0);
      });
  }

  function handleLateInvoiceStatusUpdate(id: number, status: string) {
    if (status !== 'PENDING') {
      // Optimistic update: remove from list if no longer pending/overdue
      setLateInvoices(prev => prev.filter(inv => inv.id !== id));
      setLateInvoicesTotal(prev => Math.max(0, prev - 1));
    }
    // If status is still PENDING, we keep it, but UI will update via the component's internal state + re-render if needed
    // Ideally we would fetchSummary/revenue too as they might change
    fetchSummary();
  }

  function handleUpcomingInvoiceStatusUpdate(id: number, status: string) {
    if (status !== 'PENDING') {
      setUpcomingInvoices(prev => prev.filter(inv => inv.id !== id));
      setUpcomingInvoicesTotal(prev => Math.max(0, prev - 1));
    }
    fetchSummary();
  }

  function handleRefresh() {
    setRefreshing(true);
    fetchSummary().then(() => fetchMonthlyRevenue());
  }

  // إدارة ظهور أداة التحميل لتفادي الوميض: تفعيلها فقط بعد أول تحميل
  useEffect(() => {
    if (firstLoad) { setShowOverlay(false); return; }
    const isBusy = refreshing; // لا نعرضها على التحميل الأول، فقط على التحديثات
    const timers = overlayTimers.current;
    if (isBusy) {
      timers.startedAt = Date.now();
      // أظهر فقط إذا تجاوز 200ms لتفادي الوميض
      timers.delay = setTimeout(() => setShowOverlay(true), 200);
    } else {
      // اضمن حدًا أدنى 400ms للعرض قبل الإخفاء لتجربة سلسة
      const elapsed = (Date.now() - (timers.startedAt || Date.now()));
      const remain = Math.max(0, 400 - elapsed);
      clearTimeout(timers.delay);
      timers.hide = setTimeout(() => setShowOverlay(false), remain);
    }
    return () => {
      clearTimeout(timers.delay);
      clearTimeout(timers.hide);
    };
  }, [refreshing, firstLoad]);

  if (loading) {
    return (
      <div>
        <Header onRefresh={handleRefresh} refreshing />
        <SkeletonDashboard />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header onRefresh={handleRefresh} refreshing={refreshing} />
        <div className="mt-10 bg-white rounded-xl shadow p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <Header onRefresh={handleRefresh} refreshing={refreshing} />
        <SkeletonDashboard />
      </div>
    );
  }

  const summary = data.summary;
  return (
    <div>
      <LoadingOverlay visible={showOverlay || (firstLoad && connecting)} text={connecting ? 'جارٍ الاتصال بالخادم...' : 'جارٍ تحميل البيانات...'} />
      <Header onRefresh={handleRefresh} refreshing={refreshing} lastUpdated={lastUpdatedText} rangeMonths={rangeMonths} onRangeChange={(v) => setRangeMonths(v)} />

      {/* البطاقات الرئيسية (أعلى الصفحة) */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          title="العقود النشطة"
          value={formatNumber(summary.contracts.active)}
          subtitle={(
            <div className="flex items-center justify-between">
              <span>منتهية: {formatNumber(summary.contracts.ended)}</span>
              <span>الجديدة هذا الشهر: {formatNumber(summary.contracts.newThisMonth)}</span>
            </div>
          )}
          color="blue"
          icon={<FileText className="w-5 h-5" />}
        />
        <StatCard
          title="الوحدات المتاحة"
          value={formatNumber(summary.units.available)}
          subtitle={`المشغولة: ${formatNumber(summary.units.occupied)}`}
          color="green"
          icon={<Building2 className="w-5 h-5" />}
        />
        <StatCard
          title="بلاغات الصيانة المفتوحة"
          value={formatNumber(summary.maintenance.open)}
          subtitle={`قيد المعالجة: ${formatNumber(summary.maintenance.inProgress)}`}
          color="amber"
          icon={<Wrench className="w-5 h-5" />}
        />
        <StatCard
          title="الإيرادات الشهرية"
          value={formatCurrency(summary.revenue)}
          subtitle="تطور الإيرادات"
          color="purple"
          icon={<Coins className="w-5 h-5" />}
        />
      </div>

      {/* المخططات المكملة */}
      <div className="grid grid-cols-12 gap-6 items-stretch">
        <div className="col-span-12 md:col-span-4 md:col-start-1 md:row-start-1 card h-full min-h-[360px]">
          <div className="text-sm font-semibold text-indigo-600/80 mb-2">• نسب الإشغال</div>
          {(() => {
            const labels = occupancy.labels.length ? occupancy.labels : ["متاحة", "مشغولة", "صيانة"];
            const values = occupancy.values.length ? occupancy.values : [summary.units.available || 0, summary.units.occupied || 0, (summary.units.maintenance || 0)];
            const colors = [themeColors.success, themeColors.danger, themeColors.warning];
            const total = values.reduce((a: number, b: number) => a + Number(b || 0), 0) || 1;
            const pct = (i: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format((Number(values[i] || 0) * 100) / total);
            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative h-56">
                    <Suspense fallback={<div className="w-full h-full animate-pulse bg-gray-100 rounded" />}>
                      <Doughnut
                        key={`occupancy-${themeMode}`}
                        data={{
                          labels, datasets: [{
                            data: values as any,
                            backgroundColor: colors,
                            borderColor: '#fff',
                            borderWidth: 2,
                            spacing: 2,
                            hoverOffset: 6,
                          }]
                        }}
                        options={{
                          plugins: {
                            legend: { display: false },
                            tooltip: {
                              backgroundColor: tooltipBackground,
                              titleColor: tooltipTitleColor,
                              bodyColor: tooltipBodyColor,
                              titleFont: { family: fontStack },
                              bodyFont: { family: fontStack },
                              callbacks: { label: (ctx: any) => `${labels[ctx.dataIndex]}: ${values[ctx.dataIndex]} (${pct(ctx.dataIndex)}%)` },
                            },
                          },
                          maintainAspectRatio: false,
                          cutout: '72%' as any,
                          animation: { animateRotate: true, duration: 900, easing: 'easeOutQuart' },
                        }}
                      />
                    </Suspense>
                    <div className="absolute inset-0 grid place-items-center pointer-events-none">
                      <div className="text-center">
                        <div className="text-2xl font-extrabold" style={{ color: themeColors.text }}>{new Intl.NumberFormat('en-US').format(total)}</div>
                        <div className="text-xs" style={{ color: themeColors.text }}>إجمالي الوحدات</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col justify-center gap-3">
                    {labels.map((lab, i) => {
                      const count = Number(values[i] || 0);
                      const countLabel = new Intl.NumberFormat('en-US').format(count);
                      return (
                        <div key={lab} className="flex items-center justify-between p-2 rounded-lg border border-gray-100">
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-3.5 h-3.5 rounded" style={{ backgroundColor: colors[i] }} />
                            <span className="text-[15px]" style={{ color: themeColors.text }}>{lab}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-lg md:text-xl font-extrabold" style={{ color: colors[i] }}>{pct(i)}%</div>
                            <div className="text-[11px] text-gray-500">{countLabel} وحدة</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* مفتاح الألوان */}
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm" style={{ color: themeColors.text }}>
                  {labels.map((lab, i) => (
                    <div key={`legend-${lab}`} className="inline-flex items-center gap-2">
                      <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: colors[i] }} />
                      <span>{lab}</span>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>

        {/* Revenue mini line */}
        <div className="col-span-12 md:col-span-4 md:col-start-5 md:row-start-1 card h-full min-h-[360px] flex flex-col">
          <div className="text-xs text-indigo-600/80 font-semibold mb-2">• إجمالي الإيرادات</div>
          <div className="flex-1 min-h-[180px]">
            <Suspense fallback={<div className="w-full h-full animate-pulse bg-gray-100 rounded" />}>
              <Line
                key={`revenue-${themeMode}`}
                data={{
                  labels: visibleRevenue.map((m) => m.label),
                  datasets: [
                    {
                      data: visibleRevenue.map((m) => m.value),
                      borderColor: '#5C61F2',
                      backgroundColor: (ctx: any) => {
                        const { chart } = ctx;
                        const { ctx: c, chartArea } = chart as any;
                        if (!chartArea) return 'rgba(92,97,242,0.18)';
                        const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        g.addColorStop(0, 'rgba(92,97,242,0.25)');
                        g.addColorStop(1, 'rgba(92,97,242,0.02)');
                        return g;
                      },
                      cubicInterpolationMode: 'monotone',
                      tension: 0.4,
                      borderWidth: 3,
                      pointRadius: 3,
                      pointHoverRadius: 5,
                      pointBackgroundColor: '#fff',
                      pointBorderColor: '#5C61F2',
                      pointBorderWidth: 2,
                      fill: true,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: tooltipBackground,
                      titleColor: tooltipTitleColor,
                      bodyColor: tooltipBodyColor,
                      titleFont: { family: fontStack },
                      bodyFont: { family: fontStack },
                    },
                  },
                  scales: {
                    x: { display: true, grid: { color: gridColor, lineWidth: 1 }, ticks: { color: axisColor, font: { size: 12, weight: '600', family: fontStack } }, border: { color: borderColor } },
                    y: { display: true, grid: { color: gridColor, drawBorder: true, lineWidth: 1 }, ticks: { color: axisColor, font: { size: 12, weight: '600', family: fontStack } }, border: { color: borderColor } },
                  },
                }}
              />
            </Suspense>
          </div>
          <div className="mt-3 text-right text-sm text-gray-500">
            <Currency amount={visibleRevenueTotal} locale={localeTag} /> خلال آخر {rangeMonths} شهر
          </div>
        </div>

        {/* حالة الفواتير حسب الحالة */}
        <div className="col-span-12 md:col-span-4 md:col-start-9 md:row-start-1 card h-full min-h-[360px] flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-indigo-600/80 font-semibold">• حالة الفواتير</div>
            <div className="text-xs text-gray-500">
              مستحق/متأخر: <strong><Currency amount={invoiceOutstanding} locale={localeTag} /></strong>
            </div>
          </div>
          <div className="flex-1 min-h-[220px]">
            {invoiceStatusEntries.some((entry) => entry.value > 0) ? (
              <Suspense fallback={<div className="w-full h-full animate-pulse bg-gray-100 rounded" />}>
                <Bar
                  key={`invoice-status-${themeMode}`}
                  data={{
                    labels: invoiceStatusEntries.map((entry) => entry.label),
                    datasets: [
                      {
                        label: "المبالغ (ر.س)",
                        data: invoiceStatusEntries.map((entry) => entry.value),
                        backgroundColor: invoiceStatusEntries.map((entry) => entry.color),
                        borderRadius: 14,
                        maxBarThickness: 42,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: tooltipBackground,
                        titleColor: tooltipTitleColor,
                        bodyColor: tooltipBodyColor,
                        titleFont: { family: fontStack },
                        bodyFont: { family: fontStack },
                        callbacks: {
                          label: (ctx: any) => `المجموع: ${formatCurrency(Number(ctx.parsed?.y || 0))}`,
                        },
                      },
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: { color: axisColor, font: { size: 12, weight: "600", family: fontStack } },
                        border: { color: borderColor },
                      },
                      y: {
                        grid: { color: gridColor, drawBorder: true },
                        ticks: {
                          color: axisColor,
                          font: { size: 12, weight: "600", family: fontStack },
                          callback: (value: any) => formatCurrency(Number(value || 0)),
                        },
                        border: { color: borderColor },
                      },
                    },
                  }}
                />
              </Suspense>
            ) : (
              <div className="h-full grid place-items-center text-sm text-gray-500">
                لا تتوفر بيانات فواتير كافية لعرض الإحصاء.
              </div>
            )}
          </div>
        </div>
      </div>


      {/* مصادر الإيرادات حسب العقار */}
      <div className="mt-8 card">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">مصادر الإيرادات حسب العقار</h3>
              <p className="text-sm text-gray-500">
                إجمالي:{" "}
                <span className="font-semibold text-gray-700 dark:text-slate-100">
                  <Currency amount={propertyRevenueTotal} locale={localeTag} />
                </span>
              </p>
              {data?.charts?.expiring ? (
                <p className="mt-1 text-xs text-gray-400 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    ينتهي هذا الأسبوع:{" "}
                    <span className="font-semibold text-amber-500">
                      {formatNumber(data.charts.expiring.week)}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    هذا الشهر:{" "}
                    <span className="font-semibold text-blue-500">
                      {formatNumber(data.charts.expiring.month)}
                    </span>
                  </span>
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-slate-300">
              <span className="inline-flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: themeColors.success }} />
                مدفوعة:{" "}
                <b className="font-semibold text-gray-700 dark:text-white">
                  {formatCurrency(invoiceStatusTotals.paid)}
                </b>
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: themeColors.warning }} />
                مستحقة:{" "}
                <b className="font-semibold text-gray-700 dark:text-white">
                  {formatCurrency(invoiceStatusTotals.pending)}
                </b>
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: themeColors.danger }} />
                متأخرة:{" "}
                <b className="font-semibold text-gray-700 dark:text-white">
                  {formatCurrency(invoiceStatusTotals.overdue)}
                </b>
              </span>
            </div>
          </div>
          {propertyRevenueTop.length ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-5">
                <div className="h-64">
                  <Suspense fallback={<div className="w-full h-full animate-pulse bg-gray-100 dark:bg-white/10 rounded-3xl" />}>
                    <Doughnut
                      key={`property-revenue-${themeMode}`}
                      data={{
                        labels: propertyRevenueTop.map((entry) => entry.label),
                        datasets: [
                          {
                            data: propertyRevenueTop.map((entry) => entry.value),
                            backgroundColor: propertyRevenueColors,
                            borderWidth: 2,
                            borderColor: "#ffffff",
                          },
                        ],
                      }}
                      options={{
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: tooltipBackground,
                            titleColor: tooltipTitleColor,
                            bodyColor: tooltipBodyColor,
                            titleFont: { family: fontStack },
                            bodyFont: { family: fontStack },
                            callbacks: {
                              label: (ctx: any) => `${ctx.label}: ${formatCurrency(Number(ctx.parsed || 0))}`,
                            },
                          },
                        },
                        cutout: "58%",
                      }}
                    />
                  </Suspense>
                </div>
                <div className="mt-4 text-center text-xs text-gray-500 dark:text-slate-400">
                  توزيع الإيرادات حسب العقارات الأكثر تحقيقاً
                </div>
              </div>
              <div className="lg:col-span-7 flex flex-col gap-4">
                {propertyRevenueTop.map((entry, idx) => {
                  const percentage = propertyRevenueTotal ? Math.round((entry.value / propertyRevenueTotal) * 1000) / 10 : 0;
                  const color = propertyRevenueColors[idx % propertyRevenueColors.length];
                  return (
                    <div
                      key={`property-entry-${entry.label}`}
                      className="flex flex-col gap-2 rounded-2xl border border-gray-100 dark:border-white/10 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-gray-800 dark:text-white">{entry.label}</span>
                        <span className="text-sm text-gray-600 dark:text-slate-300">{formatCurrency(entry.value)}</span>
                      </div>
                      <div className="relative h-2.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                        <span
                          className="absolute inset-y-0 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(0, percentage))}%`, backgroundColor: color }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-300">
                        <span>نسبة من الإجمالي</span>
                        <span className="font-semibold text-gray-700 dark:text-white">{percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">لا تتوفر بيانات إيرادات للعقارات لعرضها.</p>
          )}
        </div>
      </div>

      {/* (تم دمج تفاصيل العقود/الوحدات/الصيانة داخل البطاقات العلوية) */}

      {/* العقود القريبة الانتهاء */}
      <div className="mt-8 card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">العقود القريبة على الانتهاء</h3>
          <select className="form-select w-40" value={range} onChange={(e) => setRange(e.target.value as any)}>
            <option value="week">هذا الأسبوع</option>
            <option value="month">هذا الشهر</option>
          </select>
        </div>
        <ExpiringContractsTable items={contracts} range={range} localeTag={localeTag} onRenew={setRenewingContract} />
      </div>

      {renewingContract && (
        <RenewContractModal
          contract={renewingContract}
          onClose={() => setRenewingContract(null)}
          onSuccess={() => window.location.reload()}
        />
      )}

      {/* الفواتير المتأخرة */}
      {lateInvoices.length > 0 && (
        <div className="mt-8 card border-red-100 ring-2 ring-red-50 dark:border-red-900/20 dark:ring-red-900/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">الفواتير المتأخرة</h3>
          </div>
          <LateInvoicesTable
            items={lateInvoices}
            localeTag={localeTag}
            page={lateInvoicesPage}
            pageSize={lateInvoicesPageSize}
            total={lateInvoicesTotal}
            onPageChange={fetchLateInvoices}
            onStatusUpdate={handleLateInvoiceStatusUpdate}
          />
        </div>
      )}

      {/* الفواتير القريبة الانتهاء */}
      {upcomingInvoices.length > 0 && (
        <div className="mt-8 card border-sky-100 ring-2 ring-sky-50 dark:border-sky-900/20 dark:ring-sky-900/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-sky-700 dark:text-sky-400">الفواتير المستحقة قريباً</h3>
          </div>
          <UpcomingInvoicesTable
            items={upcomingInvoices}
            localeTag={localeTag}
            page={upcomingInvoicesPage}
            pageSize={upcomingInvoicesPageSize}
            total={upcomingInvoicesTotal}
            onPageChange={fetchUpcomingInvoices}
            onStatusUpdate={handleUpcomingInvoiceStatusUpdate}
          />
        </div>
      )}


      {/* تم نقل نسب الإشغال للأعلى + الأنشطة ضمن الصف العلوي */}
    </div>
  );
}

function Header({
  onRefresh,
  refreshing,
  lastUpdated,
  rangeMonths,
  onRangeChange,
}: {
  onRefresh: () => void;
  refreshing?: boolean;
  lastUpdated?: string;
  rangeMonths?: number;
  onRangeChange?: (v: number) => void;
}) {
  return (
    <div className="mb-8 flex items-center justify-between">
      <div className="flex flex-col">
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800" style={{ color: 'var(--text-primary)' }}>لوحة التحكم</h2>
        {lastUpdated ? (
          <div className="mt-1 text-xs md:text-sm">
            <span className="text-gray-600" style={{ color: 'var(--text-primary)' }}>آخر تحديث:</span>{' '}
            <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>{lastUpdated}</span>
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        {onRangeChange ? (
          <select className="form-select w-36" value={String(rangeMonths ?? 6)} onChange={(e) => onRangeChange(Number(e.target.value))}>
            <option value={3}>آخر 3 أشهر</option>
            <option value={6}>آخر 6 أشهر</option>
            <option value={12}>آخر 12 شهر</option>
          </select>
        ) : null}
        <button
          onClick={onRefresh}
          className="btn-outline text-gray-900 dark:text-gray-200"
          aria-label="تحديث البيانات"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">تحديث</span>
        </button>
      </div>
    </div>
  );
}

function ExpiringContractsTable({ items, range, localeTag, onRenew }: { items: any[]; range: "week" | "month"; localeTag: string; onRenew: (c: any) => void }) {
  const now = useMemo(() => new Date(), [items, range]);
  const horizon = useMemo(() => {
    const end = new Date(now);
    if (range === "week") {
      end.setDate(end.getDate() + 7);
    } else {
      end.setMonth(end.getMonth() + 1, 0);
    }
    return end;
  }, [now, range]);

  const filtered = useMemo(
    () =>
      (items || []).filter((c: any) => {
        const d = c.endDate ? new Date(c.endDate) : null;
        return d && d >= now && d <= horizon;
      }),
    [horizon, items, now]
  );

  type ExpiringSortKey = "tenant" | "unit" | "property" | "endDate" | "remaining";

  const expiringSortAccessors = useMemo<Record<ExpiringSortKey, (c: any) => unknown>>(
    () => ({
      tenant: (c) => c.tenantName || c.tenant?.name || "",
      unit: (c) => c.unit?.unitNumber || c.unit?.number || "",
      property: (c) => c.unit?.property?.name || "",
      endDate: (c) => c.endDate || "",
      remaining: (c) => {
        const d = c.endDate ? new Date(c.endDate) : null;
        return d ? d.getTime() - now.getTime() : Number.POSITIVE_INFINITY;
      },
    }),
    [now]
  );

  const {
    sortedItems: sortedExpiring,
    sortState: expiringSort,
    toggleSort: toggleExpiringSort,
  } = useTableSort<any, ExpiringSortKey>(filtered, expiringSortAccessors, { key: "endDate", direction: "asc" });

  const rows = sortedExpiring.slice(0, 10);

  if (!rows.length) return <p className="text-sm text-gray-500">لا توجد عقود قريبة الانتهاء.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th className="text-right p-3">
              <SortHeader
                label="المستأجر"
                active={expiringSort?.key === "tenant"}
                direction={expiringSort?.key === "tenant" ? expiringSort.direction : null}
                onToggle={() => toggleExpiringSort("tenant")}
              />
            </th>
            <th className="text-right p-3">
              <SortHeader
                label="الوحدة"
                active={expiringSort?.key === "unit"}
                direction={expiringSort?.key === "unit" ? expiringSort.direction : null}
                onToggle={() => toggleExpiringSort("unit")}
              />
            </th>
            <th className="text-right p-3">
              <SortHeader
                label="العقار"
                active={expiringSort?.key === "property"}
                direction={expiringSort?.key === "property" ? expiringSort.direction : null}
                onToggle={() => toggleExpiringSort("property")}
              />
            </th>
            <th className="text-right p-3">
              <SortHeader
                label="تاريخ النهاية"
                active={expiringSort?.key === "endDate"}
                direction={expiringSort?.key === "endDate" ? expiringSort.direction : null}
                onToggle={() => toggleExpiringSort("endDate")}
              />
            </th>
            <th className="text-right p-3">بقي</th>
            <th className="text-right p-3">قرار التجديد</th>
            <th className="text-right p-3">إجراءات</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((c: any) => {
            const endDate = new Date(c.endDate);
            const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            const updateStatus = async (status: string) => {
              if (status === "NOT_RENEWING") {
                if (!window.confirm("هل أنت متأكد من إنهاء العقد؟ سيتم تحويل الوحدة إلى متاحة.")) return;
                try {
                  await api.patch(`/api/contracts/${c.id}/end`, {});
                  alert("تم إنهاء العقد بنجاح");
                  window.location.reload();
                } catch (e: any) {
                  alert(e.response?.data?.message || "تعذر إنهاء العقد");
                }
                return;
              }

              if (status === "RENEWED") {
                onRenew(c);
                return;
              }

              try {
                await api.patch(`/api/contracts/${c.id}`, { renewalStatus: status });
                alert("تم تحديث القرار بنجاح");
                window.location.reload(); // Refresh to show changes
              } catch (e: any) {
                alert("تعذر تحديث القرار");
              }
            };

            return (
              <tr key={c.id} className="odd:bg-white even:bg-gray-50">
                <td className="p-3 text-gray-800">{c.tenantName || c.tenant?.name || "-"}</td>
                <td className="p-3">
                  {c.unit?.id ? (
                    <Link to={`/units/${c.unit.id}`} className="text-primary hover:underline">
                      {c.unit?.unitNumber || c.unit?.number || "-"}
                    </Link>
                  ) : (
                    c.unit?.unitNumber || c.unit?.number || "-"
                  )}
                </td>
                <td className="p-3 text-gray-800">{c.unit?.property?.name || "-"}</td>
                <td className="p-3">{endDate.toLocaleDateString(localeTag)}</td>
                <td className="p-3">
                  <span
                    className={`${daysLeft <= 7 ? "badge-warning" : "px-2 py-1 rounded text-xs bg-blue-100 text-blue-700"
                      }`}
                  >
                    {daysLeft} يوم
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    <button
                      className={`btn-icon-soft ${c.renewalStatus === "RENEWED" ? "bg-green-100 text-green-700" : ""}`}
                      onClick={() => updateStatus("RENEWED")}
                      title="تم الاتفاق على التجديد"
                    >
                      تجديد
                    </button>
                    <button
                      className={`btn-icon-soft ${c.renewalStatus === "NOT_RENEWING" ? "bg-red-100 text-red-700" : ""}`}
                      onClick={() => updateStatus("NOT_RENEWING")}
                      title="لن يتم التجديد"
                    >
                      إنهاء
                    </button>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <Link
                      className="btn-soft btn-soft-info"
                      to={`/hotel/${c.unit?.propertyId}/tenants/${c.tenantId}`}
                      title="عرض التفاصيل"
                    >
                      <FileText className="w-4 h-4" />
                    </Link>
                    {c.tenant?.phone ? (
                      <>
                        <a className="btn-soft btn-soft-success" href={`tel:${c.tenant?.phone}`} title="اتصال">
                          <Phone className="w-4 h-4" />
                        </a>
                        <a
                          href={getWhatsAppLink(c.tenant.phone) || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-soft btn-soft-success"
                          title="واتساب"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  color,
  icon,
}: {
  title: string;
  value: string;
  subtitle?: React.ReactNode;
  color: "blue" | "green" | "amber" | "purple";
  icon: React.ReactNode;
}) {
  const colorMap: Record<typeof color, { ring: string; text: string; bg: string; icon: string }> = {
    blue: { ring: "ring-blue-200", text: "text-blue-900", bg: "bg-blue-50", icon: "text-blue-600" },
    green: { ring: "ring-green-200", text: "text-green-900", bg: "bg-green-50", icon: "text-green-600" },
    amber: { ring: "ring-orange-200", text: "text-[#431407]", bg: "bg-orange-100/50", icon: "text-[#431407]" },
    purple: { ring: "ring-purple-200", text: "text-purple-900", bg: "bg-purple-50", icon: "text-purple-600" },
  };

  const palette = colorMap[color];

  return (
    <div className={`bg-white rounded-xl shadow p-5 ring-1 ${palette.ring}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${palette.bg}`}>
            <span className={palette.icon}>{icon}</span>
          </div>
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className={`text-2xl md:text-3xl font-extrabold ${palette.text}`}>{value}</p>
          </div>
        </div>
      </div>
      {subtitle ? (
        typeof subtitle === 'string' ? (
          <p className="text-[13px] md:text-sm text-gray-500 mt-3">{subtitle}</p>
        ) : (
          <div className="text-[13px] md:text-sm text-gray-500 mt-3">{subtitle}</div>
        )
      ) : null}
    </div>
  );
}

function SkeletonDashboard() {
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow p-5 animate-pulse">
            <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
            <div className="h-6 w-32 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow p-5 animate-pulse">
            <div className="h-4 w-20 bg-gray-200 rounded mb-4" />
            <div className="space-y-2">
              <div className="h-3 w-full bg-gray-200 rounded" />
              <div className="h-3 w-4/5 bg-gray-200 rounded" />
              <div className="h-3 w-3/5 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-10 bg-white rounded-xl shadow p-6 animate-pulse">
        <div className="h-4 w-28 bg-gray-200 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-3 w-full bg-gray-200 rounded" />
          <div className="h-3 w-11/12 bg-gray-200 rounded" />
          <div className="h-3 w-10/12 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}


function getWhatsAppLink(phone?: string | null) {
  if (!phone) return null;
  let p = phone.replace(/[^\d]/g, "");
  if (!p) return null;
  if (p.startsWith("0")) p = "966" + p.substring(1);
  return `https://wa.me/${p}`;
}

function getSmsLink(phone?: string | null) {
  if (!phone) return null;
  return `sms:${phone}`;
}


function LateInvoicesTable({
  items, localeTag, page, pageSize, total, onPageChange, onStatusUpdate
}: {
  items: any[];
  localeTag: string;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (p: number) => void;
  onStatusUpdate: (id: number, status: string) => void;
}) {
  if (!items.length) return <p className="text-sm text-gray-500">لا يوجد فواتير متأخرة.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="table w-full">
        <thead>
          <tr>
            <th className="text-right p-3 w-[100px] whitespace-nowrap">رقم الفاتورة</th>
            <th className="text-right p-3 min-w-[300px] w-auto whitespace-normal">المستأجر</th>
            <th className="text-right p-3 min-w-[150px] whitespace-normal">رقم الوحدة</th>
            <th className="text-right p-3 whitespace-nowrap">العقار</th>
            <th className="text-right p-3 whitespace-nowrap">تاريخ الاستحقاق</th>
            <th className="text-right p-3 whitespace-nowrap">المبلغ</th>
            <th className="text-center p-3 whitespace-nowrap">الحالة</th>
            <th className="text-right p-3 whitespace-nowrap">الإجراءات</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((inv: any) => {
            const dueDate = new Date(inv.dueDate);
            const daysOverdue = Math.ceil((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

            return (
              <tr key={inv.id} className="odd:bg-white even:bg-gray-50">
                <td className="p-3 whitespace-nowrap">#{inv.id}</td>
                <td className="p-3 font-medium text-gray-800 whitespace-normal">
                  {(() => {
                    const tenant = inv.contract?.tenant || inv.tenant;
                    const tenantId = tenant?.id;
                    const propertyId = inv.contract?.unit?.propertyId || inv.contract?.unit?.property?.id;

                    if (tenant && tenantId && propertyId) {
                      return (
                        <Link
                          to={`/hotel/${propertyId}/tenants/${tenantId}`}
                          className="hover:text-primary hover:underline"
                        >
                          {tenant.name || "-"}
                        </Link>
                      );
                    }
                    return tenant?.name || inv.contract?.tenantName || "-";
                  })()}
                </td>
                <td className="p-3 text-gray-600 whitespace-normal">
                  {inv.contract?.unit?.id ? (
                    <Link to={`/units/${inv.contract?.unit?.id}`} className="hover:text-primary hover:underline">
                      {inv.contract?.unit?.number || "-"}
                    </Link>
                  ) : (
                    inv.contract?.unit?.number || "-"
                  )}
                </td>
                <td className="p-3 text-gray-600 whitespace-nowrap">{inv.contract?.unit?.property?.name || "-"}</td>
                <td className="p-3 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span>{dueDate.toLocaleDateString(localeTag)}</span>
                    <span className="text-xs font-semibold text-red-600">متأخر {daysOverdue} يوم</span>
                  </div>
                </td>
                <td className="p-3 font-bold text-gray-800 text-right">
                  {inv.status === 'PARTIAL' || inv.status === 'partial' ? (
                    <div className="flex flex-col items-start leading-tight">
                      <span className="text-indigo-600 dark:text-indigo-400">
                        {formatSAR(inv.amount - (inv.payments || []).reduce((sum: number, p: any) => sum + p.amount, 0))}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-slate-500 font-normal">
                        <span>المتبقي من</span>
                        <span>{formatSAR(inv.amount)}</span>
                      </div>
                    </div>
                  ) : (
                    formatSAR(inv.amount)
                  )}
                </td>
                <td className="p-3 text-center">
                  <InvoiceBadge status={inv.status} dueDate={inv.dueDate} />
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    {(() => {
                      const tenant = inv.contract?.tenant || inv.tenant;
                      const phone = tenant?.phone;
                      if (!phone) return <span className="text-gray-400 text-xs">-</span>;

                      const wa = getWhatsAppLink(phone);
                      const sms = getSmsLink(phone);

                      return (
                        <>
                          <a href={wa || '#'} target="_blank" rel="noopener noreferrer" className="btn-icon-soft text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-500/10" title="واتساب">
                            <MessageCircle className="w-4 h-4" />
                          </a>
                          <a href={sms || '#'} className="btn-icon-soft text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10" title="رسالة نصية">
                            <MessageSquare className="w-4 h-4" />
                          </a>
                        </>
                      );
                    })()}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {total && pageSize && onPageChange && total > pageSize ? (
        <div className="flex items-center justify-between p-3 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            عرض {(page! - 1) * pageSize + 1} - {Math.min(page! * pageSize, total)} من {total}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page! - 1)}
              disabled={page === 1}
              className="px-3 py-1 text-xs font-medium bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              السابق
            </button>
            <button
              onClick={() => onPageChange(page! + 1)}
              disabled={page! * pageSize >= total}
              className="px-3 py-1 text-xs font-medium bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              التالي
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function UpcomingInvoicesTable({
  items, localeTag, page, pageSize, total, onPageChange, onStatusUpdate
}: {
  items: any[];
  localeTag: string;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (p: number) => void;
  onStatusUpdate: (id: number, status: string) => void;
}) {
  if (!items.length) return <p className="text-sm text-gray-500">لا توجد فواتير مستحقة قريباً.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="table w-full">
        <thead>
          <tr>
            <th className="text-right p-3 w-[100px] whitespace-nowrap">رقم الفاتورة</th>
            <th className="text-right p-3 min-w-[300px] w-auto whitespace-normal">المستأجر</th>
            <th className="text-right p-3 min-w-[150px] whitespace-normal">رقم الوحدة</th>
            <th className="text-right p-3 whitespace-nowrap">العقار</th>
            <th className="text-right p-3 whitespace-nowrap">تاريخ الاستحقاق</th>
            <th className="text-right p-3 whitespace-nowrap">المبلغ</th>
            <th className="text-center p-3 whitespace-nowrap">الحالة</th>
            <th className="text-right p-3 whitespace-nowrap">الإجراءات</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((inv: any) => {
            const dueDate = new Date(inv.dueDate);
            const today = new Date();
            const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            return (
              <tr key={inv.id} className="odd:bg-white even:bg-gray-50">
                <td className="p-3 whitespace-nowrap">#{inv.id}</td>
                <td className="p-3 font-medium text-gray-800 whitespace-normal">
                  {(() => {
                    const tenant = inv.contract?.tenant || inv.tenant;
                    const tenantId = tenant?.id;
                    const propertyId = inv.contract?.unit?.propertyId || inv.contract?.unit?.property?.id;

                    if (tenant && tenantId && propertyId) {
                      return (
                        <Link
                          to={`/hotel/${propertyId}/tenants/${tenantId}`}
                          className="hover:text-primary hover:underline"
                        >
                          {tenant.name || "-"}
                        </Link>
                      );
                    }
                    return tenant?.name || inv.contract?.tenantName || "-";
                  })()}
                </td>
                <td className="p-3 text-gray-600 whitespace-normal">
                  {inv.contract?.unit?.id ? (
                    <Link to={`/units/${inv.contract?.unit?.id}`} className="hover:text-primary hover:underline">
                      {inv.contract?.unit?.number || "-"}
                    </Link>
                  ) : (
                    inv.contract?.unit?.number || "-"
                  )}
                </td>
                <td className="p-3 text-gray-600 whitespace-nowrap">{inv.contract?.unit?.property?.name || "-"}</td>
                <td className="p-3 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span>{dueDate.toLocaleDateString(localeTag)}</span>
                    {daysLeft > 0 ? (
                      <span className="text-xs font-semibold text-blue-600">خلال {daysLeft} يوم</span>
                    ) : (
                      <span className="text-xs font-semibold text-amber-600">اليوم</span>
                    )}
                  </div>
                </td>
                <td className="p-3 font-bold text-gray-800 text-right">
                  {inv.status === 'PARTIAL' || inv.status === 'partial' ? (
                    <div className="flex flex-col items-start leading-tight">
                      <span className="text-indigo-600 dark:text-indigo-400">
                        {formatSAR(inv.amount - (inv.payments || []).reduce((sum: number, p: any) => sum + p.amount, 0))}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-slate-500 font-normal">
                        <span>المتبقي من</span>
                        <span>{formatSAR(inv.amount)}</span>
                      </div>
                    </div>
                  ) : (
                    formatSAR(inv.amount)
                  )}
                </td>
                <td className="p-3 text-center">
                  <InvoiceBadge status={inv.status} dueDate={inv.dueDate} />
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    {(() => {
                      const tenant = inv.contract?.tenant || inv.tenant;
                      const phone = tenant?.phone;
                      if (!phone) return <span className="text-gray-400 text-xs">-</span>;

                      const wa = getWhatsAppLink(phone);
                      const sms = getSmsLink(phone);

                      return (
                        <>
                          <a href={wa || '#'} target="_blank" rel="noopener noreferrer" className="btn-icon-soft text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-500/10" title="واتساب">
                            <MessageCircle className="w-4 h-4" />
                          </a>
                          <a href={sms || '#'} className="btn-icon-soft text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10" title="رسالة نصية">
                            <MessageSquare className="w-4 h-4" />
                          </a>
                        </>
                      );
                    })()}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {total && pageSize && onPageChange && total > pageSize ? (
        <div className="flex items-center justify-between p-3 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            عرض {(page! - 1) * pageSize + 1} - {Math.min(page! * pageSize, total)} من {total}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page! - 1)}
              disabled={page === 1}
              className="px-3 py-1 text-xs font-medium bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              السابق
            </button>
            <button
              onClick={() => onPageChange(page! + 1)}
              disabled={page! * pageSize >= total}
              className="px-3 py-1 text-xs font-medium bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              التالي
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InvoiceBadge({ status, dueDate }: { status?: string | null; dueDate?: string | null }) {
  const isOverdue = () => {
    if (status !== "PENDING" || !dueDate) return false;
    const due = new Date(dueDate);
    const now = new Date();
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return dueDay < today;
  };

  const currentStatus = isOverdue() ? "OVERDUE" : (status || "PENDING").toUpperCase();

  const map: Record<string, { label: string; className: string }> = {
    PENDING: { label: "معلق", className: "badge-warning shadow-sm" },
    PAID: { label: "مدفوع", className: "badge-success shadow-sm" },
    PARTIAL: { label: "سداد جزئي", className: "badge-partial shadow-sm" },
    CANCELLED: { label: "ملغى", className: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200" },
    OVERDUE: { label: "متأخرة", className: "badge-overdue shadow-sm" },
  };

  const info = map[currentStatus] || { label: currentStatus, className: "badge-neutral" };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${info.className}`}>
      {info.label}
    </span>
  );
}
