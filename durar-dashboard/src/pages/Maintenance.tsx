import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { useParams, Link } from "react-router-dom";
import SortHeader from "../components/SortHeader";
import { useTableSort } from "../hooks/useTableSort";

type Ticket = {
  id: number;
  unitId: number;
  description: string;
  status: string; // NEW | IN_PROGRESS | DONE
  priority?: string; // LOW | MEDIUM | HIGH
  unit?: { id: number; unitNumber: string } | null;
};

type MaintenanceSortKey = "id" | "unit" | "description" | "priority" | "status";

export default function Maintenance() {
  const [items, setItems] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const propertyId = (params as any)?.id as string | undefined;

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const res = await api.get<Ticket[]>(`/api/maintenance${propertyId ? `?propertyId=${propertyId}` : ""}`);
      setItems(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || "تعذر جلب البلاغات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => items, [items]);

  const maintenanceSortAccessors = useMemo<Record<MaintenanceSortKey, (ticket: Ticket) => unknown>>(
    () => ({
      id: (ticket) => ticket.id,
      unit: (ticket) => ticket.unit?.unitNumber || ticket.unitId,
      description: (ticket) => ticket.description || "",
      priority: (ticket) => ticket.priority || "",
      status: (ticket) => ticket.status || "",
    }),
    []
  );

  const {
    sortedItems: sortedTickets,
    sortState: maintenanceSort,
    toggleSort: toggleMaintenanceSort,
  } = useTableSort<Ticket, MaintenanceSortKey>(rows, maintenanceSortAccessors, { key: "id", direction: "desc" });

  async function updateStatus(id: number, status: string) {
    try {
      await api.patch(`/api/maintenance/${id}/status`, { status });
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || "تعذر تحديث الحالة");
    }
  }

  function handleDelete() {
    alert("حذف البلاغ غير متوفر في الواجهة الخلفية حالياً.");
  }

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">بلاغات الصيانة</h2>

      {loading ? (
        <div className="card text-center text-gray-500">جاري التحميل...</div>
      ) : error ? (
        <div className="card text-center text-red-600">{error}</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table sticky">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-right p-3 font-semibold text-gray-700">
                  <SortHeader
                    label="#"
                    active={maintenanceSort?.key === "id"}
                    direction={maintenanceSort?.key === "id" ? maintenanceSort.direction : null}
                    onToggle={() => toggleMaintenanceSort("id")}
                  />
                </th>
                <th className="text-right p-3 font-semibold text-gray-700">
                  <SortHeader
                    label="رقم الوحدة"
                    active={maintenanceSort?.key === "unit"}
                    direction={maintenanceSort?.key === "unit" ? maintenanceSort.direction : null}
                    onToggle={() => toggleMaintenanceSort("unit")}
                  />
                </th>
                <th className="text-right p-3 font-semibold text-gray-700">
                  <SortHeader
                    label="الوصف"
                    active={maintenanceSort?.key === "description"}
                    direction={maintenanceSort?.key === "description" ? maintenanceSort.direction : null}
                    onToggle={() => toggleMaintenanceSort("description")}
                  />
                </th>
                <th className="text-right p-3 font-semibold text-gray-700">
                  <SortHeader
                    label="الأولوية"
                    active={maintenanceSort?.key === "priority"}
                    direction={maintenanceSort?.key === "priority" ? maintenanceSort.direction : null}
                    onToggle={() => toggleMaintenanceSort("priority")}
                  />
                </th>
                <th className="text-right p-3 font-semibold text-gray-700">
                  <SortHeader
                    label="الحالة"
                    active={maintenanceSort?.key === "status"}
                    direction={maintenanceSort?.key === "status" ? maintenanceSort.direction : null}
                    onToggle={() => toggleMaintenanceSort("status")}
                  />
                </th>
                <th className="text-right p-3 font-semibold text-gray-700">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedTickets.map((t) => (
                <tr key={t.id} className="odd:bg-white even:bg-gray-50">
                  <Td>{t.id}</Td>
                  <Td>
                    {t.unit?.id ? (
                      <Link to={`/units/${t.unit.id}`} className="text-primary hover:underline">
                        {t.unit?.unitNumber || t.unitId}
                      </Link>
                    ) : (
                      t.unit?.unitNumber || t.unitId
                    )}
                  </Td>
                  <Td>{t.description}</Td>
                  <Td>{mapPriority(t.priority)}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <span className={statusBadgeClass(t.status)}>{mapStatus(t.status)}</span>
                      <select
                        className="form-select"
                        value={t.status}
                        onChange={(e) => updateStatus(t.id, e.target.value)}
                      >
                        <option value="NEW">مفتوحة</option>
                        <option value="IN_PROGRESS">قيد التنفيذ</option>
                        <option value="COMPLETED">مغلقة</option>
                        <option value="CANCELLED">ملغاة</option>
                      </select>
                    </div>
                  </Td>
                  <Td>
                    <button onClick={handleDelete} className="btn-soft btn-soft-danger">
                      حذف
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="p-3 text-gray-800">{children}</td>;
}
function mapPriority(v?: string) {
  switch (v) {
    case "LOW":
      return "منخفضة";
    case "MEDIUM":
      return "متوسطة";
    case "HIGH":
      return "مرتفعة";
    default:
      return v || "-";
  }
}

function mapStatus(v?: string) {
  switch (v) {
    case "NEW":
      return "مفتوحة";
    case "IN_PROGRESS":
      return "قيد التنفيذ";
    case "COMPLETED":
      return "مغلقة";
    case "CANCELLED":
      return "ملغاة";
    default:
      return v || "-";
  }
}

function statusBadgeClass(v?: string) {
  switch (v) {
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
