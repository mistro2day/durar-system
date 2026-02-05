import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../lib/api";
import Currency from "../../components/Currency";
import SortHeader from "../../components/SortHeader";
import { useTableSort } from "../../hooks/useTableSort";
import { TenantSummary, EMPTY_STATS, formatValue } from "./tenantShared";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export default function HotelTenants() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    api
      .get<TenantSummary[]>(`/api/tenants?propertyId=${id}`)
      .then((res) => setItems(res.data || []))
      .catch((e) => setError(e?.response?.data?.message || "تعذر جلب المستأجرين"))
      .finally(() => setLoading(false));
  }, [id]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((tenant) => {
      const haystack = [tenant.name, tenant.nationalId, tenant.phone, tenant.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, search]);

  type TenantSortKey = "name" | "phone" | "receivables" | "unit";

  const tenantSortAccessors = useMemo<Record<TenantSortKey, (tenant: TenantSummary) => unknown>>(
    () => ({
      name: (tenant) => tenant.name || "",
      phone: (tenant) => tenant.phone || "",
      receivables: (tenant) => tenant.stats?.receivables ?? 0,
      unit: (tenant) => tenant.stats?.latestContract?.unitNumber || "",
    }),
    []
  );

  const {
    sortedItems: sortedTenants,
    sortState: tenantSort,
    toggleSort: toggleTenantSort,
  } = useTableSort<TenantSummary, TenantSortKey>(rows, tenantSortAccessors, { key: "name", direction: "asc" });

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(sortedTenants.length / pageSize)),
    [sortedTenants.length, pageSize]
  );

  useEffect(() => {
    setPage(1);
  }, [search, pageSize, items.length]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pagedTenants = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedTenants.slice(start, start + pageSize);
  }, [sortedTenants, page, pageSize]);

  const rangeStart = sortedTenants.length ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = sortedTenants.length ? Math.min(page * pageSize, sortedTenants.length) : 0;
  const hasResults = sortedTenants.length > 0;

  function openTenant(tenantId: number) {
    navigate(`/hotel/${id}/tenants/${tenantId}`);
  }

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-6">المستأجرون</h2>

      {/* فلاتر وبحث */}
      <div className="card mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col text-sm">
          <label className="text-gray-600 dark:text-gray-300 mb-1">عدد النتائج</label>
          <select
            className="form-select"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col text-sm w-full sm:w-96">
          <label className="text-gray-600 dark:text-gray-300 mb-1">بحث بالاسم أو الهوية</label>
          <input
            className="form-input"
            placeholder="بحث باسم المستأجر أو الهوية..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="card text-center text-gray-500 dark:text-slate-300">جاري التحميل...</div>
      ) : error ? (
        <div className="card text-center text-red-600">{error}</div>
      ) : !hasResults ? (
        <div className="card text-center text-gray-500 dark:text-slate-300">لا توجد نتائج مطابقة.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full table-auto text-sm">
            <thead className="bg-indigo-900/60 text-indigo-100">
              <tr>
                <th className="px-4 py-3 text-right font-semibold">
                  <SortHeader
                    label="المستأجر"
                    active={tenantSort?.key === "name"}
                    direction={tenantSort?.key === "name" ? tenantSort.direction : null}
                    onToggle={() => toggleTenantSort("name")}
                  />
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  <SortHeader
                    label="رقم الجوال"
                    active={tenantSort?.key === "phone"}
                    direction={tenantSort?.key === "phone" ? tenantSort.direction : null}
                    onToggle={() => toggleTenantSort("phone")}
                  />
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  <SortHeader
                    label="الرصيد المستحق"
                    active={tenantSort?.key === "receivables"}
                    direction={tenantSort?.key === "receivables" ? tenantSort.direction : null}
                    onToggle={() => toggleTenantSort("receivables")}
                  />
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  <SortHeader
                    label="رقم الوحدة"
                    active={tenantSort?.key === "unit"}
                    direction={tenantSort?.key === "unit" ? tenantSort.direction : null}
                    onToggle={() => toggleTenantSort("unit")}
                  />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pagedTenants.map((tenant) => {
                const stats = tenant.stats ?? EMPTY_STATS;
                const unitNumber = stats.latestContract?.unitNumber ?? "—";
                return (
                  <tr key={tenant.id} className="odd:bg-white/5 even:bg-white/10 hover:bg-indigo-500/10 transition">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="w-full text-right font-semibold text-gray-900 hover:text-primary hover:underline focus:outline-none transition-colors dark:text-white"
                        onClick={() => openTenant(tenant.id)}
                      >
                        {tenant.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-200">{formatValue(tenant.phone)}</td>
                    <td className="px-4 py-3 text-gray-200">
                      <Currency amount={stats.receivables} />
                    </td>
                    <td className="px-4 py-3 text-gray-200">{formatValue(unitNumber)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-sm text-indigo-100/80">
            <div>
              عرض {rangeStart}-{rangeEnd} من {sortedTenants.length} مستأجر
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn-soft btn-soft-secondary"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
              >
                السابق
              </button>
              <span>
                صفحة {page} من {totalPages}
              </span>
              <button
                className="btn-soft btn-soft-secondary"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
              >
                التالي
              </button>
            </div>
          </div>
        </div>
      )
      }
    </div >
  );
}
