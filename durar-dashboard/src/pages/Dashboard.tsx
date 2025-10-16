import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { RefreshCw, FileText, Building2, Wrench, Coins, TrendingUp, CheckCircle2, Clock, Home, Phone, RotateCcw } from "lucide-react";
// حمّل مكونات الرسوم بشكل كسول لتقليل وزن حزمة التحميل الأولى
const Line = lazy(() => import("react-chartjs-2").then(m => ({ default: m.Line })));
const Doughnut = lazy(() => import("react-chartjs-2").then(m => ({ default: m.Doughnut })));
// سجّل فقط العناصر المطلوبة من Chart.js بدل "auto" لتقليل الحجم
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend } from "chart.js";
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend);
import { getUser } from "../lib/auth";
import { useLocaleTag } from "../lib/settings-react";
import { useParams } from "react-router-dom";
import api from "../lib/api";
import LoadingOverlay from "../components/LoadingOverlay";

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
  const [occupancy, setOccupancy] = useState<{ labels: string[]; values: number[] }>({ labels: [], values: [] });
  const user = getUser();
  const params = useParams();
  const propertyId = (params as any)?.id as string | undefined;
  const [contracts, setContracts] = useState<any[]>([]);
  const [range, setRange] = useState<'week'|'month'>('week');
  const [rangeMonths, setRangeMonths] = useState<number>(6);
  const [showOverlay, setShowOverlay] = useState(false);
  const overlayTimers = useRef<{ delay?: any; hide?: any; startedAt?: number }>({});
  const [firstLoad, setFirstLoad] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const fontStack = 'Tajawal, Poppins, ui-sans-serif, system-ui, Segoe UI, Arial, sans-serif';
  // اقرأ ألوان التصميم من متغيرات CSS لضمان التناسق
  const themeColors = useMemo(() => {
    try {
      const css = getComputedStyle(document.documentElement);
      const success = (css.getPropertyValue('--color-success') || '#54BA4A').trim();
      const danger = (css.getPropertyValue('--color-danger') || '#E4606D').trim();
      const warning = (css.getPropertyValue('--color-warning') || '#FFAA05').trim();
      const text = (css.getPropertyValue('--text') || '#1f2937').trim();
      return { success, danger, warning, text };
    } catch {
      return { success: '#54BA4A', danger: '#E4606D', warning: '#FFAA05', text: '#1f2937' } as const;
    }
  }, []);

  // مكوّن إضافي لرسم قيمة آخر نقطة على مخطط الإيرادات — لزيادة الوضوح
  const lastPointPlugin: any = {
    id: 'lastPointValue',
    afterDatasetsDraw(chart: any) {
      try {
        const { ctx, data } = chart;
        const ds = data?.datasets?.[0];
        const meta = chart.getDatasetMeta(0);
        const lastIndex = (ds?.data?.length || 0) - 1;
        const pt = meta?.data?.[lastIndex];
        if (!pt) return;
        const val = Number(ds.data[lastIndex] || 0);
        ctx.save();
        ctx.fillStyle = '#111827';
        ctx.font = `600 12px ${fontStack}`;
        const label = new Intl.NumberFormat('ar-SA', { notation: 'compact' }).format(val);
        ctx.fillText(label, pt.x + 8, pt.y - 8);
        ctx.restore();
      } catch {}
    },
  };

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
    return new Intl.NumberFormat(localeTag).format(n ?? 0);
  }

  function formatCurrency(n: number) {
    return new Intl.NumberFormat(localeTag, { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(n ?? 0);
  }

  async function fetchSummary(): Promise<{ hasRevenue: boolean }> {
    setError(null);
    try {
      // المحاولة أولاً على endpoint المطلوب
      const res = await api.get<DashboardResponse>(`/api/dashboard/summary${propertyId ? `?propertyId=${propertyId}` : ""}`);
      setData(res.data);
      if (res.data?.charts?.revenueLast6Months) {
        const formatter = new Intl.DateTimeFormat("ar-u-ca-gregory", { month: "short" });
        setMonthlyRevenue(res.data.charts.revenueLast6Months.map((m) => {
          const [y, mo] = m.key.split('-').map(Number);
          return { label: formatter.format(new Date(y, (mo||1)-1, 1)), value: m.value };
        }));
        return { hasRevenue: true };
      }
      if (res.data?.charts?.occupancy) setOccupancy(res.data.charts.occupancy);
    } catch (e: any) {
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
    return { hasRevenue: false };
  }

  async function waitForServer(maxMs = 15000) {
    setConnecting(true);
    const start = Date.now();
    let delay = 500;
    while (Date.now() - start < maxMs) {
      try {
        const r = await api.get('/api/health');
        if (r?.data?.status === 'ok') break;
      } catch {}
      await new Promise((res) => setTimeout(res, delay));
      delay = Math.min(2500, Math.floor(delay * 1.5));
    }
    setConnecting(false);
  }

  async function fetchMonthlyRevenue() {
    try {
      const res = await api.get<any[]>(`/api/invoices${propertyId ? `?propertyId=${propertyId}` : ""}`);
      const now = new Date();
      // اجمع آخر 6 أشهر بما فيها الشهر الحالي
      const months: { key: string; date: Date }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({ key: `${d.getFullYear()}-${d.getMonth() + 1}`.padStart(7, "0"), date: d });
      }

      const map = new Map<string, number>();
      months.forEach((m) => map.set(m.key, 0));

      for (const inv of res.data || []) {
        const d = inv.dueDate ? new Date(inv.dueDate) : null;
        if (!d) continue;
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`.padStart(7, "0");
        if (map.has(key)) {
          const prev = map.get(key) || 0;
          map.set(key, prev + Number(inv.amount || 0));
        }
      }

      const formatter = new Intl.DateTimeFormat("ar-u-ca-gregory", { month: "short" });
      const dataset = months.map((m) => ({ label: `${formatter.format(m.date)}`, value: map.get(m.key) || 0 }));
      setMonthlyRevenue(dataset);
    } catch {
      // تجاهل خطأ الإيرادات الشهرية ولا تمنع اللوحة من العرض
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
    } catch {}
    // انتظر جاهزية الخادم عند إعادة التشغيل ثم حمّل البيانات
    (async () => {
      setLoading(true);
      await waitForServer();
      const { hasRevenue } = await fetchSummary();
      if (!hasRevenue) fetchMonthlyRevenue();
    })();
    // جلب العقود لبطاقة "العقود القريبة الانتهاء"
    api.get(`/api/contracts${propertyId ? `?propertyId=${propertyId}` : ''}`)
      .then(r => setContracts(r.data || []))
      .catch(()=>setContracts([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRefresh() {
    setRefreshing(true);
    fetchSummary();
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
  const activities = data.activities || [];

  return (
    <div>
      <LoadingOverlay visible={showOverlay || (firstLoad && connecting)} text={connecting ? 'جارٍ الاتصال بالخادم...' : 'جارٍ تحميل البيانات...'} />
      <Header onRefresh={handleRefresh} refreshing={refreshing} lastUpdated={lastUpdatedText} rangeMonths={rangeMonths} onRangeChange={(v)=>setRangeMonths(v)} />

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

      {/* Welcome / Widgets Row */}
      <div className="grid grid-cols-12 gap-6 items-stretch">
        {/* العمود الأيمن: مرحباً + آخر الأنشطة (مكدستان كما كان) */}
        <div className="col-span-12 md:col-span-4 md:col-start-9 md:row-start-1 flex flex-col h-full min-h-[360px] gap-4">
          {/* مرحباً بعودتك */}
          <div className="card min-h-[120px]">
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-full grid place-items-center bg-gradient-to-br from-indigo-500 to-purple-500 text-white ring-4 ring-indigo-100">
                <span className="text-xl font-bold">{(user?.name || "J").slice(0,1)}</span>
              </div>
              <div>
                <div className="text-sm text-indigo-600/80">مرحباً بعودتك</div>
                <div className="text-xl font-extrabold text-gray-800">{user?.name || "John"}</div>
                <div className="text-xs text-gray-500 mt-1">المهام قيد التنفيذ • <span className="badge-info">5</span></div>
              </div>
            </div>
          </div>
          {/* آخر الأنشطة داخل نفس المكان */}
          <div className="card flex-1 min-h-0">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">آخر الأنشطة</h3>
            {activities.length === 0 ? (
              <p className="text-sm text-gray-500">لا توجد أنشطة حديثة.</p>
            ) : (
              <div className="scroll-area overflow-y-auto pr-1" style={{ maxHeight: '220px' }}>
                <ul className="divide-y divide-gray-200">
                  {activities.slice(0,5).map((a) => (
                    <li key={a.id} className="py-2">
                      <div className="flex items-start justify-between">
                        <p className="text-gray-800 text-sm font-medium">{a.action}</p>
                        <span className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleString(localeTag)}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{a.description}</p>
                      <p className="text-[11px] text-gray-400 mt-1">بواسطة: {a.user}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* إشغال الوحدات (نسب) — العمود الأيسر */}
        <div className="col-span-12 md:col-span-4 md:col-start-1 md:row-start-1 card h-full min-h-[360px]">
          <div className="text-sm font-semibold text-indigo-600/80 mb-2">• نسب الإشغال</div>
          {(() => {
            const labels = occupancy.labels.length ? occupancy.labels : ["متاحة","مشغولة","صيانة"];
            const values = occupancy.values.length ? occupancy.values : [summary.units.available||0, summary.units.occupied||0, (summary.units.maintenance||0)];
            const colors = [themeColors.success, themeColors.danger, themeColors.warning];
            const total = values.reduce((a:number,b:number)=>a+Number(b||0),0) || 1;
            const pct = (i:number) => new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 1 }).format((Number(values[i]||0)*100)/total);
            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative h-56">
            <Suspense fallback={<div className="w-full h-full animate-pulse bg-gray-100 rounded" /> }>
              <Doughnut
                data={{ labels, datasets: [{ data: values as any, backgroundColor: colors, borderWidth: 0 }] }}
                options={{ plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx:any)=> `${labels[ctx.dataIndex]}: ${values[ctx.dataIndex]} (${pct(ctx.dataIndex)}%)` } } }, maintainAspectRatio: false, cutout: "70%" as any, animation: { animateRotate: true, duration: 900 } }}
              />
            </Suspense>
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <div className="text-center">
                <div className="text-2xl font-extrabold" style={{ color: themeColors.text }}>{new Intl.NumberFormat('ar-SA').format(total)}</div>
                <div className="text-xs" style={{ color: themeColors.text }}>إجمالي الوحدات</div>
              </div>
            </div>
          </div>
                  <div className="flex flex-col justify-center gap-3">
                    {labels.map((lab, i) => {
                      const count = Number(values[i] || 0);
                      const countLabel = new Intl.NumberFormat('ar-SA').format(count);
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
            <Suspense fallback={<div className="w-full h-full animate-pulse bg-gray-100 rounded" /> }>
              <Line
                data={{
                  labels: monthlyRevenue.map((m) => m.label),
                  datasets: [
                    {
                      data: monthlyRevenue.map((m) => m.value),
                      borderColor: "#5C61F2",
                      backgroundColor: "rgba(92,97,242,0.15)",
                      tension: 0.35,
                      fill: true,
                    },
                  ],
                }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }}
              />
            </Suspense>
          </div>
          <div className="mt-3 text-right text-sm text-gray-500">{formatCurrency(summary.revenue)} هذا الشهر</div>
        </div>

        {/* (تم نقل عمود الترحيب + الأنشطة إلى بداية الصف أعلاه) */}
      </div>

      

      {/* (تم دمج تفاصيل العقود/الوحدات/الصيانة داخل البطاقات العلوية) */}

      {/* العقود القريبة الانتهاء */}
      <div className="mt-8 card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">العقود القريبة على الانتهاء</h3>
          <select className="form-select w-40" value={range} onChange={(e)=>setRange(e.target.value as any)}>
            <option value="week">هذا الأسبوع</option>
            <option value="month">هذا الشهر</option>
          </select>
        </div>
        <ExpiringContractsTable items={contracts} range={range} localeTag={localeTag} />
      </div>

      {/* مخطط الإيرادات الشهرية */}
      <div className="mt-8 card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">الإيرادات حسب الشهور</h3>
          {data?.charts?.expiring ? (
            <div className="text-xs text-gray-500 flex items-center gap-3">
              <span>تنتهي هذا الأسبوع: <b className="text-amber-600">{formatNumber(data.charts.expiring.week)}</b></span>
              <span>هذا الشهر: <b className="text-blue-600">{formatNumber(data.charts.expiring.month)}</b></span>
            </div>
          ) : null}
        </div>
        {monthlyRevenue.length > 0 ? (
          <div className="h-72 md:h-80">
            <Line
              data={{
                labels: monthlyRevenue.slice(-rangeMonths).map((m) => m.label),
                datasets: [
                  {
                    label: "الإيرادات (ر.س)",
                    data: monthlyRevenue.slice(-rangeMonths).map((m) => m.value),
                    borderColor: "#5c61f2",
                    backgroundColor: "rgba(92, 97, 242, 0.20)",
                    tension: 0.35,
                    borderWidth: 3,
                    pointRadius: 4,
                    fill: true,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false, labels: { font: { family: fontStack } } },
                  tooltip: { titleFont: { family: fontStack }, bodyFont: { family: fontStack } },
                },
                scales: {
                  x: { grid: { display: false }, ticks: { font: { size: 12, family: fontStack } } },
                  y: {
                    ticks: {
                      callback: (v) =>
                        new Intl.NumberFormat("ar-SA", { notation: "compact" }).format(Number(v as any)),
                      font: { size: 12, family: fontStack },
                    },
                  },
                },
                animation: { duration: 900, easing: 'easeOutQuart' },
              }}
              plugins={[lastPointPlugin]}
            />
          </div>
        ) : (
          <p className="text-sm text-gray-500">لا تتوفر بيانات كافية لعرض المخطط.</p>
        )}
      </div>

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
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800" style={{ color: 'var(--text)' }}>لوحة التحكم</h2>
        {lastUpdated ? (
          <div className="mt-1 text-xs md:text-sm">
            <span className="text-gray-600" style={{ color: 'var(--text)' }}>آخر تحديث:</span>{' '}
            <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>{lastUpdated}</span>
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        {onRangeChange ? (
          <select className="form-select w-36" value={String(rangeMonths ?? 6)} onChange={(e)=>onRangeChange(Number(e.target.value))}>
            <option value={3}>آخر 3 أشهر</option>
            <option value={6}>آخر 6 أشهر</option>
            <option value={12}>آخر 12 شهر</option>
          </select>
        ) : null}
        <button onClick={onRefresh} className="btn-primary" aria-label="تحديث البيانات">
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">تحديث</span>
        </button>
      </div>
    </div>
  );
}

function ExpiringContractsTable({ items, range, localeTag }: { items: any[]; range: 'week'|'month'; localeTag: string }) {
  const now = new Date();
  const end = new Date(now);
  if (range === 'week') end.setDate(end.getDate() + 7); else end.setMonth(end.getMonth()+1, 0);
  const rows = (items||[])
    .filter((c:any)=>{ const d = c.endDate ? new Date(c.endDate) : null; return d && d >= now && d <= end; })
    .sort((a:any,b:any)=> new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
    .slice(0, 10);
  if (!rows.length) return <p className="text-sm text-gray-500">لا توجد عقود قريبة الانتهاء.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th className="text-right p-3">النزيل</th>
            <th className="text-right p-3">الوحدة</th>
            <th className="text-right p-3">تاريخ النهاية</th>
            <th className="text-right p-3">متبق</th>
            <th className="text-right p-3">إجراءات</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((c:any)=>{
            const endDate = new Date(c.endDate);
            const daysLeft = Math.ceil((endDate.getTime() - now.getTime())/ (1000*60*60*24));
            return (
              <tr key={c.id} className="odd:bg-white even:bg-gray-50">
                <td className="p-3 text-gray-800">{c.tenantName || c.tenant?.name || '-'}</td>
                <td className="p-3">{c.unit?.unitNumber || c.unit?.number || '-'}</td>
                <td className="p-3">{endDate.toLocaleDateString(localeTag)}</td>
                <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${daysLeft<=7? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{daysLeft} يوم</span></td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <a
                      className="btn-soft btn-soft-info"
                      href={`/contracts?editId=${c.id}`}
                      title="تجديد/تعديل العقد"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span className="hidden sm:inline">تجديد</span>
                    </a>
                    {c.tenant?.phone ? (
                      <a className="btn-soft btn-soft-success" href={`tel:${c.tenant?.phone}`} title="اتصال">
                        <Phone className="w-4 h-4" />
                        <span className="hidden sm:inline">اتصال</span>
                      </a>
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
    blue: { ring: "ring-blue-200", text: "text-blue-700", bg: "bg-blue-50", icon: "text-blue-600" },
    green: { ring: "ring-green-200", text: "text-green-700", bg: "bg-green-50", icon: "text-green-600" },
    amber: { ring: "ring-amber-200", text: "text-amber-700", bg: "bg-amber-50", icon: "text-amber-600" },
    purple: { ring: "ring-purple-200", text: "text-purple-700", bg: "bg-purple-50", icon: "text-purple-600" },
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

function QuickList({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; value: string; icon?: React.ReactNode }>;
}) {
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <h4 className="text-sm font-semibold text-gray-800 mb-3">{title}</h4>
      <ul className="space-y-2">
        {items.map((it, idx) => (
          <li key={idx} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {it.icon ? <span className="w-4 h-4">{it.icon}</span> : null}
              <span className="text-sm text-gray-600">{it.label}</span>
            </div>
            <span className="text-sm font-semibold text-gray-800">{it.value}</span>
          </li>
        ))}
      </ul>
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
