import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../lib/api";
import Currency from "../../components/Currency";
import SortHeader from "../../components/SortHeader";
import { useTableSort } from "../../hooks/useTableSort";
import { TenantSummary, EMPTY_STATS, formatValue } from "./tenantShared";

export default function HotelTenants() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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

  function openTenant(tenantId: number) {
    navigate(`/hotel/${id}/tenants/${tenantId}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white">المستأجرون</h3>
        <div className="w-full sm:w-72">
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
      ) : !rows.length ? (
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
              {sortedTenants.map((tenant) => {
                const stats = tenant.stats ?? EMPTY_STATS;
                const unitNumber = stats.latestContract?.unitNumber ?? "—";
                return (
                  <tr key={tenant.id} className="odd:bg-white/5 even:bg-white/10 hover:bg-indigo-500/10 transition">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="w-full text-right font-medium text-indigo-200 hover:text-white focus:outline-none"
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
        </div>
      )}
    </div>
  );
}
