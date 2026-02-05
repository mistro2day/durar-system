import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { FileText, Receipt, Wrench, AlertCircle } from "lucide-react";
import api from "../lib/api";
import { useLocaleTag } from "../lib/settings-react";
import Currency from "../components/Currency";
import { getSettings, getDefaultSettings, DEFAULT_DATE_LOCALE } from "../lib/settings";
import { getUser } from "../lib/auth";

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
  CASH: "كاش",
  BANK_TRANSFER: "تحويل بنكي",
  EJAR: "منصة إيجار",
};

type ExportContext = {
  headers: string[];
  data: string[][];
  title: string;
  fileBase: string;
  generatedAt: Date;
  localeTag: string;
  company: {
    name: string;
    cr: string;
    phone: string;
    email: string;
    address: string;
  };
  author: string;
  logoUrl: string;
};

export default function Reports() {
  const params = useParams<{ id?: string }>();
  const propertyId = params.id;
  const localeTag = useLocaleTag();
  const settings = useMemo(
    () => (typeof window === "undefined" ? getDefaultSettings() : getSettings()),
    []
  );
  const reportAuthor = useMemo(() => {
    if (typeof window === "undefined") return "النظام";
    const user = getUser();
    return user?.name || user?.email || "النظام";
  }, []);
  const logoUrl = useMemo(() => {
    if (typeof window === "undefined") return "/logo-durar.svg";
    return `${window.location.origin}/logo-durar.svg`;
  }, []);

  const [contracts, setContracts] = useState<ContractsReportRow[]>([]);
  const [financial, setFinancial] = useState<FinancialReportRow[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceReportRow[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("contracts");
  const [search, setSearch] = useState("");
  const [contractsPropertyFilter, setContractsPropertyFilter] = useState<string>("");
  const [financialDateFrom, setFinancialDateFrom] = useState<string>("");
  const [financialDateTo, setFinancialDateTo] = useState<string>("");
  const [financialPropertyFilter, setFinancialPropertyFilter] = useState<string>("");
  const [financialStatusFilter, setFinancialStatusFilter] = useState<string>("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
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

  const contractPropertyOptions = useMemo(() => {
    const unique = new Set<string>();
    contracts.forEach((row) => {
      if (row.propertyName) unique.add(row.propertyName);
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b, "ar"));
  }, [contracts]);

  const financialPropertyOptions = useMemo(() => {
    const unique = new Set<string>();
    financial.forEach((row) => {
      if (row.propertyName) unique.add(row.propertyName);
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b, "ar"));
  }, [financial]);

  const financialStatusOptions = useMemo(() => {
    const unique = new Set<string>();
    financial.forEach((row) => {
      const normalized = normalize(row.status);
      if (normalized) unique.add(normalized);
    });
    return Array.from(unique);
  }, [financial]);

  useEffect(() => {
    if (contractsPropertyFilter && !contractPropertyOptions.includes(contractsPropertyFilter)) {
      setContractsPropertyFilter("");
    }
  }, [contractPropertyOptions, contractsPropertyFilter]);

  useEffect(() => {
    if (financialPropertyFilter && !financialPropertyOptions.includes(financialPropertyFilter)) {
      setFinancialPropertyFilter("");
    }
  }, [financialPropertyOptions, financialPropertyFilter]);

  useEffect(() => {
    if (
      financialStatusFilter &&
      !financialStatusOptions.includes(financialStatusFilter.toUpperCase())
    ) {
      setFinancialStatusFilter("");
    }
  }, [financialStatusOptions, financialStatusFilter]);

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
    const fromTs = financialDateFrom ? Date.parse(`${financialDateFrom}T00:00:00`) : null;
    const toTs = financialDateTo ? Date.parse(`${financialDateTo}T23:59:59.999`) : null;

    return rows.filter((row) => {
      if (activeTab === "contracts") {
        if (
          contractsPropertyFilter &&
          (row as ContractsReportRow).propertyName !== contractsPropertyFilter
        ) {
          return false;
        }
      } else if (activeTab === "financial") {
        if (
          financialPropertyFilter &&
          (row as FinancialReportRow).propertyName !== financialPropertyFilter
        ) {
          return false;
        }
        if (
          financialStatusFilter &&
          normalize((row as FinancialReportRow).status) !== financialStatusFilter
        ) {
          return false;
        }
        if (financialDateFrom || financialDateTo) {
          const dueValue = (row as FinancialReportRow).dueDate;
          const due = dueValue ? Date.parse(dueValue) : Number.NaN;
          if (
            (financialDateFrom && (Number.isNaN(due) || (fromTs !== null && due < fromTs))) ||
            (financialDateTo && (Number.isNaN(due) || (toTs !== null && due > toTs)))
          ) {
            return false;
          }
        }
      }

      if (!term) return true;

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
  }, [
    activeTab,
    search,
    contracts,
    financial,
    maintenance,
    contractsPropertyFilter,
    financialDateFrom,
    financialDateTo,
    financialPropertyFilter,
    financialStatusFilter,
  ]);

  const currencyFormatter = useMemo(() => {
    try {
      return new Intl.NumberFormat(localeTag, { style: "currency", currency: "SAR" });
    } catch {
      return new Intl.NumberFormat(DEFAULT_DATE_LOCALE, { style: "currency", currency: "SAR" });
    }
  }, [localeTag]);

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
      return date.toLocaleString(DEFAULT_DATE_LOCALE);
    }
  }

  const buildExportContext = useCallback((): ExportContext => {
    const meta = TAB_META.find(({ key }) => key === activeTab);
    const title = meta ? meta.label : "تقرير";
    const generatedAt = new Date();
    const dateStamp = new Intl.DateTimeFormat("en-CA").format(generatedAt);

    if (activeTab === "contracts") {
      const rows = filteredRows as ContractsReportRow[];
      const headers = [
        "#",
        "العقار",
        "الوحدة",
        "المستأجر",
        "بداية العقد",
        "نهاية العقد",
        "الإيجار السنوي",
        "الحالة",
      ];
      const data = rows.map((row, index) => [
        String(row.id ?? index + 1),
        row.propertyName || "-",
        row.unitNumber || "-",
        row.tenantName || "-",
        formatDate(row.startDate),
        formatDate(row.endDate),
        row.amount != null ? currencyFormatter.format(Number(row.amount)) : "-",
        mapContractStatus(row.status),
      ]);
      return {
        headers,
        data,
        title,
        fileBase: `contracts-report-${dateStamp}`,
        generatedAt,
        localeTag,
        company: {
          name: settings.companyName,
          cr: settings.companyCR,
          phone: settings.companyPhone,
          email: settings.companyEmail,
          address: settings.companyAddress,
        },
        author: reportAuthor,
        logoUrl,
      };
    }

    if (activeTab === "financial") {
      const rows = filteredRows as FinancialReportRow[];
      const headers = [
        "#",
        "العقار",
        "الوحدة",
        "المستأجر",
        "المبلغ",
        "تاريخ الاستحقاق",
        "الحالة",
        "تاريخ السداد",
        "طريقة الدفع",
      ];
      const data = rows.map((row, index) => [
        String(row.id ?? index + 1),
        row.propertyName || "-",
        row.unitNumber || "-",
        row.tenantName || "-",
        row.amount != null ? currencyFormatter.format(Number(row.amount)) : "-",
        formatDate(row.dueDate),
        mapFinancialStatus(row.status),
        formatDate(row.paidAt),
        mapPaymentMethod(row.paymentMethod),
      ]);
      return {
        headers,
        data,
        title,
        fileBase: `financial-report-${dateStamp}`,
        generatedAt,
        localeTag,
        company: {
          name: settings.companyName,
          cr: settings.companyCR,
          phone: settings.companyPhone,
          email: settings.companyEmail,
          address: settings.companyAddress,
        },
        author: reportAuthor,
        logoUrl,
      };
    }

    const rows = filteredRows as MaintenanceReportRow[];
    const headers = [
      "#",
      "العقار",
      "الوحدة",
      "الوصف",
      "الأولوية",
      "الحالة",
      "تاريخ الإنشاء",
      "تاريخ الإغلاق",
    ];
    const data = rows.map((row, index) => [
      String(row.id ?? index + 1),
      row.propertyName || "-",
      row.unitNumber || "-",
      row.description || "-",
      mapPriority(row.priority),
      mapMaintenanceStatus(row.status),
      formatDate(row.createdAt, true),
      formatDate(row.completedAt, true),
    ]);
    return {
      headers,
      data,
      title,
      fileBase: `maintenance-report-${dateStamp}`,
      generatedAt,
      localeTag,
      company: {
        name: settings.companyName,
        cr: settings.companyCR,
        phone: settings.companyPhone,
        email: settings.companyEmail,
        address: settings.companyAddress,
      },
      author: reportAuthor,
      logoUrl,
    };
  }, [
    activeTab,
    filteredRows,
    currencyFormatter,
    settings.companyName,
    settings.companyCR,
    settings.companyPhone,
    settings.companyEmail,
    settings.companyAddress,
    reportAuthor,
    logoUrl,
    localeTag,
  ]);

  const exportDisabled = filteredRows.length === 0;

  const handleExportExcel = async () => {
    if (exportDisabled) return;
    const context = buildExportContext();
    await exportContextToExcel(context);
  };

  const handlePrint = () => {
    if (exportDisabled) return;
    const context = buildExportContext();
    printExportContext(context);
  };

  const handleExportPdf = async () => {
    if (exportDisabled || isGeneratingPdf) return;
    try {
      setIsGeneratingPdf(true);
      const context = buildExportContext();
      await exportContextToPdf(context);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

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
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition ${active
                ? "border-indigo-500 bg-indigo-50 text-indigo-600 shadow-sm"
                : "border-gray-200 text-gray-900 dark:text-gray-100 hover:bg-gray-50"
                }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      <div className="card">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-3 md:flex-1 md:flex-row md:flex-wrap md:items-end">
            <label className="flex flex-col gap-1 text-sm md:min-w-[220px]">
              <span className="text-gray-600">بحث</span>
              <input
                className="form-input"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            {activeTab === "contracts" && !propertyId && contractPropertyOptions.length > 0 ? (
              <label className="flex flex-col gap-1 text-sm md:min-w-[200px]">
                <span className="text-gray-600">العقار</span>
                <select
                  className="form-select"
                  value={contractsPropertyFilter}
                  onChange={(event) => setContractsPropertyFilter(event.target.value)}
                >
                  <option value="">كل العقارات</option>
                  {contractPropertyOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {activeTab === "financial" ? (
              <div className="flex flex-col gap-3 md:flex-row md:items-end">
                <label className="flex flex-col gap-1 text-sm md:min-w-[200px]">
                  <span className="text-gray-600">العقار</span>
                  <select
                    className="form-select"
                    value={financialPropertyFilter}
                    onChange={(event) => setFinancialPropertyFilter(event.target.value)}
                  >
                    <option value="">كل العقارات</option>
                    {financialPropertyOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm md:min-w-[180px]">
                  <span className="text-gray-600">حالة الفاتورة</span>
                  <select
                    className="form-select"
                    value={financialStatusFilter}
                    onChange={(event) => setFinancialStatusFilter(event.target.value)}
                  >
                    <option value="">جميع الحالات</option>
                    {financialStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {mapFinancialStatus(status)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm md:min-w-[160px]">
                  <span className="text-gray-600">من تاريخ</span>
                  <input
                    type="date"
                    className="form-input"
                    value={financialDateFrom}
                    max={financialDateTo || undefined}
                    onChange={(event) => setFinancialDateFrom(event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm md:min-w-[160px]">
                  <span className="text-gray-600">إلى تاريخ</span>
                  <input
                    type="date"
                    className="form-input"
                    value={financialDateTo}
                    min={financialDateFrom || undefined}
                    onChange={(event) => setFinancialDateTo(event.target.value)}
                  />
                </label>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap justify-end gap-2 md:min-w-[240px]">
            <button
              type="button"
              className="btn-outline disabled:opacity-60"
              onClick={handleExportExcel}
              disabled={exportDisabled}
            >
              تصدير Excel
            </button>
            <button
              type="button"
              className="btn-outline disabled:opacity-60"
              onClick={handleExportPdf}
              disabled={exportDisabled || isGeneratingPdf}
            >
              {isGeneratingPdf ? "جارٍ إنشاء PDF..." : "تصدير PDF"}
            </button>
            <button
              type="button"
              className="btn-outline disabled:opacity-60"
              onClick={handlePrint}
              disabled={exportDisabled}
            >
              طباعة
            </button>
          </div>
        </div>
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
            <table className="table w-full">
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
            <table className="table w-full">
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
            <table className="table w-full">
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

async function exportContextToExcel(context: ExportContext) {
  // Dynamic import للحفاظ على bundle size
  const XLSX = await import('xlsx');

  // إنشاء worksheet من البيانات
  const wsData = [context.headers, ...context.data];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // تنسيق العناوين - خلفية رمادية وخط عريض
  const headerRange = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellAddress]) continue;

    // تطبيق التنسيق على خلايا العناوين
    ws[cellAddress].s = {
      font: { bold: true, sz: 12 },
      fill: { fgColor: { rgb: "F3F4F6" } },
      alignment: { horizontal: "right", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "D1D5DB" } },
        bottom: { style: "thin", color: { rgb: "D1D5DB" } },
        left: { style: "thin", color: { rgb: "D1D5DB" } },
        right: { style: "thin", color: { rgb: "D1D5DB" } }
      }
    };
  }

  // تنسيق خلايا البيانات - محاذاة لليمين وحدود
  for (let row = headerRange.s.r + 1; row <= headerRange.e.r; row++) {
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!ws[cellAddress]) continue;

      ws[cellAddress].s = {
        alignment: { horizontal: "right", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "E5E7EB" } },
          bottom: { style: "thin", color: { rgb: "E5E7EB" } },
          left: { style: "thin", color: { rgb: "E5E7EB" } },
          right: { style: "thin", color: { rgb: "E5E7EB" } }
        }
      };
    }
  }

  // ضبط عرض الأعمدة تلقائياً
  const colWidths: Array<{ wch: number }> = [];
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    let maxWidth = 10;
    for (let row = headerRange.s.r; row <= headerRange.e.r; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = ws[cellAddress];
      if (cell && cell.v) {
        const cellValue = String(cell.v);
        // حساب عرض تقريبي (الأحرف العربية أعرض من اللاتينية)
        const width = cellValue.length * 1.2;
        maxWidth = Math.max(maxWidth, Math.min(width, 50)); // حد أقصى 50
      }
    }
    colWidths.push({ wch: maxWidth });
  }
  ws['!cols'] = colWidths;

  // إنشاء workbook وإضافة worksheet
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, context.title.substring(0, 31)); // Excel يحد اسم الورقة بـ 31 حرف

  // تصدير الملف
  XLSX.writeFile(wb, `${context.fileBase}.xlsx`);
}

async function exportContextToPdf(context: ExportContext) {
  if (typeof window === "undefined") return;
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = "1122px";
  container.style.maxWidth = "100%";
  container.style.boxSizing = "border-box";
  container.style.padding = "24px";
  container.style.backgroundColor = "#ffffff";
  container.style.zIndex = "-1";
  container.setAttribute("dir", "rtl");
  container.innerHTML = buildTableHtml(context);
  document.body.appendChild(container);

  try {
    const images = Array.from(container.getElementsByTagName("img"));
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            const finalize = () => {
              img.removeEventListener("load", finalize);
              img.removeEventListener("error", finalize);
              resolve();
            };

            if (img.complete && img.naturalWidth !== 0) {
              finalize();
            } else {
              img.addEventListener("load", finalize, { once: true });
              img.addEventListener("error", finalize, { once: true });
            }
          })
      )
    );

    const table = container.querySelector("table");
    const tableHead = table?.querySelector("thead");
    const rows = Array.from(table?.querySelectorAll("tbody tr") ?? []);
    const containerRect = container.getBoundingClientRect();
    const headRect = tableHead?.getBoundingClientRect();
    const headerOffsetDom = headRect ? headRect.top - containerRect.top : 0;
    const headerHeightDom = headRect ? headRect.height : 0;
    const rowMetrics = rows.map((row) => {
      const rect = row.getBoundingClientRect();
      return {
        top: rect.top - containerRect.top,
        height: rect.height,
        bottom: rect.bottom - containerRect.top,
      };
    });
    const totalHeightDom = container.scrollHeight;

    const { default: html2canvas } = await import("html2canvas");
    const baseCanvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      imageTimeout: 0,
    });
    const { jsPDF } = await import("jspdf");
    const orientation = "landscape";
    const pdf = new jsPDF({ orientation, unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margins = { top: 36, right: 32, bottom: 54, left: 32 };
    const usableWidth = pageWidth - margins.left - margins.right;
    const usableHeight = pageHeight - margins.top - margins.bottom;
    const scale = usableWidth / baseCanvas.width;
    const renderScale = baseCanvas.width / Math.max(container.offsetWidth, 1);
    const usableHeightCanvas = usableHeight / scale;
    const usableHeightDom = usableHeightCanvas / renderScale;
    const firstBodyCapacityDom = Math.max(usableHeightDom - (headerOffsetDom + headerHeightDom), 0);
    const otherBodyCapacityDom = Math.max(usableHeightDom - headerHeightDom, 0);
    const headerOffsetCanvas = headerOffsetDom * renderScale;
    const headerHeightCanvas = headerHeightDom * renderScale;

    const slices: Array<{ startDom: number; endDom: number }> = [];
    if (rowMetrics.length === 0) {
      slices.push({ startDom: 0, endDom: totalHeightDom });
    } else {
      let pageStartDom = 0;
      let capacityDom = firstBodyCapacityDom;
      let accumulatedDom = 0;

      rowMetrics.forEach((metrics, index) => {
        const { top, height, bottom } = metrics;
        if (accumulatedDom + height > capacityDom && accumulatedDom > 0) {
          const prevBottom = rowMetrics[index - 1].bottom;
          slices.push({ startDom: pageStartDom, endDom: prevBottom });
          pageStartDom = top;
          capacityDom = otherBodyCapacityDom;
          accumulatedDom = height;
        } else {
          accumulatedDom += height;
        }

        if (index === rowMetrics.length - 1) {
          slices.push({ startDom: pageStartDom, endDom: bottom });
        }
      });
    }

    slices.forEach((slice, pageIndex) => {
      const startCanvas = slice.startDom * renderScale;
      const endCanvas = slice.endDom * renderScale;
      const bodyHeightCanvas = Math.max(endCanvas - startCanvas, 1);
      const includeHeader = pageIndex > 0 && headerHeightCanvas > 0;
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = baseCanvas.width;
      pageCanvas.height = Math.max(
        Math.ceil(bodyHeightCanvas + (includeHeader ? headerHeightCanvas : 0)),
        1
      );
      const ctx = pageCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

        if (includeHeader) {
          ctx.drawImage(
            baseCanvas,
            0,
            headerOffsetCanvas,
            baseCanvas.width,
            headerHeightCanvas,
            0,
            0,
            baseCanvas.width,
            headerHeightCanvas
          );
        }

        ctx.drawImage(
          baseCanvas,
          0,
          startCanvas,
          baseCanvas.width,
          bodyHeightCanvas,
          0,
          includeHeader ? headerHeightCanvas : 0,
          baseCanvas.width,
          bodyHeightCanvas
        );
      }

      const imgHeight = pageCanvas.height * scale;
      const imgData = pageCanvas.toDataURL("image/png");
      if (pageIndex > 0) {
        pdf.addPage(undefined, orientation);
      }
      pdf.addImage(
        imgData,
        "PNG",
        margins.left,
        margins.top,
        usableWidth,
        imgHeight,
        undefined,
        "FAST"
      );
    });

    pdf.save(`${context.fileBase}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

function printExportContext(context: ExportContext) {
  if (typeof window === "undefined") return;
  const printWindow = window.open("", "_blank", "width=1024,height=768");
  if (!printWindow) return;
  const html = `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(context.title)}</title>
    <style>
      body { font-family: 'Tajawal', 'Cairo', 'Segoe UI', sans-serif; color: #111827; margin: 0; padding: 24px; background: #ffffff; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: right; font-size: 13px; color: #111827; }
      th { background-color: #f3f4f6; font-weight: 600; }
      h2 { margin: 0 0 16px 0; font-size: 18px; color: #111827; }
    </style>
  </head>
  <body>
    ${buildTableHtml(context)}
  </body>
</html>`;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function buildTableHtml(context: ExportContext) {
  const header = buildHeaderHtml(context);
  const headCells = context.headers
    .map(
      (header) =>
        `<th style="border:1px solid #d1d5db; padding:8px 12px; background-color:#f3f4f6;">${escapeHtml(header)}</th>`
    )
    .join("");
  const bodyRows =
    context.data.length > 0
      ? context.data
        .map(
          (row) =>
            `<tr>${row
              .map(
                (cell) =>
                  `<td style="border:1px solid #e5e7eb; padding:8px 12px;">${escapeHtml(cell ?? "")}</td>`
              )
              .join("")}</tr>`
        )
        .join("")
      : `<tr><td colspan="${context.headers.length}" style="border:1px solid #e5e7eb; padding:16px; text-align:center; color:#6b7280;">لا توجد بيانات متاحة</td></tr>`;

  return `<div style="width:100%; direction:rtl; font-family:'Tajawal','Cairo','Segoe UI',sans-serif; color:#111827;">
    ${header}
    <h2 style="text-align:right; margin-bottom:12px;">${escapeHtml(context.title)}</h2>
    <table style="width:100%; border-collapse:collapse;">
      <thead>
        <tr>${headCells}</tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>
  </div>`;
}

function escapeCsvValue(value: string) {
  const needsQuotes = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function downloadBlob(content: string, mimeType: string, fileName: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildHeaderHtml(context: ExportContext) {
  const generatedAt = context.generatedAt;
  const formattedDate = formatDateTime(generatedAt, context.localeTag);
  const company = context.company;
  const lines = [
    company.address,
    `السجل التجاري: ${company.cr}`,
    `الهاتف: ${company.phone}`,
    `البريد الإلكتروني: ${company.email}`,
  ];
  return `<div style="display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:20px;">
    <div style="display:flex; align-items:center; gap:16px;">
      <img src="${escapeHtml(context.logoUrl)}" alt="شعار ${escapeHtml(company.name)}" style="height:64px; width:auto;" crossorigin="anonymous" />
      <div style="display:flex; flex-direction:column; gap:2px;">
        <strong style="font-size:16px; color:#111827;">${escapeHtml(company.name)}</strong>
        ${lines.map((line) => `<span style="font-size:13px; color:#4b5563;">${escapeHtml(line)}</span>`).join("")}
      </div>
    </div>
    <div style="text-align:left; font-size:13px; color:#111827;">
      <div>أُعد بواسطة: <strong>${escapeHtml(context.author)}</strong></div>
      <div>التاريخ: <strong>${escapeHtml(formattedDate)}</strong></div>
    </div>
  </div>`;
}

function formatDateTime(value: Date, locale = DEFAULT_DATE_LOCALE) {
  try {
    return value.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    try {
      return value.toLocaleString(DEFAULT_DATE_LOCALE, { dateStyle: "medium", timeStyle: "short" });
    } catch {
      return value.toISOString();
    }
  }
}
