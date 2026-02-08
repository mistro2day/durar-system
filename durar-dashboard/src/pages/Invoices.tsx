import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { Eye, PlusCircle, X } from "lucide-react";
import api from "../lib/api";
import DateInput from "../components/DateInput";
import { useLocaleTag } from "../lib/settings-react";
import Currency from "../components/Currency";
import SortHeader from "../components/SortHeader";
import { useTableSort } from "../hooks/useTableSort";

type Payment = {
  id: number;
  amount: number;
  method: string;
  paidAt: string;
};

type Invoice = {
  id: number;
  amount: number;
  status: string;
  dueDate: string;
  contract?: {
    id: number;
    tenantName?: string | null;
    unit?: {
      id: number;
      number?: string | null;
      property?: {
        id: number;
        name?: string | null;
      } | null;
    } | null;
  } | null;
  payments?: Payment[];
};

type InvoiceSortKey = "id" | "tenant" | "unit" | "property" | "amount" | "paid" | "balance" | "status" | "dueDate";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export default function Invoices() {
  const [items, setItems] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  const [tenantSearch, setTenantSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);

  const clearFilters = useCallback(() => {
    setTenantSearch("");
    setStatusFilter("ALL");
    setFrom("");
    setTo("");
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      tenantSearch !== "" ||
      statusFilter !== "ALL" ||
      from !== "" ||
      to !== ""
    );
  }, [tenantSearch, statusFilter, from, to]);

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

  const filteredItems = useMemo(() => {
    const term = tenantSearch.trim().toLowerCase();
    return items.filter((inv) => {
      const okStatus = statusFilter === "ALL" || inv.status === statusFilter;
      const d = inv.dueDate ? new Date(inv.dueDate) : null;
      const okFrom = !from || (d && d >= new Date(from));
      const okTo = !to || (d && d <= new Date(to));
      const tenantName = inv.contract?.tenantName?.toLowerCase() || "";
      const okTenant = !term || tenantName.includes(term);
      return okStatus && okFrom && okTo && okTenant;
    });
  }, [items, statusFilter, from, to, tenantSearch]);

  const invoiceSortAccessors = useMemo<Record<InvoiceSortKey, (inv: Invoice) => unknown>>(
    () => ({
      id: (inv) => inv.id,
      tenant: (inv) => inv.contract?.tenantName || "",
      unit: (inv) => inv.contract?.unit?.number || "",
      property: (inv) => inv.contract?.unit?.property?.name || "",
      amount: (inv) => Number(inv.amount || 0),
      paid: (inv) => (inv.payments || []).reduce((sum, p) => sum + p.amount, 0),
      balance: (inv) => Number((Number(inv.amount || 0) - (inv.payments || []).reduce((sum, p) => sum + p.amount, 0)).toFixed(2)),
      status: (inv) => inv.status || "",
      dueDate: (inv) => inv.dueDate || "",
    }),
    []
  );

  const {
    sortedItems: sortedInvoices,
    sortState: invoiceSort,
    toggleSort: toggleInvoiceSort,
  } = useTableSort<Invoice, InvoiceSortKey>(filteredItems, invoiceSortAccessors, {
    key: "dueDate",
    direction: "desc",
  });

  const total = useMemo(() => filteredItems.reduce((s, i) => s + Number(i.amount || 0), 0), [filteredItems]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(sortedInvoices.length / pageSize)),
    [sortedInvoices.length, pageSize]
  );

  useEffect(() => {
    setPage(1);
  }, [tenantSearch, statusFilter, from, to, pageSize, items.length]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pagedInvoices = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedInvoices.slice(start, start + pageSize);
  }, [sortedInvoices, page, pageSize]);

  const rangeStart = sortedInvoices.length ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = sortedInvoices.length ? Math.min(page * pageSize, sortedInvoices.length) : 0;
  const hasResults = sortedInvoices.length > 0;

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

      <div className="card mb-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <div className="flex-1 min-w-[280px]">
            <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5 block">بحث بالمستأجر:</label>
            <div className="relative group">
              <input
                className="form-input w-full pr-10 border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="اسم المستأجر..."
                value={tenantSearch}
                onChange={(e) => setTenantSearch(e.target.value)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
            </div>
          </div>

          <div className="w-40">
            <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5 block">الحالة:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-select w-full bg-gray-50/50 dark:bg-white/5 border-gray-200 dark:border-white/10"
            >
              <option value="ALL">الكل</option>
              <option value="PAID">مدفوعة</option>
              <option value="PARTIAL">سداد جزئي</option>
              <option value="PENDING">معلّقة</option>
              <option value="OVERDUE">متأخرة</option>
            </select>
          </div>

          <div className="w-44">
            <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5 block">من تاريخ:</label>
            <DateInput value={from} onChange={setFrom} />
          </div>

          <div className="w-44">
            <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5 block">إلى تاريخ:</label>
            <DateInput value={to} onChange={setTo} />
          </div>

          <div className="w-24">
            <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5 block">عرض:</label>
            <select
              className="form-select w-full bg-gray-50/50 dark:bg-white/5 border-gray-200 dark:border-white/10"
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

          <div className="flex-1 md:flex-none flex items-center justify-end gap-3 ms-auto pt-5">
            <div className="text-sm font-medium text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-white/5 px-3 py-2 rounded-lg border border-gray-100 dark:border-white/10">
              إجمالي المعروض: <span className="text-gray-900 dark:text-white font-bold ms-1"><Currency amount={total} locale={localeTag} /></span>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                title="مسح جميع الفلاتر"
              >
                <X className="w-4 h-4" />
                <span>إزالة الفلترة</span>
              </button>
            )}
            <AddInvoiceButton onAdded={load} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card text-center text-gray-500">جاري التحميل...</div>
      ) : error ? (
        <div className="card text-center text-red-600">{error}</div>
      ) : !hasResults ? (
        <div className="card text-center text-gray-500">لا توجد فواتير مطابقة للمعايير الحالية.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table sticky">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-right p-3 font-semibold text-gray-700">
                  <SortHeader
                    label="#"
                    active={invoiceSort?.key === "id"}
                    direction={invoiceSort?.key === "id" ? invoiceSort.direction : null}
                    onToggle={() => toggleInvoiceSort("id")}
                  />
                </th>
                <th className="text-right p-3 font-semibold text-gray-700">
                  <SortHeader
                    label="المستأجر"
                    active={invoiceSort?.key === "tenant"}
                    direction={invoiceSort?.key === "tenant" ? invoiceSort.direction : null}
                    onToggle={() => toggleInvoiceSort("tenant")}
                  />
                </th>
                <th className="text-right p-3 font-semibold text-gray-700">
                  <SortHeader
                    label="الوحدة"
                    active={invoiceSort?.key === "unit"}
                    direction={invoiceSort?.key === "unit" ? invoiceSort.direction : null}
                    onToggle={() => toggleInvoiceSort("unit")}
                  />
                </th>
                <th className="text-right p-3 font-semibold text-gray-700">
                  <SortHeader
                    label="العقار"
                    active={invoiceSort?.key === "property"}
                    direction={invoiceSort?.key === "property" ? invoiceSort.direction : null}
                    onToggle={() => toggleInvoiceSort("property")}
                  />
                </th>
                <th className="text-right p-3 font-semibold text-gray-700">
                  <SortHeader
                    label="المبلغ"
                    active={invoiceSort?.key === "amount"}
                    direction={invoiceSort?.key === "amount" ? invoiceSort.direction : null}
                    onToggle={() => toggleInvoiceSort("amount")}
                  />
                </th>
                <th className="text-right p-3 font-semibold text-gray-700">
                  <SortHeader
                    label="المدفوع"
                    active={invoiceSort?.key === "paid"}
                    direction={invoiceSort?.key === "paid" ? invoiceSort.direction : null}
                    onToggle={() => toggleInvoiceSort("paid")}
                  />
                </th>
                <th className="text-right p-3 font-semibold text-gray-700">
                  <SortHeader
                    label="المتبقي"
                    active={invoiceSort?.key === "balance"}
                    direction={invoiceSort?.key === "balance" ? invoiceSort.direction : null}
                    onToggle={() => toggleInvoiceSort("balance")}
                  />
                </th>
                <th className="text-right p-3 font-semibold text-gray-700">
                  <SortHeader
                    label="الحالة"
                    active={invoiceSort?.key === "status"}
                    direction={invoiceSort?.key === "status" ? invoiceSort.direction : null}
                    onToggle={() => toggleInvoiceSort("status")}
                  />
                </th>
                <th className="text-right p-3 font-semibold text-gray-700">
                  <SortHeader
                    label="تاريخ الاستحقاق"
                    active={invoiceSort?.key === "dueDate"}
                    direction={invoiceSort?.key === "dueDate" ? invoiceSort.direction : null}
                    onToggle={() => toggleInvoiceSort("dueDate")}
                  />
                </th>
                <th className="text-right p-3 font-semibold text-gray-700">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pagedInvoices.map((inv) => (
                <tr key={inv.id} className="odd:bg-white even:bg-gray-50">
                  <Td>
                    <Link to={`/invoices/${inv.id}`} className="text-indigo-600 hover:text-indigo-800 hover:underline">
                      #{inv.id}
                    </Link>
                  </Td>
                  <Td>{inv.contract?.tenantName || "-"}</Td>
                  <Td>{inv.contract?.unit?.number || "-"}</Td>
                  <Td>{inv.contract?.unit?.property?.name || "-"}</Td>
                  <Td><Currency amount={Number(inv.amount || 0)} locale={localeTag} /></Td>
                  <Td>
                    <Currency
                      amount={(inv.payments || []).reduce((sum, p) => sum + p.amount, 0)}
                      locale={localeTag}
                      className="text-green-600 font-medium"
                    />
                  </Td>
                  <Td>
                    <Currency
                      amount={Number((Math.max(0, Number(inv.amount || 0) - (inv.payments || []).reduce((sum, p) => sum + p.amount, 0))).toFixed(2))}
                      locale={localeTag}
                      className="text-red-600 font-medium"
                    />
                  </Td>
                  <Td>
                    <select
                      className={`transition-colors appearance-none cursor-pointer text-xs border rounded px-2 py-1 font-semibold ${inv.status === 'PAID' ? 'text-[--color-success] bg-[--color-success]/10 border-[--color-success]/20' :
                        inv.status === 'PARTIAL' ? 'text-indigo-600 bg-indigo-50 border-indigo-200' :
                          inv.status === 'OVERDUE' ? 'text-[--color-danger] bg-[--color-danger]/10 border-[--color-danger]/20' :
                            'text-[#7c2d12] bg-[#fff7ed] border-[#fed7aa]'
                        } ${savingId === inv.id ? "opacity-60" : ""}`}
                      value={inv.status}
                      onChange={(e) => updateStatus(inv.id, e.target.value)}
                      disabled={savingId === inv.id}
                    >
                      <option value="PAID" className="bg-white text-green-700">مدفوعة</option>
                      <option value="PARTIAL" className="bg-white text-indigo-700">سداد جزئي</option>
                      <option value="PENDING" className="bg-white text-[#7c2d12]">معلّقة</option>
                      <option value="OVERDUE" className="bg-white text-red-700">متأخرة</option>
                    </select>
                  </Td>
                  <Td>{fmtDate(inv.dueDate)}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Link to={`/invoices/${inv.id}`} state={{ invoice: inv }} className="btn-soft btn-soft-primary" title="عرض التفاصيل">
                        <Eye className="w-4 h-4" />
                      </Link>
                      {inv.status !== 'PAID' && (
                        <RecordPaymentModal invoice={inv} onRecorded={load} />
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-sm text-gray-600">
            <div>
              عرض {rangeStart}-{rangeEnd} من {sortedInvoices.length} فاتورة
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
  const [contractInput, setContractInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    api.get('/api/contracts').then(r => setContracts((r.data || []).map((c: any) => ({ id: c.id, tenantName: c.tenantName })))).catch(() => { });
  }, [open]);

  async function save() {
    if (saving) return;
    if (!form.contractId) {
      alert("يرجى اختيار عقد من القائمة.");
      return;
    }
    if (!form.amount || Number.isNaN(form.amount) || form.amount <= 0) {
      alert("يرجى إدخال مبلغ صحيح.");
      return;
    }
    if (!form.dueDate) {
      alert("يرجى تحديد تاريخ الاستحقاق.");
      return;
    }
    if (!form.status) {
      alert("يرجى اختيار حالة الفاتورة.");
      return;
    }

    try {
      setSaving(true);
      const payload: any = { contractId: form.contractId, amount: form.amount, dueDate: form.dueDate, status: form.status };
      await api.post('/api/invoices', payload);
      reset();
      onAdded();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'تعذر إضافة الفاتورة');
    } finally {
      setSaving(false);
    }
  }

  const contractOptions = useMemo(
    () => contracts.map((c) => ({ id: c.id, label: `${c.tenantName} (#${c.id})` })),
    [contracts]
  );

  useEffect(() => {
    if (!open) return;
    const match = contractOptions.find((opt) => opt.id === form.contractId);
    setContractInput(match?.label ?? "");
  }, [open, contractOptions, form.contractId]);

  function reset() {
    setOpen(false);
    setForm({ status: 'PENDING' });
    setContractInput("");
  }

  return (
    <>
      <button className="btn-soft btn-soft-primary" onClick={() => setOpen(true)}>
        إضافة فاتورة
      </button>
      {open ? (
        <div className="modal-backdrop">
          <div className="card w-full max-w-xl">
            <h3 className="text-lg font-semibold mb-4">فاتورة جديدة</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-gray-600">العقد</span>
                <input
                  className="form-input"
                  list="invoice-contract-options"
                  placeholder="اختر عقداً أو ابحث باسم المستأجر"
                  value={contractInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setContractInput(value);
                    const match = contractOptions.find(
                      (opt) => opt.label === value || String(opt.id) === value
                    );
                    setForm((prev) => ({ ...prev, contractId: match?.id }));
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    const match = contractOptions.find(
                      (opt) => opt.label === value || String(opt.id) === value
                    );
                    if (!match) {
                      setForm((prev) => ({ ...prev, contractId: undefined }));
                      setContractInput("");
                    } else {
                      setContractInput(match.label);
                    }
                  }}
                />
                <datalist id="invoice-contract-options">
                  {contractOptions.map((opt) => (
                    <option key={opt.id} value={opt.label} />
                  ))}
                </datalist>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-gray-600">المبلغ</span>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  required
                  value={form.amount ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm((prev) => ({ ...prev, amount: value ? Number(value) : undefined }));
                  }}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-gray-600">تاريخ الاستحقاق</span>
                <DateInput value={form.dueDate || ''} onChange={(v) => setForm({ ...form, dueDate: v })} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-gray-600">الحالة</span>
                <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="PENDING">معلّقة</option>
                  <option value="PAID">مدفوعة</option>
                  <option value="OVERDUE">متأخرة</option>
                </select>
              </label>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button className="btn-outline disabled:opacity-60" onClick={reset} disabled={saving}>إلغاء</button>
              <button className="btn-primary disabled:opacity-60" onClick={save} disabled={saving}>
                {saving ? "جارٍ الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function RecordPaymentModal({ invoice, onRecorded }: { invoice: Invoice, onRecorded: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    amount: (Number(invoice.amount) - (invoice.payments || []).reduce((s, p) => s + p.amount, 0)).toFixed(2),
    paidAt: new Date().toISOString().split('T')[0],
    method: 'BANK_TRANSFER'
  });

  async function save() {
    if (saving) return;
    if (!form.amount || Number(form.amount) <= 0) return alert("المبلغ غير صحيح");

    try {
      setSaving(true);
      await api.post(`/api/invoices/${invoice.id}/payments`, {
        amount: Number(form.amount),
        paidAt: form.paidAt,
        method: form.method
      });
      setOpen(false);
      onRecorded();
    } catch (e: any) {
      alert(e?.response?.data?.message || "تعذر تسجيل الدفعة");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        className="btn-soft btn-soft-success"
        onClick={() => setOpen(true)}
        title="تسجيل دفعة"
      >
        <PlusCircle className="w-4 h-4" />
      </button>

      {open && (
        <div className="modal-backdrop">
          <div className="card w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">تسجيل دفعة للفاتورة #{invoice.id}</h3>

            <div className="space-y-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-gray-600 font-medium">المبلغ</span>
                <input
                  type="number"
                  className="form-input"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="text-gray-600 font-medium">تاريخ الدفع</span>
                <DateInput value={form.paidAt} onChange={(v) => setForm({ ...form, paidAt: v })} />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="text-gray-600 font-medium">طريقة الدفع</span>
                <select
                  className="form-select"
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
                >
                  <option value="CASH">نقدي</option>
                  <option value="BANK_TRANSFER">تحويل بنكي</option>
                  <option value="EJAR">إيجار</option>
                </select>
              </label>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button className="btn-outline" onClick={() => setOpen(false)} disabled={saving}>إلغاء</button>
              <button className="btn-primary" onClick={save} disabled={saving}>
                {saving ? "جارٍ الحفظ..." : "تسجيل الدفعة"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
