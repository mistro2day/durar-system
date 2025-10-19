import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import api from "../lib/api";
import LoadingOverlay from "../components/LoadingOverlay";
import SortHeader from "../components/SortHeader";
import { useTableSort } from "../hooks/useTableSort";
import { useLocaleTag } from "../lib/settings-react";

const PAGE_SIZE = 25;

type ActivityLog = {
  id: number;
  action: string;
  description?: string | null;
  createdAt: string;
  user: {
    id: number | null;
    name: string | null;
    role: string | null;
    email?: string | null;
  } | null;
  contract: {
    id: number | null;
    unitNumber: string | null;
    propertyName: string | null;
  } | null;
};

type ActivityResponse = {
  items: ActivityLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  actions?: string[];
};

type ActivitySortKey = "action" | "user" | "property" | "unit" | "createdAt";

const ACTION_LABELS: Record<string, string> = {
  CONTRACT_CREATE: "إنشاء عقد",
  CONTRACT_UPDATE: "تعديل عقد",
  CONTRACT_DELETE: "حذف عقد",
  CONTRACT_END: "إنهاء عقد",
  INVOICE_CREATE: "إنشاء فاتورة",
  INVOICE_UPDATE: "تعديل فاتورة",
  INVOICE_DELETE: "حذف فاتورة",
  MAINTENANCE_CREATE: "إنشاء تذكرة صيانة",
  MAINTENANCE_UPDATE: "تحديث تذكرة صيانة",
  MAINTENANCE_CLOSE: "إغلاق تذكرة صيانة",
};

export default function ActivityLog() {
  const [items, setItems] = useState<ActivityLog[]>([]);
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [refreshToken, setRefreshToken] = useState(0);

  const localeTag = useLocaleTag();
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, actionFilter, fromDate, toDate]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const params: Record<string, string | number> = { page, limit: PAGE_SIZE };
    if (debouncedSearch) params.search = debouncedSearch;
    if (actionFilter !== "ALL") params.action = actionFilter;
    if (fromDate) params.from = fromDate;
    if (toDate) params.to = toDate;

    api
      .get<ActivityResponse>("/api/activity", { params, signal: controller.signal })
      .then((res) => {
        const payload = res.data;
        setItems(payload.items || []);
        setTotalPages(payload.pagination?.totalPages || 1);
        setTotal(payload.pagination?.total || 0);
        setAvailableActions(payload.actions || []);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const message = err?.response?.data?.message || "تعذر تحميل سجل النشاطات";
        setError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [page, debouncedSearch, actionFilter, fromDate, toDate, refreshToken]);

  const accessors = useMemo(
    () => ({
      action: (row: ActivityLog) => row.action || "",
      user: (row: ActivityLog) => row.user?.name || "",
      property: (row: ActivityLog) => row.contract?.propertyName || "",
      unit: (row: ActivityLog) => row.contract?.unitNumber || "",
      createdAt: (row: ActivityLog) => row.createdAt,
    }),
    []
  );

  const {
    sortedItems,
    sortState,
    toggleSort,
  } = useTableSort<ActivityLog, ActivitySortKey>(items, accessors, {
    key: "createdAt",
    direction: "desc",
  });

  function formatDateTime(value?: string | null) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    try {
      return new Intl.DateTimeFormat(localeTag, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
    } catch {
      return date.toLocaleString();
    }
  }

  function mapActionLabel(value: string | null | undefined) {
    if (!value) return "-";
    return ACTION_LABELS[value] || value;
  }

  function actionBadgeClass(value: string | null | undefined) {
    if (!value) return "badge-info";
    const upper = value.toUpperCase();
    if (upper.includes("DELETE") || value.includes("حذف")) return "badge-danger";
    if (upper.includes("CREATE") || value.includes("إضافة") || value.includes("إنشاء")) return "badge-success";
    if (upper.includes("UPDATE") || upper.includes("EDIT") || value.includes("تعديل")) return "badge-warning";
    if (upper.includes("END") || upper.includes("CLOSE") || value.includes("إنهاء")) return "badge-info";
    return "badge-info";
  }

  const paginationInfo =
    total === 0
      ? "لا توجد نشاطات مسجلة حالياً."
      : `إجمالي ${total} نشاط${total === 1 ? "" : "ات"}.`;

  function handleResetDates() {
    setFromDate("");
    setToDate("");
  }

  return (
    <div className="space-y-6">
      <LoadingOverlay visible={loading} text="جارٍ تحميل سجل النشاطات..." />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">سجل النشاطات</h1>
          <p className="text-sm text-gray-500 mt-1">
            متابعة تفصيلية لكل عمليات الإضافة أو التعديل أو الحذف التي يقوم بها الفريق.
          </p>
          <p className="text-xs text-gray-400 mt-1">{paginationInfo}</p>
        </div>
        <button
          type="button"
          className="btn-outline"
          onClick={() => setRefreshToken((value) => value + 1)}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>تحديث</span>
        </button>
      </div>

      <div className="card grid gap-4 md:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          <span className="text-gray-600">بحث</span>
          <input
            className="form-input"
            placeholder="ابحث باسم المستخدم أو وصف النشاط أو نوع العملية"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600">نوع النشاط</span>
          <select
            className="form-select"
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
          >
            <option value="ALL">الكل</option>
            {availableActions.map((action) => (
              <option key={action} value={action}>
                {mapActionLabel(action)}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3 md:col-span-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">من تاريخ</span>
            <input
              type="date"
              className="form-input"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">إلى تاريخ</span>
            <input
              type="date"
              className="form-input"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </label>
        </div>

        <div className="md:col-span-2 flex items-end gap-2">
          <button
            type="button"
            className="btn-outline"
            onClick={handleResetDates}
            disabled={!fromDate && !toDate}
          >
            مسح التواريخ
          </button>
        </div>
      </div>

      {error ? (
        <div className="card text-red-600 flex items-center gap-2">
          <span>{error}</span>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table min-w-[960px]">
            <thead>
              <tr>
                <th>
                  <SortHeader
                    label="العملية"
                    active={sortState?.key === "action"}
                    direction={sortState?.key === "action" ? sortState.direction : null}
                    onToggle={() => toggleSort("action")}
                    align="right"
                  />
                </th>
                <th className="text-right text-xs font-semibold text-gray-700">الوصف</th>
                <th>
                  <SortHeader
                    label="المستخدم"
                    active={sortState?.key === "user"}
                    direction={sortState?.key === "user" ? sortState.direction : null}
                    onToggle={() => toggleSort("user")}
                    align="right"
                  />
                </th>
                <th>
                  <SortHeader
                    label="العقار"
                    active={sortState?.key === "property"}
                    direction={sortState?.key === "property" ? sortState.direction : null}
                    onToggle={() => toggleSort("property")}
                    align="right"
                  />
                </th>
                <th>
                  <SortHeader
                    label="الوحدة"
                    active={sortState?.key === "unit"}
                    direction={sortState?.key === "unit" ? sortState.direction : null}
                    onToggle={() => toggleSort("unit")}
                    align="right"
                  />
                </th>
                <th>
                  <SortHeader
                    label="التاريخ"
                    active={sortState?.key === "createdAt"}
                    direction={sortState?.key === "createdAt" ? sortState.direction : null}
                    onToggle={() => toggleSort("createdAt")}
                    align="right"
                  />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-500">
                    لا توجد نشاطات مطابقة للمعايير الحالية.
                  </td>
                </tr>
              ) : (
                sortedItems.map((row) => (
                  <tr key={row.id}>
                    <td className="p-3 text-gray-800">
                      <span className={actionBadgeClass(row.action)}>{mapActionLabel(row.action)}</span>
                    </td>
                    <td className="p-3 text-gray-600 whitespace-pre-wrap" title={row.description || undefined}>
                      {row.description || "-"}
                    </td>
                    <td className="p-3 text-gray-800">
                      <div className="flex flex-col">
                        <span>{row.user?.name || "غير محدد"}</span>
                        <span className="text-xs text-gray-500">
                          {row.user?.role ? roleLabel(row.user.role) : ""}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-gray-800">
                      {row.contract?.propertyName || "-"}
                    </td>
                    <td className="p-3 text-gray-800">{row.contract?.unitNumber || "-"}</td>
                    <td className="p-3 text-gray-800">{formatDateTime(row.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-gray-500">
          صفحة {page} من {Math.max(totalPages, 1)}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-outline"
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            disabled={page === 1 || loading}
          >
            السابق
          </button>
          <button
            type="button"
            className="btn-soft btn-soft-primary"
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={page >= totalPages || loading}
          >
            التالي
          </button>
        </div>
      </div>
    </div>
  );
}

function roleLabel(role: string | null | undefined) {
  if (!role) return "";
  const upper = role.toUpperCase();
  switch (upper) {
    case "ADMIN":
      return "مدير النظام";
    case "MANAGER":
      return "مدير";
    case "STAFF":
      return "موظف";
    default:
      return role;
  }
}
