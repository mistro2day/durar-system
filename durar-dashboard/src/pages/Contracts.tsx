import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams, Link } from "react-router-dom";
import api from "../lib/api";
import { useLocaleTag } from "../lib/settings-react";
import { Pencil, Trash2, Flag, Loader2 } from "lucide-react";
import DateInput, { toDateInput, fromDateInput } from "../components/DateInput";

type Contract = {
  id: number;
  tenantName: string;
  rentalType: string;
  status: string;
  startDate: string;
  endDate: string;
  unit?: { id: number; unitNumber?: string; number?: string } | null;
};

export default function Contracts() {
  const [items, setItems] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const params = useParams();
  const propertyId = (params as any)?.id as string | undefined;
  const location = useLocation();

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const res = await api.get<Contract[]>(`/api/contracts${propertyId ? `?propertyId=${propertyId}` : ""}`);
      setItems(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || "تعذر جلب العقود");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // فتح نافذة التعديل تلقائياً عند وجود ?editId= في الرابط
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const idRaw = sp.get('editId');
    if (!idRaw) return;
    const id = Number(idRaw);
    const c = items.find(x => x.id === id);
    if (c) setEditing(c);
  }, [location.search, items]);

  const rows = useMemo(() => items, [items]);

  async function handleDelete(id: number) {
    if (!confirm("هل تريد حذف العقد؟")) return;
    try {
      await api.delete(`/api/contracts/${id}`);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || "تعذر حذف العقد");
    }
  }

  async function handleEnd(id: number) {
    if (!confirm("تأكيد إنهاء العقد؟")) return;
    try {
      await api.patch(`/api/contracts/${id}/end`, {});
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || "تعذر إنهاء العقد");
    }
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      const body: any = {
        rentalType: editing.rentalType,
        status: editing.status,
        startDate: editing.startDate,
        endDate: editing.endDate,
      };
      await api.put(`/api/contracts/${editing.id}`, body);
      setEditing(null);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || "تعذر حفظ التعديلات");
    } finally {
      setSaving(false);
    }
  }

  const localeTag = useLocaleTag();
  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">العقود</h2>

      <div className="card mb-4 flex items-center justify-end">
        <AddContractButton onAdded={load} propertyId={propertyId}
        />
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
                <th className="text-right p-3 font-semibold text-gray-700">المستأجر</th>
                <th className="text-right p-3 font-semibold text-gray-700">رقم الوحدة</th>
                <th className="text-right p-3 font-semibold text-gray-700">نوع الإيجار</th>
                <th className="text-right p-3 font-semibold text-gray-700">الحالة</th>
                <th className="text-right p-3 font-semibold text-gray-700">البداية</th>
                <th className="text-right p-3 font-semibold text-gray-700">النهاية</th>
                <th className="text-right p-3 font-semibold text-gray-700">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((c) => (
                <tr key={c.id} className="odd:bg-white even:bg-gray-50">
                  <Td>{c.tenantName}</Td>
                  <Td>
                    {c.unit?.id ? (
                      <Link to={`/units/${c.unit.id}`} className="text-primary hover:underline">
                        {c.unit?.unitNumber || c.unit?.number || "-"}
                      </Link>
                    ) : (
                      c.unit?.unitNumber || c.unit?.number || "-"
                    )}
                  </Td>
                  <Td>{mapRentalType(c.rentalType)}</Td>
                  <Td>
                    <span className={`px-2 py-1 rounded text-xs ${statusClass(c.status)}`}>{mapStatus(c.status)}</span>
                  </Td>
                  <Td>{formatDate(c.startDate, localeTag)}</Td>
                  <Td>{formatDate(c.endDate, localeTag)}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditing(c)} className="btn-soft btn-soft-info" title="تعديل">
                        <Pencil className="w-4 h-4" />
                        <span className="hidden sm:inline">تعديل</span>
                      </button>
                      <button onClick={() => handleEnd(c.id)} className="btn-soft btn-soft-warning" title="إنهاء العقد">
                        <Flag className="w-4 h-4" />
                        <span className="hidden sm:inline">إنهاء</span>
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="btn-soft btn-soft-danger" title="حذف">
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">حذف</span>
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing ? (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3">
          <div className="card w-[95%] max-w-xl">
            <h3 className="text-lg font-semibold mb-4">تعديل العقد</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="نوع الإيجار">
                <select
                  className="form-select"
                  value={editing.rentalType}
                  onChange={(e) => setEditing({ ...editing, rentalType: e.target.value })}
                >
                  <option value="MONTHLY">شهري</option>
                  <option value="DAILY">يومي</option>
                </select>
              </Field>
              <Field label="حالة العقد">
                <select
                  className="form-select"
                  value={editing.status}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                >
                  <option value="ACTIVE">نشط</option>
                  <option value="ENDED">منتهي</option>
                  <option value="CANCELLED">ملغى</option>
                </select>
              </Field>
              <Field label="تاريخ البداية">
                <DateInput value={toDateInput(editing.startDate)} onChange={(v) => setEditing({ ...editing, startDate: fromDateInput(v) })} />
              </Field>
              <Field label="تاريخ النهاية">
                <DateInput value={toDateInput(editing.endDate)} onChange={(v) => setEditing({ ...editing, endDate: fromDateInput(v) })} />
              </Field>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button className="btn-outline" onClick={() => setEditing(null)}>إلغاء</button>
              <button className="btn-primary inline-flex items-center gap-2" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                حفظ
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="p-3 text-gray-800">{children}</td>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-gray-600">{label}</span>
      {children}
    </label>
  );
}

function mapRentalType(v?: string) {
  if (v === "DAILY") return "يومي";
  return "شهري";
}

function AddContractButton({ onAdded, propertyId }: { onAdded: () => void; propertyId?: string }) {
  const [open, setOpen] = useState(false);
  const [units, setUnits] = useState<Array<{ id: number; unitNumber: string }>>([]);
  const [form, setForm] = useState<{ tenantName: string; unitId?: number; startDate?: string; endDate?: string; amount?: number; rentAmount?: number; rentalType: string }>({ tenantName: '', rentalType: 'MONTHLY' });

  useEffect(() => {
    if (!open) return;
    const qp = propertyId ? `?propertyId=${propertyId}` : '';
    api.get(`/api/units${qp}`).then(r => setUnits((r.data || []).map((u:any)=>({id:u.id, unitNumber:(u.unitNumber||u.number)}))))
      .catch(()=>{});
  }, [open, propertyId]);

  async function save() {
    try {
      await api.post('/api/contracts', {
        tenantName: form.tenantName,
        unitId: form.unitId,
        startDate: form.startDate,
        endDate: form.endDate,
        amount: form.amount,
        rentAmount: form.rentAmount,
        rentalType: form.rentalType,
      });
      setOpen(false);
      onAdded();
    } catch (e:any) {
      alert(e?.response?.data?.message || 'تعذر إضافة العقد');
    }
  }

  return (
    <>
      <button className="btn-soft btn-soft-primary" onClick={()=>setOpen(true)}>
        إضافة عقد
      </button>
      {open ? (
        <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center p-3">
          <div className="card w-full max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">عقد جديد</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="اسم المستأجر">
                <input className="form-input" value={form.tenantName} onChange={(e)=>setForm({...form, tenantName: e.target.value})} />
              </Field>
              <Field label="الوحدة">
                <select className="form-select" value={String(form.unitId||'')} onChange={(e)=>setForm({...form, unitId: Number(e.target.value)})}>
                  <option value="">—</option>
                  {units.map(u => (<option key={u.id} value={u.id}>{u.unitNumber}</option>))}
                </select>
              </Field>
              <Field label="تاريخ البداية"><DateInput value={form.startDate||''} onChange={(v)=>setForm({...form,startDate:v})} /></Field>
              <Field label="تاريخ النهاية"><DateInput value={form.endDate||''} onChange={(v)=>setForm({...form,endDate:v})} /></Field>
              <Field label="المبلغ الإجمالي"><input className="form-input" type="number" value={String(form.amount||'')} onChange={(e)=>setForm({...form, amount: Number(e.target.value)})} /></Field>
              <Field label="قيمة الإيجار"><input className="form-input" type="number" value={String(form.rentAmount||'')} onChange={(e)=>setForm({...form, rentAmount: Number(e.target.value)})} /></Field>
              <Field label="نوع الإيجار">
                <select className="form-select" value={form.rentalType} onChange={(e)=>setForm({...form, rentalType: e.target.value})}>
                  <option value="MONTHLY">شهري</option>
                  <option value="DAILY">يومي</option>
                </select>
              </Field>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button className="btn-outline" onClick={()=>setOpen(false)}>إلغاء</button>
              <button className="btn-primary" onClick={save}>حفظ</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function mapStatus(v?: string) {
  switch (v) {
    case "ACTIVE":
      return "نشط";
    case "ENDED":
      return "منتهي";
    case "CANCELLED":
      return "ملغى";
    default:
      return v || "-";
  }
}

function statusClass(v?: string) {
  switch (v) {
    case "ACTIVE":
      return "bg-green-100 text-green-700";
    case "ENDED":
      return "bg-gray-100 text-gray-700";
    case "CANCELLED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatDate(d?: string, lt?: string) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString(lt || "ar-SA");
  } catch {
    return "-";
  }
}

// (تم استبدال دوال التحويل بدوال DateInput المشتركة)


