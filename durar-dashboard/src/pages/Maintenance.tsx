import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { useParams } from "react-router-dom";

type Ticket = {
  id: number;
  unitId: number;
  description: string;
  status: string; // NEW | IN_PROGRESS | DONE
  priority?: string; // LOW | MEDIUM | HIGH
  unit?: { id: number; unitNumber: string } | null;
};

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
                <th className="text-right p-3 font-semibold text-gray-700">#</th>
                <th className="text-right p-3 font-semibold text-gray-700">رقم الوحدة</th>
                <th className="text-right p-3 font-semibold text-gray-700">الوصف</th>
                <th className="text-right p-3 font-semibold text-gray-700">الأولوية</th>
                <th className="text-right p-3 font-semibold text-gray-700">الحالة</th>
                <th className="text-right p-3 font-semibold text-gray-700">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((t) => (
                <tr key={t.id} className="odd:bg-white even:bg-gray-50">
                  <Td>{t.id}</Td>
                  <Td>{t.unit?.unitNumber || t.unitId}</Td>
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
