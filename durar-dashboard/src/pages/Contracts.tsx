import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useParams, Link } from "react-router-dom";
import api from "../lib/api";
import { useLocaleTag } from "../lib/settings-react";
import { Eye, Pencil, Trash2, Flag, Loader2 } from "lucide-react";
import DateInput, { toDateInput, fromDateInput } from "../components/DateInput";
import Currency from "../components/Currency";
import SortHeader from "../components/SortHeader";
import { useTableSort } from "../hooks/useTableSort";

type Contract = {
  id: number;
  tenantName: string;
  rentalType: string;
  status: string;
  startDate: string;
  endDate: string;
  unit?: { id: number; unitNumber?: string; number?: string } | null;
  rentAmount?: number | null;
  amount?: number | null;
  deposit?: number | null;
  ejarContractNumber?: string | null;
  paymentMethod?: string | null;
  paymentFrequency?: string | null;
  servicesIncluded?: string | null;
  notes?: string | null;
};

type ContractSortKey =
  | "tenant"
  | "unit"
  | "rentalType"
  | "status"
  | "rentAmount"
  | "deposit"
  | "ejar"
  | "payment"
  | "startDate"
  | "endDate";

const PAYMENT_METHODS = [
  "تحويل بنكي",
  "نقدي",
  "منصة إيجار",
  "شيك",
] as const;

const PAYMENT_FREQUENCIES = [
  "شهري",
  "ربع سنوي",
  "نصف سنوي",
  "سنوي",
  "كل 6 أشهر",
] as const;

const PAYMENT_METHODS_LIST_ID = "payment-methods-options";
const PAYMENT_FREQUENCIES_LIST_ID = "payment-frequencies-options";

export default function Contracts() {
  const [items, setItems] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [viewing, setViewing] = useState<Contract | null>(null);
  const [search, setSearch] = useState("");
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

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((c) => {
      const tenant = (c.tenantName || "").toLowerCase();
      const ejar = (c.ejarContractNumber || "").toLowerCase();
      const unitNumber = (c.unit?.unitNumber || c.unit?.number || "").toLowerCase();
      return (
        tenant.includes(term) ||
        (unitNumber && unitNumber.includes(term)) ||
        (ejar && ejar.includes(term))
      );
    });
  }, [items, search]);

  const contractSortAccessors = useMemo<Record<ContractSortKey, (c: Contract) => unknown>>(
    () => ({
      tenant: (c) => c.tenantName || "",
      unit: (c) => c.unit?.unitNumber || c.unit?.number || "",
      rentalType: (c) => c.rentalType || "",
      status: (c) => c.status || "",
      rentAmount: (c) => c.rentAmount ?? Number.NEGATIVE_INFINITY,
      deposit: (c) => c.deposit ?? Number.NEGATIVE_INFINITY,
      ejar: (c) => c.ejarContractNumber || "",
      payment: (c) => c.paymentMethod || "",
      startDate: (c) => c.startDate,
      endDate: (c) => c.endDate,
    }),
    []
  );

  const {
    sortedItems: sortedRows,
    sortState: contractSort,
    toggleSort: toggleContractSort,
  } = useTableSort<Contract, ContractSortKey>(rows, contractSortAccessors);

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
      if (editing.amount !== undefined) body.amount = editing.amount;
      if (editing.rentAmount !== undefined) body.rentAmount = editing.rentAmount;
      if (editing.deposit !== undefined) body.deposit = editing.deposit;
      if (editing.ejarContractNumber !== undefined)
        body.ejarContractNumber = editing.ejarContractNumber?.trim() ? editing.ejarContractNumber.trim() : null;
      if (editing.paymentMethod !== undefined)
        body.paymentMethod = editing.paymentMethod?.trim() ? editing.paymentMethod.trim() : null;
      if (editing.paymentFrequency !== undefined)
        body.paymentFrequency = editing.paymentFrequency?.trim() ? editing.paymentFrequency.trim() : null;
      if (editing.servicesIncluded !== undefined)
        body.servicesIncluded = editing.servicesIncluded?.trim() ? editing.servicesIncluded.trim() : null;
      if (editing.notes !== undefined) body.notes = editing.notes?.trim() ? editing.notes.trim() : null;
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

      <div className="card mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-sm text-gray-600">بحث</span>
          <input
            className="form-input w-full md:w-72"
            placeholder="اسم المستأجر أو رقم عقد إيجار أو رقم الوحدة"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="md:ms-auto">
          <AddContractButton onAdded={load} propertyId={propertyId} />
        </div>
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
                    label="المستأجر"
                    active={contractSort?.key === "tenant"}
                    direction={contractSort?.key === "tenant" ? contractSort.direction : null}
                    onToggle={() => toggleContractSort("tenant")}
                  />
                </th>
                <th className="text-right p-3 font-semibold text-gray-700">
                  <SortHeader
                    label="رقم الوحدة"
                    active={contractSort?.key === "unit"}
                    direction={contractSort?.key === "unit" ? contractSort.direction : null}
                    onToggle={() => toggleContractSort("unit")}
                  />
                </th>
                <th className="text-right p-3 font-semibold text-gray-700">
                  <SortHeader
                    label="نوع الإيجار"
                    active={contractSort?.key === "rentalType"}
                    direction={contractSort?.key === "rentalType" ? contractSort.direction : null}
                    onToggle={() => toggleContractSort("rentalType")}
                  />
                </th>
                <th className="text-right p-3 font-semibold text-gray-700">
                  <SortHeader
                    label="الحالة"
                    active={contractSort?.key === "status"}
                    direction={contractSort?.key === "status" ? contractSort.direction : null}
                    onToggle={() => toggleContractSort("status")}
                  />
                </th>
                <th className="text-right p-3 font-semibold text-gray-700">
                  <SortHeader
                    label="قيمة الإيجار"
                    active={contractSort?.key === "rentAmount"}
                    direction={contractSort?.key === "rentAmount" ? contractSort.direction : null}
                    onToggle={() => toggleContractSort("rentAmount")}
                  />
                </th>
                <th className="text-right p-3 font-semibold text-gray-700">
                  <SortHeader
                    label="التأمين"
                    active={contractSort?.key === "deposit"}
                    direction={contractSort?.key === "deposit" ? contractSort.direction : null}
                    onToggle={() => toggleContractSort("deposit")}
                  />
                </th>
                <th className="text-right p-3 font-semibold text-gray-700">
                  <SortHeader
                    label="رقم إيجار"
                    active={contractSort?.key === "ejar"}
                    direction={contractSort?.key === "ejar" ? contractSort.direction : null}
                    onToggle={() => toggleContractSort("ejar")}
                  />
                </th>
                <th className="text-right p-3 font-semibold text-gray-700">
                  <SortHeader
                    label="الدفع"
                    active={contractSort?.key === "payment"}
                    direction={contractSort?.key === "payment" ? contractSort.direction : null}
                    onToggle={() => toggleContractSort("payment")}
                  />
                </th>
                <th className="text-right p-3 font-semibold text-gray-700">
                  <SortHeader
                    label="البداية"
                    active={contractSort?.key === "startDate"}
                    direction={contractSort?.key === "startDate" ? contractSort.direction : null}
                    onToggle={() => toggleContractSort("startDate")}
                  />
                </th>
                <th className="text-right p-3 font-semibold text-gray-700">
                  <SortHeader
                    label="النهاية"
                    active={contractSort?.key === "endDate"}
                    direction={contractSort?.key === "endDate" ? contractSort.direction : null}
                    onToggle={() => toggleContractSort("endDate")}
                  />
                </th>
                <th className="text-right p-3 font-semibold text-gray-700">تفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedRows.map((c) => (
                <tr key={c.id} className="odd:bg-white even:bg-gray-50">
                  <Td>
                    <div className="font-semibold text-gray-900 dark:text-white">{c.tenantName}</div>
                    {c.notes ? <div className="text-xs text-gray-500 mt-1">{c.notes}</div> : null}
                  </Td>
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
                  <Td>{typeof c.rentAmount === "number" ? <Currency amount={c.rentAmount} /> : "-"}</Td>
                  <Td>{typeof c.deposit === "number" && c.deposit > 0 ? <Currency amount={c.deposit} /> : "-"}</Td>
                  <Td>{c.ejarContractNumber || "-"}</Td>
                  <Td>
                    <div>{c.paymentMethod || "-"}</div>
                    {c.paymentFrequency ? (
                      <div className="text-xs text-gray-500">التكرار: {c.paymentFrequency}</div>
                    ) : null}
                  </Td>
                  <Td>{formatDate(c.startDate, localeTag)}</Td>
                  <Td>{formatDate(c.endDate, localeTag)}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setViewing(c)} className="btn-soft btn-soft-info" title="عرض التفاصيل">
                        <Eye className="w-4 h-4" />
                        <span className="hidden sm:inline">عرض</span>
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
              <Field label="إجمالي العقد">
                <input
                  className="form-input"
                  type="number"
                  value={editing.amount !== undefined && editing.amount !== null ? String(editing.amount) : ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      amount: e.target.value === "" ? undefined : Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="قيمة الإيجار">
                <input
                  className="form-input"
                  type="number"
                  value={editing.rentAmount !== undefined && editing.rentAmount !== null ? String(editing.rentAmount) : ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      rentAmount: e.target.value === "" ? undefined : Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="التأمين">
                <input
                  className="form-input"
                  type="number"
                  value={editing.deposit !== undefined && editing.deposit !== null ? String(editing.deposit) : ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      deposit: e.target.value === "" ? undefined : Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="رقم عقد إيجار">
                <input
                  className="form-input"
                  value={editing.ejarContractNumber ?? ""}
                  onChange={(e) => setEditing({ ...editing, ejarContractNumber: e.target.value })}
                />
              </Field>
              <Field label="طريقة الدفع">
                <input
                  className="form-input"
                  list={PAYMENT_METHODS_LIST_ID}
                  value={editing.paymentMethod ?? ""}
                  onChange={(e) => setEditing({ ...editing, paymentMethod: e.target.value })}
                />
              </Field>
              <Field label="تكرار الدفع">
                <input
                  className="form-input"
                  list={PAYMENT_FREQUENCIES_LIST_ID}
                  value={editing.paymentFrequency ?? ""}
                  onChange={(e) => setEditing({ ...editing, paymentFrequency: e.target.value })}
                />
              </Field>
              <Field label="الخدمات المشمولة">
                <input
                  className="form-input"
                  value={editing.servicesIncluded ?? ""}
                  onChange={(e) => setEditing({ ...editing, servicesIncluded: e.target.value })}
                />
              </Field>
              <label className="md:col-span-2 flex flex-col gap-1 text-sm">
                <span className="text-gray-600">ملاحظات</span>
                <textarea
                  className="form-input h-28"
                  value={editing.notes ?? ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                />
              </label>
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

      {viewing ? (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3">
          <div className="card w-[95%] max-w-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{viewing.tenantName}</h3>
                <p className="text-sm text-gray-500 dark:text-slate-300">
                  عقد رقم {viewing.id} — {mapRentalType(viewing.rentalType)}
                </p>
              </div>
              <button className="btn-soft btn-soft-info" onClick={() => setViewing(null)}>إغلاق</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <Info label="رقم عقد إيجار">{viewing.ejarContractNumber || "—"}</Info>
              <Info label="رقم الوحدة">{viewing.unit?.unitNumber || viewing.unit?.number || "-"}</Info>
              <Info label="بداية العقد">{formatDate(viewing.startDate, localeTag)}</Info>
              <Info label="نهاية العقد">{formatDate(viewing.endDate, localeTag)}</Info>
              <Info label="حالة العقد">{mapStatus(viewing.status)}</Info>
              <Info label="طريقة الدفع">{viewing.paymentMethod || "—"}</Info>
              <Info label="تكرار الدفع">{viewing.paymentFrequency || "—"}</Info>
              <Info label="الخدمات المشمولة">{viewing.servicesIncluded || "—"}</Info>
              <Info label="قيمة الإيجار">
                {typeof viewing.rentAmount === "number" ? <Currency amount={viewing.rentAmount} /> : "—"}
              </Info>
              <Info label="إجمالي العقد">
                {typeof viewing.amount === "number" ? <Currency amount={viewing.amount} /> : "—"}
              </Info>
              <Info label="التأمين">
                {typeof viewing.deposit === "number" ? <Currency amount={viewing.deposit} /> : "—"}
              </Info>
              <Info label="ملاحظات">{viewing.notes || "—"}</Info>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={() => {
                  setViewing(null);
                  setEditing(viewing);
                }}
                className="btn-soft btn-soft-info inline-flex items-center gap-2"
              >
                <Pencil className="w-4 h-4" />
                تعديل
              </button>
              <button
                onClick={async () => {
                  await handleEnd(viewing.id);
                  setViewing(null);
                }}
                className="btn-soft btn-soft-warning inline-flex items-center gap-2"
              >
                <Flag className="w-4 h-4" />
                إنهاء
              </button>
              <button
                onClick={async () => {
                  await handleDelete(viewing.id);
                  setViewing(null);
                }}
                className="btn-soft btn-soft-danger inline-flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                حذف
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <datalist id={PAYMENT_METHODS_LIST_ID}>
        {PAYMENT_METHODS.map((method) => (
          <option key={method} value={method} />
        ))}
      </datalist>
      <datalist id={PAYMENT_FREQUENCIES_LIST_ID}>
        {PAYMENT_FREQUENCIES.map((freq) => (
          <option key={freq} value={freq} />
        ))}
      </datalist>
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

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200/60 bg-white/70 px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="text-xs text-gray-500 dark:text-slate-300">{label}</div>
      <div className="mt-1 text-sm font-medium text-gray-800 dark:text-white">{children}</div>
    </div>
  );
}

function mapRentalType(v?: string) {
  if (v === "DAILY") return "يومي";
  return "شهري";
}

type ContractFormState = {
  tenantName: string;
  unitId?: number;
  startDate?: string;
  endDate?: string;
  amount?: number;
  rentAmount?: number;
  rentalType: string;
  deposit?: number;
  ejarContractNumber?: string;
  paymentMethod?: string;
  paymentFrequency?: string;
  servicesIncluded?: string;
  notes?: string;
};

function AddContractButton({ onAdded, propertyId }: { onAdded: () => void; propertyId?: string }) {
  const [open, setOpen] = useState(false);
  const [units, setUnits] = useState<Array<{ id: number; unitNumber: string }>>([]);
  const [form, setForm] = useState<ContractFormState>({ tenantName: '', rentalType: 'MONTHLY' });

  useEffect(() => {
    if (!open) return;
    const qp = propertyId ? `?propertyId=${propertyId}` : '';
    api.get(`/api/units${qp}`).then(r => setUnits((r.data || []).map((u:any)=>({id:u.id, unitNumber:(u.unitNumber||u.number)}))))
      .catch(()=>{});
  }, [open, propertyId]);

  async function save() {
    try {
      const payload: any = {
        tenantName: form.tenantName,
        unitId: form.unitId,
        startDate: form.startDate,
        endDate: form.endDate,
        rentalType: form.rentalType,
      };
      if (form.amount !== undefined) payload.amount = form.amount;
      if (form.rentAmount !== undefined) payload.rentAmount = form.rentAmount;
      if (form.deposit !== undefined) payload.deposit = form.deposit;
      if (form.ejarContractNumber) payload.ejarContractNumber = form.ejarContractNumber.trim();
      if (form.paymentMethod) payload.paymentMethod = form.paymentMethod.trim();
      if (form.paymentFrequency) payload.paymentFrequency = form.paymentFrequency.trim();
      if (form.servicesIncluded) payload.servicesIncluded = form.servicesIncluded.trim();
      if (form.notes) payload.notes = form.notes.trim();
      await api.post('/api/contracts', payload);
      setOpen(false);
      setForm({ tenantName: '', rentalType: 'MONTHLY' });
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
              <Field label="المبلغ الإجمالي">
                <input
                  className="form-input"
                  type="number"
                  value={form.amount !== undefined && form.amount !== null ? String(form.amount) : ""}
                  onChange={(e)=>setForm({...form, amount: e.target.value === "" ? undefined : Number(e.target.value)})}
                />
              </Field>
              <Field label="قيمة الإيجار">
                <input
                  className="form-input"
                  type="number"
                  value={form.rentAmount !== undefined && form.rentAmount !== null ? String(form.rentAmount) : ""}
                  onChange={(e)=>setForm({...form, rentAmount: e.target.value === "" ? undefined : Number(e.target.value)})}
                />
              </Field>
              <Field label="نوع الإيجار">
                <select className="form-select" value={form.rentalType} onChange={(e)=>setForm({...form, rentalType: e.target.value})}>
                  <option value="MONTHLY">شهري</option>
                  <option value="DAILY">يومي</option>
                </select>
              </Field>
              <Field label="التأمين">
                <input
                  className="form-input"
                  type="number"
                  value={form.deposit !== undefined && form.deposit !== null ? String(form.deposit) : ""}
                  onChange={(e) => setForm({ ...form, deposit: e.target.value === "" ? undefined : Number(e.target.value) })}
                />
              </Field>
              <Field label="رقم عقد إيجار">
                <input className="form-input" value={form.ejarContractNumber || ""} onChange={(e)=>setForm({...form, ejarContractNumber: e.target.value})} />
              </Field>
              <Field label="طريقة الدفع">
                <input
                  className="form-input"
                  list={PAYMENT_METHODS_LIST_ID}
                  value={form.paymentMethod || ""}
                  onChange={(e)=>setForm({...form, paymentMethod: e.target.value})}
                />
              </Field>
              <Field label="تكرار الدفع">
                <input
                  className="form-input"
                  list={PAYMENT_FREQUENCIES_LIST_ID}
                  value={form.paymentFrequency || ""}
                  onChange={(e)=>setForm({...form, paymentFrequency: e.target.value})}
                />
              </Field>
              <Field label="الخدمات المشمولة">
                <input className="form-input" value={form.servicesIncluded || ""} onChange={(e)=>setForm({...form, servicesIncluded: e.target.value})} />
              </Field>
              <label className="md:col-span-2 flex flex-col gap-1 text-sm">
                <span className="text-gray-600">ملاحظات</span>
                <textarea className="form-input h-24" value={form.notes || ""} onChange={(e)=>setForm({...form, notes: e.target.value})} />
              </label>
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









