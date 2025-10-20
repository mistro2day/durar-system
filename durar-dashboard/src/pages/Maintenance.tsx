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
  unit?: { id: number; number?: string | null; unitNumber?: string | null } | null;
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
      unit: (ticket) => ticket.unit?.number || ticket.unit?.unitNumber || ticket.unitId,
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
      setItems((prev) => prev.map((ticket) => (ticket.id === id ? { ...ticket, status } : ticket)));
    } catch (e: any) {
      alert(e?.response?.data?.message || "تعذر تحديث الحالة");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("هل أنت متأكد من حذف بلاغ الصيانة؟")) return;
    try {
      await api.delete(`/api/maintenance/${id}`);
      setItems((prev) => prev.filter((ticket) => ticket.id !== id));
    } catch (e: any) {
      alert(e?.response?.data?.message || "تعذر حذف البلاغ");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800">بلاغات الصيانة</h2>
        <AddMaintenanceButton onAdded={load} propertyId={propertyId} />
      </div>

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
                        {t.unit?.number || t.unit?.unitNumber || t.unitId}
                      </Link>
                    ) : (
                      t.unit?.number || t.unit?.unitNumber || t.unitId
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
                    <button onClick={() => handleDelete(t.id)} className="btn-soft btn-soft-danger">
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

type MaintenanceForm = {
  unitId?: number;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
};

const PRIORITY_OPTIONS: Array<{ value: MaintenanceForm["priority"]; label: string }> = [
  { value: "LOW", label: "منخفضة" },
  { value: "MEDIUM", label: "متوسطة" },
  { value: "HIGH", label: "مرتفعة" },
];

function AddMaintenanceButton({ onAdded, propertyId }: { onAdded: () => void; propertyId?: string }) {
  const [open, setOpen] = useState(false);
  const [units, setUnits] = useState<Array<{ id: number; label: string }>>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [form, setForm] = useState<MaintenanceForm>({ description: "", priority: "MEDIUM" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingUnits(true);
    const qp = propertyId ? `?propertyId=${propertyId}` : "";
    api
      .get(`/api/units${qp}`)
      .then((res) =>
        setUnits(
          (res.data || []).map((u: any) => ({
            id: u.id,
            label: u.unitNumber || u.number || `وحدة #${u.id}`,
          }))
        )
      )
      .catch(() => setUnits([]))
      .finally(() => setLoadingUnits(false));
  }, [open, propertyId]);

  function closeModal() {
    setOpen(false);
    setSaving(false);
    setForm({ description: "", priority: "MEDIUM" });
  }

  async function save() {
    if (saving) return;
    if (!form.unitId) {
      alert("يرجى اختيار الوحدة.");
      return;
    }
    if (!form.description.trim()) {
      alert("يرجى إدخال وصف البلاغ.");
      return;
    }
    try {
      setSaving(true);
      await api.post("/api/maintenance", {
        unitId: form.unitId,
        description: form.description.trim(),
        priority: form.priority,
      });
      closeModal();
      onAdded();
    } catch (e: any) {
      alert(e?.response?.data?.message || "تعذر إضافة البلاغ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button className="btn-soft btn-soft-primary" onClick={() => setOpen(true)}>
        إضافة بلاغ صيانة
      </button>
      {open ? (
        <div className="modal-backdrop items-start md:items-center">
          <div className="card w-full max-w-xl">
            <h3 className="text-lg font-semibold mb-4">بلاغ صيانة جديد</h3>
            <div className="grid grid-cols-1 gap-4">
              <Field label="الوحدة">
                {loadingUnits ? (
                  <div className="text-sm text-gray-500">جاري تحميل الوحدات...</div>
                ) : units.length ? (
                  <select
                    className="form-select"
                    value={form.unitId ?? ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, unitId: e.target.value ? Number(e.target.value) : undefined }))}
                  >
                    <option value="">— اختر الوحدة —</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-sm text-red-500">لا توجد وحدات متاحة، يرجى التحقق.</div>
                )}
              </Field>
              <Field label="الوصف">
                <textarea
                  className="form-input h-28 resize-none"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="اشرح المشكلة أو الطلب بوضوح..."
                />
              </Field>
              <Field label="الأولوية">
                <select
                  className="form-select"
                  value={form.priority}
                  onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value as MaintenanceForm["priority"] }))}
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button className="btn-outline disabled:opacity-60" onClick={closeModal} disabled={saving}>
                إلغاء
              </button>
              <button className="btn-primary disabled:opacity-60" onClick={save} disabled={saving || loadingUnits || !units.length}>
                {saving ? "جارٍ الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-gray-600">{label}</span>
      {children}
    </label>
  );
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
