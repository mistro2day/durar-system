import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { FileText, Receipt, Wrench, AlertCircle } from "lucide-react";
import api from "../lib/api";
import { useLocaleTag } from "../lib/settings-react";
import Currency from "../components/Currency";

type TabKey = "contracts" | "financial" | "maintenance";

type ContractsReportRow = {
  id: number;
  propertyName?: string | null;
  unitNumber?: string | null;
  tenantName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  amount?: number | null;
  status?: string | null;
};

type FinancialReportRow = {
  id: number;
  propertyName?: string | null;
  unitNumber?: string | null;
  tenantName?: string | null;
  amount?: number | null;
  dueDate?: string | null;
  status?: string | null;
  paidAt?: string | null;
  paymentMethod?: string | null;
};

type MaintenanceReportRow = {
  id: number;
  propertyName?: string | null;
  unitNumber?: string | null;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  createdAt?: string | null;
  completedAt?: string | null;
};

const TAB_META: Array<{ key: TabKey; label: string; icon: typeof FileText }> = [
  { key: "contracts", label: "تقرير العقود", icon: FileText },
  { key: "financial", label: "التقرير المالي", icon: Receipt },
  { key: "maintenance", label: "تقرير الصيانة", icon: Wrench },
];

const CONTRACT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "ساري",
  ENDED: "منتهي",
  CANCELLED: "ملغى",
  PENDING: "قيد الإنهاء",
};

const FINANCIAL_STATUS_LABELS: Record<string, string> = {
  PAID: "مدفوعة",
  PENDING: "مستحقة",
  OVERDUE: "متأخرة",
  PARTIAL: "سداد جزئي",
};

const MAINTENANCE_STATUS_LABELS: Record<string, string> = {
  NEW: "مفتوحة",
  IN_PROGRESS: "قيد التنفيذ",
  COMPLETED: "مغلقة",
  CANCELLED: "ملغاة",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "نقدي",
  TRANSFER: "تحويل بنكي",
  EFT: "تحويل إلكتروني",
  CHEQUE: "شيك",
  POS: "نقاط بيع",
  EJAR: "منصة إيجار",
};

export default function Reports() {
  const params = useParams<{ id?: string }>();
  const propertyId = params.id;
  const localeTag = useLocaleTag();

  const [contracts, setContracts] = useState<ContractsReportRow[]>([]);
  const [financial, setFinancial] = useState<FinancialReportRow[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceReportRow[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("contracts");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      const suffix = propertyId ? `?propertyId=${propertyId}` : "";
      try {
        const [contractsRes, financialRes, maintenanceRes] = await Promise.all([
          api.get<ContractsReportRow[]>(`/api/reports/contracts${suffix}`),
          api.get<FinancialReportRow[]>(`/api/reports/financial${suffix}`),
          api.get<MaintenanceReportRow[]>(`/api/reports/maintenance${suffix}`),
        ]);
        if (cancelled) return;
        setContracts(contractsRes.data ?? []);
        setFinancial(financialRes.data ?? []);
        setMaintenance(maintenanceRes.data ?? []);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.response?.data?.error || e?.message || "تعذر تحميل التقارير");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  useEffect(() => {
    setSearch("");
  }, [activeTab]);

  const searchPlaceholder = useMemo(() => {
    switch (activeTab) {
      case "financial":
        return "ابحث عن مستأجر، حالة، طريقة دفع أو عقار";
      case "maintenance":
        return "ابحث عن وصف، حالة، أولوية أو اسم العقار";
      default:
        return "ابحث عن عقار، وحدة، مستأجر أو حالة عقد";
    }
  }, [activeTab]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows =
      activeTab === "contracts" ? contracts : activeTab === "financial" ? financial : maintenance;

    if (!term) return rows;

    return rows.filter((row) => {
      const values =
        activeTab === "contracts"
          ? [
              (row as ContractsReportRow).propertyName,
              (row as ContractsReportRow).unitNumber,
              (row as ContractsReportRow).tenantName,
              mapContractStatus((row as ContractsReportRow).status),
            ]
          : activeTab === "financial"
          ? [
              (row as FinancialReportRow).propertyName,
              (row as FinancialReportRow).unitNumber,
              (row as FinancialReportRow).tenantName,
              mapFinancialStatus((row as FinancialReportRow).status),
              mapPaymentMethod((row as FinancialReportRow).paymentMethod),
            ]
          : [
              (row as MaintenanceReportRow).propertyName,
              (row as MaintenanceReportRow).unitNumber,
              (row as MaintenanceReportRow).description,
              mapMaintenanceStatus((row as MaintenanceReportRow).status),
              mapPriority((row as MaintenanceReportRow).priority),
            ];

      return values.some((value) => includesTerm(value, term));
    });
  }, [activeTab, search, contracts, financial, maintenance]);

  function formatDate(value?: string | null, withTime = false) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    try {
      return new Intl.DateTimeFormat(
        localeTag,
        withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }
      ).format(date);
    } catch {
      return date.toLocaleString();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">التقارير</h1>
        <p className="text-sm text-gray-500 mt-1">مجموعة تقارير جاهزة لمتابعة العقود والإيرادات والصيانة.</p>
        {propertyId ? (
          <p className="text-xs text-gray-400 mt-1">يتم عرض البيانات للفندق رقم {propertyId}.</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TAB_META.map(({ key, label, icon: Icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition ${
                active
                  ? "border-indigo-500 bg-indigo-50 text-indigo-600 shadow-sm"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      <div className="card">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600">بحث</span>
          <input
            className="form-input"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>

      {loading ? (
        <div className="card text-center text-gray-500">جارٍ تحميل البيانات…</div>
      ) : error ? (
        <div className="card text-red-600 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          {activeTab === "contracts" ? (
            <table className="table min-w-[780px]">
              <thead>
                <tr>
                  <th className="text-right">#</th>
                  <th className="text-right">العقار</th>
                  <th className="text-right">الوحدة</th>
                  <th className="text-right">المستأجر</th>
                  <th className="text-right">بداية العقد</th>
                  <th className="text-right">نهاية العقد</th>
                  <th className="text-right">الإيجار السنوي</th>
                  <th className="text-right">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-gray-500">
                      لا توجد عقود مطابقة للبحث الحالي.
                    </td>
                  </tr>
                ) : (
                  (filteredRows as ContractsReportRow[]).map((row) => (
                    <tr key={row.id}>
                      <td className="p-3 text-gray-800">{row.id}</td>
                      <td className="p-3 text-gray-800">{row.propertyName || "-"}</td>
                      <td className="p-3 text-gray-800">{row.unitNumber || "-"}</td>
                      <td className="p-3 text-gray-800">{row.tenantName || "-"}</td>
                      <td className="p-3 text-gray-800">{formatDate(row.startDate)}</td>
                      <td className="p-3 text-gray-800">{formatDate(row.endDate)}</td>
                      <td className="p-3 text-gray-800">
                        <Currency amount={Number(row.amount ?? 0)} locale={localeTag} />
                      </td>
                      <td className="p-3 text-gray-800">
                        <span className={contractStatusBadge(row.status)}>{mapContractStatus(row.status)}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : activeTab === "financial" ? (
            <table className="table min-w-[880px]">
              <thead>
                <tr>
                  <th className="text-right">#</th>
                  <th className="text-right">العقار</th>
                  <th className="text-right">الوحدة</th>
                  <th className="text-right">المستأجر</th>
                  <th className="text-right">المبلغ</th>
                  <th className="text-right">الحالة</th>
                  <th className="text-right">تاريخ الاستحقاق</th>
                  <th className="text-right">تاريخ السداد</th>
                  <th className="text-right">طريقة السداد</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-gray-500">
                      لا توجد فواتير مطابقة للبحث الحالي.
                    </td>
                  </tr>
                ) : (
                  (filteredRows as FinancialReportRow[]).map((row) => (
                    <tr key={row.id}>
                      <td className="p-3 text-gray-800">{row.id}</td>
                      <td className="p-3 text-gray-800">{row.propertyName || "-"}</td>
                      <td className="p-3 text-gray-800">{row.unitNumber || "-"}</td>
                      <td className="p-3 text-gray-800">{row.tenantName || "-"}</td>
                      <td className="p-3 text-gray-800">
                        <Currency amount={Number(row.amount ?? 0)} locale={localeTag} />
                      </td>
                      <td className="p-3 text-gray-800">
                        <span className={financialStatusBadge(row.status)}>{mapFinancialStatus(row.status)}</span>
                      </td>
                      <td className="p-3 text-gray-800">{formatDate(row.dueDate)}</td>
                      <td className="p-3 text-gray-800">{formatDate(row.paidAt)}</td>
                      <td className="p-3 text-gray-800">{mapPaymentMethod(row.paymentMethod)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="table min-w-[900px]">
              <thead>
                <tr>
                  <th className="text-right">#</th>
                  <th className="text-right">العقار</th>
                  <th className="text-right">الوحدة</th>
                  <th className="text-right">الوصف</th>
                  <th className="text-right">الأولوية</th>
                  <th className="text-right">الحالة</th>
                  <th className="text-right">تاريخ الإنشاء</th>
                  <th className="text-right">تاريخ الإغلاق</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-gray-500">
                      لا توجد طلبات صيانة مطابقة للبحث الحالي.
                    </td>
                  </tr>
                ) : (
                  (filteredRows as MaintenanceReportRow[]).map((row) => (
                    <tr key={row.id}>
                      <td className="p-3 text-gray-800">{row.id}</td>
                      <td className="p-3 text-gray-800">{row.propertyName || "-"}</td>
                      <td className="p-3 text-gray-800">{row.unitNumber || "-"}</td>
                      <td className="p-3 text-gray-800 whitespace-pre-wrap">{row.description || "-"}</td>
                      <td className="p-3 text-gray-800">{mapPriority(row.priority)}</td>
                      <td className="p-3 text-gray-800">
                        <span className={maintenanceStatusBadge(row.status)}>{mapMaintenanceStatus(row.status)}</span>
                      </td>
                      <td className="p-3 text-gray-800">{formatDate(row.createdAt, true)}</td>
                      <td className="p-3 text-gray-800">{formatDate(row.completedAt, true)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function includesTerm(value: unknown, term: string) {
  if (!value) return false;
  return String(value).toLowerCase().includes(term);
}

function normalize(value?: string | null) {
  return (value || "").toUpperCase();
}

function mapContractStatus(value?: string | null) {
  const key = normalize(value);
  return CONTRACT_STATUS_LABELS[key] || value || "-";
}

function contractStatusBadge(value?: string | null) {
  switch (normalize(value)) {
    case "ACTIVE":
      return "badge-success";
    case "PENDING":
      return "badge-warning";
    case "ENDED":
      return "badge-info";
    case "CANCELLED":
      return "badge-danger";
    default:
      return "badge-info";
  }
}

function mapFinancialStatus(value?: string | null) {
  const key = normalize(value);
  return FINANCIAL_STATUS_LABELS[key] || value || "-";
}

function financialStatusBadge(value?: string | null) {
  switch (normalize(value)) {
    case "PAID":
      return "badge-success";
    case "OVERDUE":
      return "badge-danger";
    case "PENDING":
      return "badge-warning";
    case "PARTIAL":
      return "badge-info";
    default:
      return "badge-info";
  }
}

function mapPaymentMethod(value?: string | null) {
  if (!value) return "-";
  const key = value.toUpperCase();
  return PAYMENT_METHOD_LABELS[key] || value;
}

function mapMaintenanceStatus(value?: string | null) {
  const key = normalize(value);
  return MAINTENANCE_STATUS_LABELS[key] || value || "-";
}

function maintenanceStatusBadge(value?: string | null) {
  switch (normalize(value)) {
    case "NEW":
      return "badge-info";
    case "IN_PROGRESS":
      return "badge-warning";
    case "COMPLETED":
      return "badge-success";
    case "CANCELLED":
      return "badge-danger";
    default:
      return "badge-info";
  }
}

function mapPriority(value?: string | null) {
  switch (normalize(value)) {
    case "LOW":
      return "منخفضة";
    case "MEDIUM":
      return "متوسطة";
    case "HIGH":
      return "مرتفعة";
    default:
      return value || "-";
  }
}
