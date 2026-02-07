import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useParams, Link } from "react-router-dom";
import api from "../lib/api";
import { useLocaleTag } from "../lib/settings-react";
import { DEFAULT_DATE_LOCALE } from "../lib/settings";
import { Eye, Pencil, Trash2, Flag, Loader2, MessageCircle, MessageSquare, X, RefreshCw } from "lucide-react";
import { RenewContractModal } from "../components/RenewContractModal";
import DateInput from "../components/DateInput";
import { toDateInput, fromDateInput } from "../components/date-input-helpers";
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
  unit?: {
    id: number;
    unitNumber?: string;
    number?: string;
    propertyId?: number;
    property?: { id: number; name?: string | null } | null;
  } | null;
  tenant?: { id: number; name: string; phone?: string | null } | null;
  rentAmount?: number | null;
  amount?: number | null;
  deposit?: number | null;
  ejarContractNumber?: string | null;
  paymentMethod?: string | null;
  paymentFrequency?: string | null;
  servicesIncluded?: string | null;
  notes?: string | null;
  renewalStatus?: string | null;
};

type ContractSortKey =
  | "tenant"
  | "unit"
  | "property"
  | "rentalType"
  | "status"
  | "rentAmount"
  | "deposit"
  | "ejar"
  | "payment"
  | "startDate"
  | "endDate"
  | "renewalStatus";

const PAYMENT_METHODS = ["كاش", "تحويل بنكي", "منصة إيجار"] as const;

const PAYMENT_FREQUENCIES = [
  "شهري",
  "ربع سنوي",
  "نصف سنوي",
  "سنوي",
  "كل 6 أشهر",
] as const;

const PAYMENT_METHODS_LIST_ID = "payment-methods-options";
const PAYMENT_FREQUENCIES_LIST_ID = "payment-frequencies-options";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export default function Contracts() {
  const [items, setItems] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [viewing, setViewing] = useState<Contract | null>(null);
  const [search, setSearch] = useState("");
  const [renewalFilter, setRenewalFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [endedPage, setEndedPage] = useState(1);
  const [endedPageSize, setEndedPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [renewing, setRenewing] = useState<Contract | null>(null);

  const clearFilters = useCallback(() => {
    setSearch("");
    setRenewalFilter("ALL");
  }, []);

  const hasActiveFilters = useMemo(() => {
    return search !== "" || renewalFilter !== "ALL";
  }, [search, renewalFilter]);

  const params = useParams();
  const propertyId = (params as any)?.id as string | undefined;
  const location = useLocation();

  const load = useCallback(async () => {
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
  }, [propertyId]);

  useEffect(() => {
    load();
  }, [load]);

  // فتح نافذة التعديل تلقائياً عند وجود ?editId= في الرابط
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const idRaw = sp.get('editId');
    if (!idRaw) return;
    const id = Number(idRaw);
    const c = items.find(x => x.id === id);
    if (c) setEditing(c);
  }, [location.search, items]);

  const getWhatsAppLink = (phone?: string | null) => {
    if (!phone) return null;
    let p = phone.replace(/[^\d]/g, "");
    if (!p) return null;
    if (p.startsWith("0")) p = "966" + p.substring(1);
    return `https://wa.me/${p}`;
  };

  const getSmsLink = (phone?: string | null) => {
    if (!phone) return null;
    return `sms:${phone}`;
  };

  const { activeRows, endedRows } = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = items.filter((c) => {
      const tenant = (c.tenantName || "").toLowerCase();
      const ejar = (c.ejarContractNumber || "").toLowerCase();
      const unitNumber = (c.unit?.unitNumber || c.unit?.number || "").toLowerCase();
      const propertyName = (c.unit?.property?.name || "").toLowerCase();
      return (
        tenant.includes(term) ||
        (unitNumber && unitNumber.includes(term)) ||
        (ejar && ejar.includes(term)) ||
        (propertyName && propertyName.includes(term))
      );
    }).filter(c => {
      if (renewalFilter === "ALL") return true;
      return (c.renewalStatus || "PENDING") === renewalFilter;
    });

    return {
      activeRows: filtered.filter(c => c.status === 'ACTIVE'),
      endedRows: filtered.filter(c => c.status === 'ENDED' || c.status === 'CANCELLED')
    };
  }, [items, search, renewalFilter]);

  const contractSortAccessors = useMemo<Record<ContractSortKey, (c: Contract) => unknown>>(
    () => ({
      tenant: (c) => c.tenantName || "",
      unit: (c) => c.unit?.unitNumber || c.unit?.number || "",
      property: (c) => c.unit?.property?.name || "",
      rentalType: (c) => c.rentalType || "",
      status: (c) => c.status || "",
      rentAmount: (c) => c.rentAmount ?? Number.NEGATIVE_INFINITY,
      deposit: (c) => c.deposit ?? Number.NEGATIVE_INFINITY,
      ejar: (c) => c.ejarContractNumber || "",
      payment: (c) => c.paymentMethod || "",
      startDate: (c) => c.startDate,
      endDate: (c) => c.endDate,
      renewalStatus: (c) => c.renewalStatus || "PENDING",
    }),
    []
  );

  const {
    sortedItems: activeSortedRows,
    sortState: activeSort,
    toggleSort: toggleActiveSort,
  } = useTableSort<Contract, ContractSortKey>(activeRows, contractSortAccessors);

  const {
    sortedItems: endedSortedRows,
    sortState: endedSort,
    toggleSort: toggleEndedSort,
  } = useTableSort<Contract, ContractSortKey>(endedRows, contractSortAccessors);

  const pagedActiveRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return activeSortedRows.slice(start, start + pageSize);
  }, [activeSortedRows, page, pageSize]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(activeSortedRows.length / pageSize)),
    [activeSortedRows.length, pageSize]
  );

  const pagedEndedRows = useMemo(() => {
    const start = (endedPage - 1) * endedPageSize;
    return endedSortedRows.slice(start, start + endedPageSize);
  }, [endedSortedRows, endedPage, endedPageSize]);

  const endedTotalPages = useMemo(
    () => Math.max(1, Math.ceil(endedSortedRows.length / endedPageSize)),
    [endedSortedRows.length, endedPageSize]
  );

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
            className="form-input w-full md:w-64"
            placeholder="المستأجر أو رقم الوحدة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>قرار التجديد</span>
          <select
            className="form-select"
            value={renewalFilter}
            onChange={(e) => setRenewalFilter(e.target.value)}
          >
            <option value="ALL">الكل</option>
            <option value="PENDING">قيد الانتظار</option>
            <option value="RENEWED">تم التجديد</option>
            <option value="NOT_RENEWING">لن يتم التجديد</option>
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>عدد النتائج:</span>
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
        <div className="md:ms-auto flex items-center gap-3">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors ms-auto"
              title="مسح جميع الفلاتر"
            >
              <X className="w-4 h-4" />
              <span>إزالة الفلترة</span>
            </button>
          )}
          <AddContractButton onAdded={load} propertyId={propertyId} />
        </div>
      </div>

      {loading ? (
        <div className="card text-center text-gray-500">جاري التحميل...</div>
      ) : error ? (
        <div className="card text-center text-red-600">{error}</div>
      ) : (
        <div className="space-y-8">
          <div className="card overflow-x-auto">
            <h3 className="text-lg font-bold mb-4 text-emerald-700 dark:text-emerald-400">العقود النشطة</h3>
            <ContractTable
              rows={pagedActiveRows}
              sort={activeSort}
              onSort={toggleActiveSort}
              onView={setViewing}
              onRenew={setRenewing}
              propertyId={propertyId}
              localeTag={localeTag}
            />

            <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
              <div>
                عرض {(page - 1) * pageSize + 1}-
                {Math.min(page * pageSize, activeSortedRows.length)} من {activeSortedRows.length}
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

          {endedSortedRows.length > 0 && (
            <div className="card overflow-x-auto">
              <h3 className="text-lg font-bold mb-4 text-slate-600 dark:text-slate-400">العقود المنتهية والملغاة</h3>
              <ContractTable
                rows={pagedEndedRows}
                sort={endedSort}
                onSort={toggleEndedSort}
                onView={setViewing}
                onRenew={setRenewing}
                propertyId={propertyId}
                localeTag={localeTag}
              />
              <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600 dark:text-slate-400">عرض</span>
                  <select
                    className="form-select py-1 text-sm"
                    value={endedPageSize}
                    onChange={(e) => {
                      setEndedPageSize(Number(e.target.value));
                      setEndedPage(1);
                    }}
                  >
                    {PAGE_SIZE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <span className="text-gray-600 dark:text-slate-400">من أصل {endedSortedRows.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="btn-outline py-1 px-2 text-sm"
                    disabled={endedPage <= 1}
                    onClick={() => setEndedPage(endedPage - 1)}
                  >
                    السابق
                  </button>
                  <span className="text-sm text-gray-700 dark:text-slate-300">
                    {endedPage} / {endedTotalPages}
                  </span>
                  <button
                    className="btn-outline py-1 px-2 text-sm"
                    disabled={endedPage >= endedTotalPages}
                    onClick={() => setEndedPage(endedPage + 1)}
                  >
                    التالي
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {editing ? (
        <div className="modal-backdrop">
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
              <button className="btn-soft btn-soft-secondary" onClick={() => setEditing(null)}>إلغاء</button>
              <button className="btn-primary inline-flex items-center gap-2" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                حفظ
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {viewing ? (
        <div className="modal-backdrop">
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
              {viewing.status === 'ACTIVE' && viewing.renewalStatus !== 'RENEWED' && (
                <button
                  onClick={() => {
                    setViewing(null);
                    setRenewing(viewing);
                  }}
                  className="btn-soft btn-soft-success inline-flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  تجديد
                </button>
              )}
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

      {renewing && (
        <RenewContractModal
          contract={renewing}
          onClose={() => setRenewing(null)}
          onSuccess={() => {
            setRenewing(null);
            load();
          }}
        />
      )}
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const qp = propertyId ? `?propertyId=${propertyId}` : '';
    api.get(`/api/units${qp}`).then(r => setUnits((r.data || []).map((u: any) => ({ id: u.id, unitNumber: (u.unitNumber || u.number) }))))
      .catch(() => { });
  }, [open, propertyId]);

  function closeModal() {
    setOpen(false);
    setForm({ tenantName: '', rentalType: 'MONTHLY' });
    setSaving(false);
  }

  async function save() {
    if (saving) return;
    if (!form.tenantName.trim()) {
      alert("يرجى إدخال اسم المستأجر.");
      return;
    }
    if (!form.unitId) {
      alert("يرجى اختيار الوحدة.");
      return;
    }
    if (!form.startDate || !form.endDate) {
      alert("يرجى تحديد تاريخ البداية والنهاية.");
      return;
    }
    try {
      setSaving(true);
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
      closeModal();
      onAdded();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'تعذر إضافة العقد');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button className="btn-soft btn-soft-primary" onClick={() => setOpen(true)}>
        إضافة عقد
      </button>
      {open ? (
        <div className="modal-backdrop">
          <div className="card w-full max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">عقد جديد</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="اسم المستأجر">
                <input className="form-input" value={form.tenantName} onChange={(e) => setForm({ ...form, tenantName: e.target.value })} />
              </Field>
              <Field label="الوحدة">
                <select className="form-select" value={String(form.unitId || '')} onChange={(e) => setForm({ ...form, unitId: Number(e.target.value) })}>
                  <option value="">—</option>
                  {units.map(u => (<option key={u.id} value={u.id}>{u.unitNumber}</option>))}
                </select>
              </Field>
              <Field label="تاريخ البداية"><DateInput value={form.startDate || ''} onChange={(v) => setForm({ ...form, startDate: v })} /></Field>
              <Field label="تاريخ النهاية"><DateInput value={form.endDate || ''} onChange={(v) => setForm({ ...form, endDate: v })} /></Field>
              <Field label="المبلغ الإجمالي">
                <input
                  className="form-input"
                  type="number"
                  value={form.amount !== undefined && form.amount !== null ? String(form.amount) : ""}
                  onChange={(e) => setForm({ ...form, amount: e.target.value === "" ? undefined : Number(e.target.value) })}
                />
              </Field>
              <Field label="قيمة الإيجار">
                <input
                  className="form-input"
                  type="number"
                  value={form.rentAmount !== undefined && form.rentAmount !== null ? String(form.rentAmount) : ""}
                  onChange={(e) => setForm({ ...form, rentAmount: e.target.value === "" ? undefined : Number(e.target.value) })}
                />
              </Field>
              <Field label="نوع الإيجار">
                <select className="form-select" value={form.rentalType} onChange={(e) => setForm({ ...form, rentalType: e.target.value })}>
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
                <input className="form-input" value={form.ejarContractNumber || ""} onChange={(e) => setForm({ ...form, ejarContractNumber: e.target.value })} />
              </Field>
              <Field label="طريقة الدفع">
                <input
                  className="form-input"
                  list={PAYMENT_METHODS_LIST_ID}
                  value={form.paymentMethod || ""}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                />
              </Field>
              <Field label="تكرار الدفع">
                <input
                  className="form-input"
                  list={PAYMENT_FREQUENCIES_LIST_ID}
                  value={form.paymentFrequency || ""}
                  onChange={(e) => setForm({ ...form, paymentFrequency: e.target.value })}
                />
              </Field>
              <Field label="الخدمات المشمولة">
                <input className="form-input" value={form.servicesIncluded || ""} onChange={(e) => setForm({ ...form, servicesIncluded: e.target.value })} />
              </Field>
              <label className="md:col-span-2 flex flex-col gap-1 text-sm">
                <span className="text-gray-600">ملاحظات</span>
                <textarea className="form-input h-24" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </label>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button className="btn-outline disabled:opacity-60" onClick={closeModal} disabled={saving}>إلغاء</button>
              <button className="btn-primary disabled:opacity-60" onClick={save} disabled={saving}>حفظ</button>
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


function RenewalBadge({ status, endDate, contractStatus, onClick }: { status?: string | null; endDate?: string; contractStatus?: string; onClick: () => void }) {
  const isPending = !status || status === "PENDING";

  if (status === "RENEWED") {
    return (
      <span className="px-2 py-1 rounded-full text-[10px] inline-flex items-center justify-center min-w-[90px] text-center badge-success">
        تم التجديد
      </span>
    );
  }

  if (contractStatus === "ENDED" || contractStatus === "CANCELLED") {
    return (
      <span className="px-2 py-1 rounded-full text-[10px] inline-flex items-center justify-center min-w-[90px] text-center bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300 font-medium">
        منتهي
      </span>
    );
  }

  let label = "قيد الانتظار";
  let className = "badge-warning cursor-pointer hover:scale-105 active:scale-95 transition-transform";

  if (isPending && endDate) {
    try {
      const end = new Date(endDate);
      const now = new Date();
      const endD = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      const nowD = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const diff = endD.getTime() - nowD.getTime();
      const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));

      if (daysLeft < 60) {
        label = "تجديد أو إنهاء";
        className = "bg-orange-600 text-white font-bold border-orange-700 shadow-sm cursor-pointer hover:bg-orange-700 hover:scale-105 active:scale-95 transition-all";
      }
    } catch (e) {
      console.error("Date error:", e);
    }
  }

  if (status === "NOT_RENEWING") {
    label = "لن يتم التجديد";
    className = "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200 font-bold";
  }

  return (
    <span
      onClick={(e) => {
        if (isPending) {
          e.stopPropagation();
          onClick();
        }
      }}
      className={`px-2 py-1 rounded-full text-[10px] inline-flex items-center justify-center min-w-[90px] text-center ${className}`}
    >
      {label}
    </span>
  );
}

function ContractTable({
  rows,
  sort,
  onSort,
  onView,
  onRenew,
  propertyId,
  localeTag
}: {
  rows: Contract[];
  sort: any;
  onSort: (key: ContractSortKey) => void;
  onView: (c: Contract) => void;
  onRenew: (c: Contract) => void;
  propertyId?: string;
  localeTag: string;
}) {
  const getWhatsAppLink = (phone?: string | null) => {
    if (!phone) return null;
    let p = phone.replace(/[^\d]/g, "");
    if (!p) return null;
    if (p.startsWith("0")) p = "966" + p.substring(1);
    return `https://wa.me/${p}`;
  };

  const getSmsLink = (phone?: string | null) => {
    if (!phone) return null;
    return `sms:${phone}`;
  };

  return (
    <table className="table sticky">
      <thead className="bg-gray-50">
        <tr>
          <th className="text-right p-3 font-semibold text-gray-700">تفاصيل</th>
          <th className="text-right p-3 font-semibold text-gray-700">
            <SortHeader
              label="المستأجر"
              active={sort?.key === "tenant"}
              direction={sort?.key === "tenant" ? sort.direction : null}
              onToggle={() => onSort("tenant")}
            />
          </th>
          <th className="text-right p-3 font-semibold text-gray-700">
            <SortHeader
              label="رقم الوحدة"
              active={sort?.key === "unit"}
              direction={sort?.key === "unit" ? sort.direction : null}
              onToggle={() => onSort("unit")}
            />
          </th>
          <th className="text-right p-3 font-semibold text-gray-700">
            <SortHeader
              label="العقار"
              active={sort?.key === "property"}
              direction={sort?.key === "property" ? sort.direction : null}
              onToggle={() => onSort("property")}
            />
          </th>
          <th className="text-right p-3 font-semibold text-gray-700">
            <SortHeader
              label="نوع الإيجار"
              active={sort?.key === "rentalType"}
              direction={sort?.key === "rentalType" ? sort.direction : null}
              onToggle={() => onSort("rentalType")}
            />
          </th>
          <th className="text-right p-3 font-semibold text-gray-700">
            <SortHeader
              label="الحالة"
              active={sort?.key === "status"}
              direction={sort?.key === "status" ? sort.direction : null}
              onToggle={() => onSort("status")}
            />
          </th>
          <th className="text-right p-3 font-semibold text-gray-700">
            <SortHeader
              label="قيمة الإيجار"
              active={sort?.key === "rentAmount"}
              direction={sort?.key === "rentAmount" ? sort.direction : null}
              onToggle={() => onSort("rentAmount")}
            />
          </th>
          <th className="text-right p-3 font-semibold text-gray-700">
            <SortHeader
              label="التأمين"
              active={sort?.key === "deposit"}
              direction={sort?.key === "deposit" ? sort.direction : null}
              onToggle={() => onSort("deposit")}
            />
          </th>
          <th className="text-right p-3 font-semibold text-gray-700">
            <SortHeader
              label="رقم عقد إيجار"
              active={sort?.key === "ejar"}
              direction={sort?.key === "ejar" ? sort.direction : null}
              onToggle={() => onSort("ejar")}
            />
          </th>
          <th className="text-right p-3 font-semibold text-gray-700">
            <SortHeader
              label="الدفع"
              active={sort?.key === "payment"}
              direction={sort?.key === "payment" ? sort.direction : null}
              onToggle={() => onSort("payment")}
            />
          </th>
          <th className="text-right p-3 font-semibold text-gray-700">
            <SortHeader
              label="البداية"
              active={sort?.key === "startDate"}
              direction={sort?.key === "startDate" ? sort.direction : null}
              onToggle={() => onSort("startDate")}
            />
          </th>
          <th className="text-right p-3 font-semibold text-gray-700">
            <SortHeader
              label="النهاية"
              active={sort?.key === "endDate"}
              direction={sort?.key === "endDate" ? sort.direction : null}
              onToggle={() => onSort("endDate")}
            />
          </th>
          <th className="text-right p-3 font-semibold text-gray-700">
            <SortHeader
              label="قرار التجديد"
              active={sort?.key === "renewalStatus"}
              direction={sort?.key === "renewalStatus" ? sort.direction : null}
              onToggle={() => onSort("renewalStatus")}
            />
          </th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {rows.map((c) => {
          const tenantId = c.tenant?.id;
          const propertySegment = propertyId ?? (c.unit?.propertyId !== undefined ? String(c.unit.propertyId) : undefined);
          const tenantHref = tenantId && propertySegment ? `/hotel/${propertySegment}/tenants/${tenantId}` : null;
          return (
            <tr key={c.id} className="odd:bg-white even:bg-gray-50 hover:bg-emerald-50/30 transition-colors">
              <Td>
                <div className="flex items-center gap-2">
                  <button onClick={() => onView(c)} className="btn-soft btn-soft-info" title="عرض التفاصيل">
                    <Eye className="w-4 h-4" />
                    <span className="hidden sm:inline">عرض</span>
                  </button>
                  {c.tenant?.phone ? (
                    <>
                      <a
                        href={getWhatsAppLink(c.tenant.phone) || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-icon-soft text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-500/10"
                        title="واتساب"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                      <a
                        href={getSmsLink(c.tenant.phone) || "#"}
                        className="btn-icon-soft text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10"
                        title="رسالة نصية"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>
                    </>
                  ) : null}
                </div>
              </Td>
              <Td>
                {tenantHref ? (
                  <Link to={tenantHref} className="font-semibold text-gray-900 hover:text-primary hover:underline transition-colors dark:text-white">
                    {c.tenantName}
                  </Link>
                ) : (
                  <span className="font-semibold text-gray-900 dark:text-white">{c.tenantName}</span>
                )}
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
              <Td>{c.unit?.property?.name || "-"}</Td>
              <Td>{mapRentalType(c.rentalType)}</Td>
              <Td>
                <span className={`px-2 py-1 rounded text-xs ${statusClass(c.status)}`}>{mapStatus(c.status)}</span>
              </Td>
              <Td>{typeof c.rentAmount === "number" ? <Currency amount={c.rentAmount} /> : "-"}</Td>
              <Td>{typeof c.deposit === "number" && c.deposit > 0 ? <Currency amount={c.deposit} /> : "-"}</Td>
              <Td>{c.ejarContractNumber || "-"}</Td>
              <Td>
                <div>{c.paymentMethod || "-"}</div>
                {c.paymentFrequency ? <div className="text-xs text-gray-500">التكرار: {c.paymentFrequency}</div> : null}
              </Td>
              <Td>{formatDate(c.startDate, localeTag)}</Td>
              <Td>{formatDate(c.endDate, localeTag)}</Td>
              <Td>
                <RenewalBadge status={c.renewalStatus} endDate={c.endDate} contractStatus={c.status} onClick={() => onRenew(c)} />
              </Td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
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
    return new Date(d).toLocaleDateString(lt || DEFAULT_DATE_LOCALE);
  } catch {
    return "-";
  }
}

// (تم استبدال دوال التحويل بدوال DateInput المشتركة)









