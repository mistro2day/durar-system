import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import api from "../lib/api";
import DateInput from "../components/DateInput";
import { useLocaleTag } from "../lib/settings-react";
import { formatSAR } from "../lib/currency";
import Currency from "../components/Currency";

type Invoice = {
  id: number;
  amount: number;
  status: string;
  dueDate: string;
  contract?: { id: number; tenantName?: string } | null;
};

export default function Invoices() {
  const [items, setItems] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const params = useParams();
  const propertyId = (params as any)?.id as string | undefined;

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const res = await api.get<Invoice[]>(`/api/invoices${propertyId ? `?propertyId=${propertyId}` : ""}`);
      setItems(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || "تعذر جلب الفواتير");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((inv) => {
      const okStatus = statusFilter === "ALL" || inv.status === statusFilter;
      const d = inv.dueDate ? new Date(inv.dueDate) : null;
      const okFrom = !from || (d && d >= new Date(from));
      const okTo = !to || (d && d <= new Date(to));
      return okStatus && okFrom && okTo;
    });
  }, [items, statusFilter, from, to]);

  const total = useMemo(() => filtered.reduce((s, i) => s + Number(i.amount || 0), 0), [filtered]);

  async function updateStatus(id: number, status: string) {
    setSavingId(id);
    try {
      await api.patch(`/api/invoices/${id}`, { status });
      // update locally without refetch
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)));
    } catch (e: any) {
      alert(e?.response?.data?.message || "تعذر تحديث حالة الفاتورة");
    } finally {
      setSavingId(null);
    }
  }

  const localeTag = useLocaleTag();
  const fmtDate = (d?: string) => {
    if (!d) return "-";
    try { return new Date(d).toLocaleDateString(localeTag); } catch { return "-"; }
  };
  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">الفواتير</h2>

      <div className="card mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col text-sm">
          <label className="text-gray-600 mb-1">الحالة</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-select">
            <option value="ALL">الكل</option>
            <option value="PAID">مدفوعة</option>
            <option value="PENDING">معلّقة</option>
            <option value="OVERDUE">متأخرة</option>
          </select>
        </div>
        <div className="flex flex-col text-sm">
          <label className="text-gray-600 mb-1">من تاريخ</label>
          <DateInput value={from} onChange={setFrom} />
        </div>
        <div className="flex flex-col text-sm">
          <label className="text-gray-600 mb-1">إلى تاريخ</label>
          <DateInput value={to} onChange={setTo} />
        </div>
        <div className="ml-auto text-sm text-gray-700">
          الإجمالي: <strong><Currency amount={total} locale={localeTag} /></strong>
        </div>
        <div className="ml-2">
          <AddInvoiceButton onAdded={load} />
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
                <th className="text-right p-3 font-semibold text-gray-700">#</th>
                <th className="text-right p-3 font-semibold text-gray-700">المستأجر</th>
                <th className="text-right p-3 font-semibold text-gray-700">المبلغ</th>
                <th className="text-right p-3 font-semibold text-gray-700">الحالة</th>
                <th className="text-right p-3 font-semibold text-gray-700">تاريخ الاستحقاق</th>
                <th className="text-right p-3 font-semibold text-gray-700">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((inv) => (
                <tr key={inv.id} className="odd:bg-white even:bg-gray-50">
                  <Td>{inv.id}</Td>
                  <Td>{inv.contract?.tenantName || "-"}</Td>
                  <Td><Currency amount={Number(inv.amount || 0)} locale={localeTag} /></Td>
                  <Td>
                    <select
                      className={`border rounded p-1 ${savingId === inv.id ? "opacity-60" : ""}`}
                      value={inv.status}
                      onChange={(e) => updateStatus(inv.id, e.target.value)}
                      disabled={savingId === inv.id}
                    >
                      <option value="PAID">مدفوعة</option>
                      <option value="PENDING">معلّقة</option>
                      <option value="OVERDUE">متأخرة</option>
                    </select>
                  </Td>
                  <Td>{fmtDate(inv.dueDate)}</Td>
                  <Td>
                    <Link to={`/invoices/${inv.id}`} state={{ invoice: inv }} className="btn-soft btn-soft-primary" title="عرض التفاصيل">
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">عرض</span>
                    </Link>
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

// (تم استبدال دالة formatDate بدالة محلية داخل المكون أعلاه)

function AddInvoiceButton({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [contracts, setContracts] = useState<Array<{ id: number; tenantName: string }>>([]);
  const [form, setForm] = useState<{ contractId?: number; amount?: number; dueDate?: string; status: string }>({ status: 'PENDING' });

  useEffect(() => {
    if (!open) return;
    api.get('/api/contracts').then(r => setContracts((r.data || []).map((c: any)=>({id:c.id, tenantName:c.tenantName})))).catch(()=>{});
  }, [open]);

  async function save() {
    try {
      const payload: any = { contractId: form.contractId, amount: form.amount, dueDate: form.dueDate, status: form.status };
      await api.post('/api/invoices', payload);
      setOpen(false);
      onAdded();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'تعذر إضافة الفاتورة');
    }
  }

  return (
    <>
      <button className="btn-soft btn-soft-primary" onClick={()=>setOpen(true)}>
        إضافة فاتورة
      </button>
      {open ? (
        <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center p-3">
          <div className="card w-full max-w-xl">
            <h3 className="text-lg font-semibold mb-4">فاتورة جديدة</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-gray-600">العقد</span>
                <select className="form-select" value={String(form.contractId||'')} onChange={(e)=>setForm({...form, contractId: Number(e.target.value)})}>
                  <option value="">—</option>
                  {contracts.map(c=> (<option key={c.id} value={c.id}>{c.tenantName}</option>))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-gray-600">المبلغ</span>
                <input className="form-input" type="number" value={String(form.amount||'')} onChange={(e)=>setForm({...form, amount: Number(e.target.value)})} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-gray-600">تاريخ الاستحقاق</span>
                <DateInput value={form.dueDate || ''} onChange={(v)=>setForm({...form, dueDate: v})} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-gray-600">الحالة</span>
                <select className="form-select" value={form.status} onChange={(e)=>setForm({...form, status: e.target.value})}>
                  <option value="PENDING">معلّقة</option>
                  <option value="PAID">مدفوعة</option>
                  <option value="OVERDUE">متأخرة</option>
                </select>
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
