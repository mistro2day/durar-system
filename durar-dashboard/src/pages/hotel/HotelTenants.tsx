import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../lib/api";

type Tenant = { id: number; name: string; phone: string; email?: string };

export default function HotelTenants() {
  const { id } = useParams();
  const [items, setItems] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get<Tenant[]>(`/api/tenants?propertyId=${id}`)
      .then((res) => setItems(res.data))
      .catch((e) => setError(e?.response?.data?.message || "تعذر جلب المستأجرين"))
      .finally(() => setLoading(false));
  }, [id]);

  const rows = useMemo(() => items, [items]);

  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">المستأجرون</h3>
      {loading ? (
        <div className="card text-center text-gray-500">جاري التحميل...</div>
      ) : error ? (
        <div className="card text-center text-red-600">{error}</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="text-right p-3 font-semibold">الاسم</th>
                <th className="text-right p-3 font-semibold">الهاتف</th>
                <th className="text-right p-3 font-semibold">البريد</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((t) => (
                <tr key={t.id}>
                  <td className="p-3">{t.name}</td>
                  <td className="p-3">{t.phone}</td>
                  <td className="p-3">{t.email || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

