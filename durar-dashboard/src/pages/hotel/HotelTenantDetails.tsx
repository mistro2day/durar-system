import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link, useLocation } from "react-router-dom";
import { Eye, PlusCircle } from "lucide-react";
import api from "../../lib/api";
import Currency from "../../components/Currency";
import DateInput from "../../components/DateInput";
import { RenewContractModal } from "../../components/RenewContractModal";
import {
  TenantDetail,
  EMPTY_STATS,
  formatValue,
  formatBirth,
  mapGender,
  buildAddress,
  buildEmergency,
  formatDate,
  formatRange,
  mapRentalType,
  NATIONALITIES,
  CommunicationLog as CommunicationLogType,
  TenantInvoice as TenantInvoiceModel,
  TenantPayment,
} from "./tenantShared";
import { getUser } from "../../lib/auth";
import { getRole } from "../../lib/auth";
import { getSettings, hasPermission } from "../../lib/settings";
import SortHeader from "../../components/SortHeader";
import { useTableSort } from "../../hooks/useTableSort";

type TenantContract = NonNullable<TenantDetail["contracts"]>[number];
type TenantInvoice = TenantInvoiceModel;

export default function HotelTenantDetails() {
  const { id, tenantId } = useParams();
  const navigate = useNavigate();
  const authName = getUser()?.name;
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [addInvoiceOpen, setAddInvoiceOpen] = useState(false);
  const [addingInvoice, setAddingInvoice] = useState(false);
  const [renewingContract, setRenewingContract] = useState<TenantContract | null>(null);

  const role = getRole();
  const site = getSettings();
  const canEdit = hasPermission(role, "tenants.edit", site);
  const canDelete = hasPermission(role, "tenants.delete", site);

  async function loadTenant() {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    const propertyQuery = id ? `?propertyId=${id}` : "";
    try {
      const res = await api.get<TenantDetail>(`/api/tenants/${tenantId}${propertyQuery}`);
      setTenant(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || "تعذر تحميل بيانات المستأجر");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTenant();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, tenantId]);

  const stats = useMemo(() => tenant?.stats ?? EMPTY_STATS, [tenant]);

  const contractList: TenantContract[] = tenant?.contracts ?? [];
  const invoiceList: TenantInvoice[] = tenant?.invoices ?? [];

  type ContractSortKey =
    | "unit"
    | "property"
    | "endDate"
    | "rentalType"
    | "rentAmount"
    | "ejar"
    | "payment"
    | "status";

  const contractSortAccessors = useMemo<Record<ContractSortKey, (contract: TenantContract) => unknown>>(
    () => ({
      unit: (contract) => contract.unitNumber || "",
      property: (contract) => contract.propertyName || "",
      endDate: (contract) => contract.endDate || "",
      rentalType: (contract) => contract.rentalType || "",
      rentAmount: (contract) => contract.rentAmount ?? Number.NEGATIVE_INFINITY,
      ejar: (contract) => contract.ejarContractNumber || "",
      payment: (contract) => contract.paymentMethod || "",
      status: (contract) => contract.status || "",
    }),
    []
  );

  const {
    sortedItems: sortedContracts,
    sortState: contractSort,
    toggleSort: toggleContractSort,
  } = useTableSort<TenantContract, ContractSortKey>(contractList, contractSortAccessors, { key: "endDate", direction: "desc" });

  type InvoiceSortKey = "id" | "amount" | "dueDate" | "status";

  const invoiceSortAccessors = useMemo<Record<InvoiceSortKey, (invoice: TenantInvoice) => unknown>>(
    () => ({
      id: (invoice) => invoice.id,
      amount: (invoice) => invoice.amount,
      dueDate: (invoice) => invoice.dueDate || "",
      status: (invoice) => invoice.status || "",
    }),
    []
  );

  const {
    sortedItems: sortedInvoices,
    sortState: invoiceSort,
    toggleSort: toggleInvoiceSort,
  } = useTableSort<TenantInvoice, InvoiceSortKey>(invoiceList, invoiceSortAccessors, { key: "dueDate", direction: "desc" });

  async function handleSave(form: TenantFormState) {
    if (!tenantId) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      const fields: Array<keyof TenantFormState> = [
        "name",
        "phone",
        "email",
        "nationalId",
        "birthDate",
        "gender",
        "nationality",
        "address",
        "city",
        "country",
        "employer",
        "emergencyContactName",
        "emergencyContactPhone",
        "notes",
      ];
      for (const key of fields) {
        const value = form[key];
        if (value !== undefined) {
          if (typeof value === "string") {
            payload[key] = value.trim().length ? value : null;
          } else {
            payload[key] = value;
          }
        }
      }
      if (!payload.name) payload.name = tenant?.name;
      if (!payload.phone) payload.phone = tenant?.phone;
      await api.patch(`/api/tenants/${tenantId}`, payload);
      setEditOpen(false);
      await loadTenant();
      alert("تم حفظ بيانات المستأجر بنجاح");
    } catch (e: any) {
      alert(e?.response?.data?.message || "تعذر حفظ بيانات المستأجر");
    } finally {
      setSaving(false);
    }
  }

  const [logForm, setLogForm] = useState({ type: "ملاحظة", content: "" });
  const [addingLog, setAddingLog] = useState(false);

  async function handleAddLog() {
    if (!tenantId || !logForm.content.trim()) return;
    setAddingLog(true);
    try {
      await api.post(`/api/tenants/${tenantId}/logs`, {
        ...logForm,
        performedBy: authName,
      });
      setLogForm({ type: "ملاحظة", content: "" });
      await loadTenant();
    } catch (e: any) {
      alert(e?.response?.data?.message || "تعذر إضافة السجل");
    } finally {
      setAddingLog(false);
    }
  }

  async function handleAddInvoice(data: { amount: number; dueDate: string; status: string; contractId?: number }) {
    if (!tenantId) return;
    setAddingInvoice(true);
    try {
      await api.post("/api/invoices", {
        tenantId,
        amount: data.amount,
        dueDate: data.dueDate,
        status: data.status,
        contractId: data.contractId
      });
      setAddInvoiceOpen(false);
      await loadTenant();
      alert("تم إضافة الفاتورة بنجاح");
    } catch (e: any) {
      alert(e?.response?.data?.message || "تعذر إضافة الفاتورة");
    } finally {
      setAddingInvoice(false);
    }
  }

  async function handleDelete() {
    if (!tenantId) return;
    if (!confirm("سيتم حذف المستأجر وجميع العقود والفواتير المرتبطة به. هل أنت متأكد؟")) return;
    setDeleteBusy(true);
    try {
      await api.delete(`/api/tenants/${tenantId}`);
      alert("تم حذف المستأجر بنجاح");
      navigate(`/hotel/${id}/tenants`, { replace: true });
    } catch (e: any) {
      alert(e?.response?.data?.message || "تعذر حذف المستأجر");
    } finally {
      setDeleteBusy(false);
    }
  }

  if (loading) {
    return <div className="card text-center text-gray-500 dark:text-slate-300">جاري التحميل...</div>;
  }

  if (error || !tenant) {
    return (
      <div className="card space-y-4 text-center">
        <div className="text-red-600">{error || "تعذر إيجاد المستأجر"}</div>
        <button className="btn-soft btn-soft-primary mx-auto" onClick={() => navigate(-1)}>
          الرجوع
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{tenant.name}</h2>
          <p className="text-sm text-gray-500 dark:text-slate-300">
            مستأجر مسجل منذ {formatDate(tenant.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canDelete ? (
            <button
              className="btn-soft btn-soft-danger"
              onClick={handleDelete}
              disabled={deleteBusy}
            >
              حذف
            </button>
          ) : null}
          {canEdit ? (
            <button className="btn-soft btn-soft-primary" onClick={() => setEditOpen(true)}>
              تعديل
            </button>
          ) : null}
          <button className="btn-soft btn-soft-info" onClick={() => navigate(-1)}>
            رجوع
          </button>
        </div>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="card space-y-4">
            <header className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">العقود</h3>
              <span className="text-sm text-gray-500 dark:text-slate-300">
                الإجمالي: {stats.totalContracts} — النشطة: {stats.activeContracts}
              </span>
            </header>

            {contractList.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-white/10">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:bg-white/5 dark:text-slate-300">
                    <tr>
                      <th className="py-2 text-right">
                        <SortHeader
                          label="الوحدة"
                          active={contractSort?.key === "unit"}
                          direction={contractSort?.key === "unit" ? contractSort.direction : null}
                          onToggle={() => toggleContractSort("unit")}
                        />
                      </th>
                      <th className="py-2 text-right">
                        <SortHeader
                          label="العقار"
                          active={contractSort?.key === "property"}
                          direction={contractSort?.key === "property" ? contractSort.direction : null}
                          onToggle={() => toggleContractSort("property")}
                        />
                      </th>
                      <th className="py-2 text-right">
                        <SortHeader
                          label="الفترة"
                          active={contractSort?.key === "endDate"}
                          direction={contractSort?.key === "endDate" ? contractSort.direction : null}
                          onToggle={() => toggleContractSort("endDate")}
                        />
                      </th>
                      <th className="py-2 text-right">
                        <SortHeader
                          label="نوع الإيجار"
                          active={contractSort?.key === "rentalType"}
                          direction={contractSort?.key === "rentalType" ? contractSort.direction : null}
                          onToggle={() => toggleContractSort("rentalType")}
                        />
                      </th>
                      <th className="py-2 text-right">
                        <SortHeader
                          label="قيمة الإيجار"
                          active={contractSort?.key === "rentAmount"}
                          direction={contractSort?.key === "rentAmount" ? contractSort.direction : null}
                          onToggle={() => toggleContractSort("rentAmount")}
                        />
                      </th>
                      <th className="py-2 text-right">
                        <SortHeader
                          label="رقم إيجار"
                          active={contractSort?.key === "ejar"}
                          direction={contractSort?.key === "ejar" ? contractSort.direction : null}
                          onToggle={() => toggleContractSort("ejar")}
                        />
                      </th>
                      <th className="py-2 text-right">
                        <SortHeader
                          label="الدفع"
                          active={contractSort?.key === "payment"}
                          direction={contractSort?.key === "payment" ? contractSort.direction : null}
                          onToggle={() => toggleContractSort("payment")}
                        />
                      </th>
                      <th className="py-2 text-right">
                        <SortHeader
                          label="الحالة"
                          active={contractSort?.key === "status"}
                          direction={contractSort?.key === "status" ? contractSort.direction : null}
                          onToggle={() => toggleContractSort("status")}
                        />
                      </th>
                      <th className="py-2 text-right">قرار التجديد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                    {sortedContracts.map((contract) => (
                      <tr key={contract.id} className="odd:bg-white even:bg-gray-50 dark:odd:bg-white/5 dark:even:bg-white/10">
                        <td className="py-2 text-right font-medium text-gray-800 dark:text-white">
                          {formatValue(contract.unitNumber)}
                        </td>
                        <td className="py-2 text-right text-gray-600 dark:text-slate-300">
                          <div>{formatValue(contract.propertyName)}</div>
                          {contract.notes ? (
                            <div className="text-xs text-gray-500 dark:text-slate-400">{contract.notes}</div>
                          ) : null}
                        </td>
                        <td className="py-2 text-right text-gray-700 dark:text-slate-200">
                          {formatRange(contract.startDate, contract.endDate)}
                        </td>
                        <td className="py-2 text-right text-gray-700 dark:text-slate-200">
                          {mapRentalType(contract.rentalType)}
                        </td>
                        <td className="py-2 text-right text-gray-700 dark:text-slate-200">
                          {typeof contract.rentAmount === "number" ? <Currency amount={contract.rentAmount} /> : "-"}
                          {typeof contract.deposit === "number" && contract.deposit > 0 ? (
                            <div className="text-xs text-gray-500 dark:text-slate-400">تأمين: <Currency amount={contract.deposit} /></div>
                          ) : null}
                        </td>
                        <td className="py-2 text-right text-gray-700 dark:text-slate-200">
                          {formatValue(contract.ejarContractNumber)}
                        </td>
                        <td className="py-2 text-right text-gray-700 dark:text-slate-200">
                          <div>{formatValue(contract.paymentMethod)}</div>
                          {contract.paymentFrequency ? (
                            <div className="text-xs text-gray-500 dark:text-slate-400">{contract.paymentFrequency}</div>
                          ) : null}
                          {contract.servicesIncluded ? (
                            <div className="text-xs text-gray-500 dark:text-slate-400">خدمات: {contract.servicesIncluded}</div>
                          ) : null}
                        </td>
                        <td className="py-2 text-right">
                          <StatusBadge status={contract.status} />
                        </td>
                        <td className="py-2 text-right">
                          <RenewalBadge
                            status={contract.renewalStatus}
                            contractStatus={contract.status}
                            endDate={contract.endDate}
                            onClick={() => setRenewingContract(contract)}
                          />
                        </td>


                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState message="لا توجد عقود مرتبطة بهذا المستأجر." />
            )}
          </div>

          <div className="card space-y-4">
            <header className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">الفواتير</h3>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 dark:text-slate-300">
                  إجمالي الفواتير: {stats.totalInvoices} — المعلقة: {stats.pendingInvoices}
                </span>
                <button
                  className="btn-soft btn-soft-primary text-xs px-3 py-1"
                  onClick={() => setAddInvoiceOpen(true)}
                >
                  + إضافة فاتورة
                </button>
              </div>
            </header>
            {invoiceList.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-white/10">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:bg-white/5 dark:text-slate-300">
                    <tr>
                      <th className="py-2 text-right">
                        <SortHeader
                          label="الرقم"
                          active={invoiceSort?.key === "id"}
                          direction={invoiceSort?.key === "id" ? invoiceSort.direction : null}
                          onToggle={() => toggleInvoiceSort("id")}
                        />
                      </th>
                      <th className="py-2 text-right">
                        <SortHeader
                          label="المبلغ"
                          active={invoiceSort?.key === "amount"}
                          direction={invoiceSort?.key === "amount" ? invoiceSort.direction : null}
                          onToggle={() => toggleInvoiceSort("amount")}
                        />
                      </th>
                      <th className="py-2 text-right">
                        <SortHeader
                          label="الاستحقاق"
                          active={invoiceSort?.key === "dueDate"}
                          direction={invoiceSort?.key === "dueDate" ? invoiceSort.direction : null}
                          onToggle={() => toggleInvoiceSort("dueDate")}
                        />
                      </th>
                      <th className="py-2 text-right">الحالة</th>
                      <th className="py-2 text-right">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                    {sortedInvoices.map((invoice) => (
                      <tr key={invoice.id} className="odd:bg-white even:bg-gray-50 dark:odd:bg-white/5 dark:even:bg-white/10">
                        <td className="py-2 text-right font-medium">
                          <Link to={`/invoices/${invoice.id}`} className="text-indigo-600 hover:text-indigo-800 hover:underline">
                            #{invoice.id}
                          </Link>
                        </td>
                        <td className="py-2 text-right text-gray-700 dark:text-slate-200">
                          {invoice.status === 'PARTIAL' || invoice.status === 'partial' ? (
                            <div className="flex flex-col items-start leading-tight">
                              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                <Currency amount={invoice.amount - (invoice.payments || []).reduce((sum, p) => sum + p.amount, 0)} />
                              </span>
                              <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-slate-500">
                                <span>المتبقي من</span>
                                <Currency amount={invoice.amount} />
                              </div>
                            </div>
                          ) : (
                            <Currency amount={invoice.amount} />
                          )}
                        </td>
                        <td className="py-2 text-right text-gray-600 dark:text-slate-300">
                          {formatDate(invoice.dueDate)}
                        </td>
                        <td className="py-2 text-right">
                          <InvoiceBadge status={invoice.status} dueDate={invoice.dueDate} />
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex items-center gap-2">
                            <Link to={`/invoices/${invoice.id}`} state={{ invoice }} className="btn-soft btn-soft-primary" title="عرض التفاصيل">
                              <Eye className="w-4 h-4" />
                            </Link>
                            {invoice.status !== 'PAID' && (
                              <RecordPaymentModal invoice={invoice} onRecorded={loadTenant} />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState message="لا توجد فواتير مرتبطة بهذا المستأجر." />
            )}
          </div>

          {tenant.notes ? (
            <div className="card space-y-2">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">ملاحظات</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-slate-200">
                {tenant.notes}
              </p>
            </div>
          ) : null}

          <div className="card space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">سجل التواصل والملاحظات</h3>

            <div className="flex flex-col gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10">
              <div className="flex gap-2">
                <select
                  className="form-select w-32"
                  value={logForm.type}
                  onChange={(e) => setLogForm({ ...logForm, type: e.target.value })}
                >
                  <option value="ملاحظة">ملاحظة</option>
                  <option value="اتصال">اتصال</option>
                  <option value="زيارة">زيارة</option>
                  <option value="أخرى">أخرى</option>
                </select>
                <input
                  className="form-input flex-1"
                  placeholder="اكتب الملاحظة هنا..."
                  value={logForm.content}
                  onChange={(e) => setLogForm({ ...logForm, content: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddLog()}
                />
                <button
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  disabled={addingLog || !logForm.content.trim()}
                  onClick={handleAddLog}
                >
                  إضافة
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {tenant.communicationLogs.length ? (
                tenant.communicationLogs.map((log) => (
                  <div key={log.id} className="flex gap-3 p-3 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-lg text-sm">
                    <div className="w-16 shrink-0 text-indigo-600 dark:text-indigo-400 font-semibold">{log.type}</div>
                    <div className="flex-1">
                      <p className="text-gray-800 dark:text-slate-200">{log.content}</p>
                      <div className="mt-1 flex gap-3 text-xs text-gray-400">
                        <span>{formatDate(log.date)}</span>
                        {log.performedBy && <span>بواسطة: {log.performedBy}</span>}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState message="لا يوجد سجل تواصل حتى الآن." />
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">البيانات الأساسية</h3>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-slate-200">
                  <span>الهوية: {formatValue(tenant.nationalId)}</span>
                  <span>الجنسية: {formatValue(tenant.nationality)}</span>
                  <span>الجنس: {mapGender(tenant.gender)}</span>
                  <span>تاريخ الميلاد: {formatBirth(tenant.birthDate)}</span>
                </div>
              </div>
            </div>

            {tenant.phone && (
              <a
                href={`tel:${tenant.phone}`}
                className="block text-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-lg font-semibold text-emerald-600 hover:bg-emerald-500/20 transition-colors"
              >
                {tenant.phone}
              </a>
            )}

            <div className="grid grid-cols-1 gap-4 text-sm">
              <InfoField label="البريد الإلكتروني" value={formatValue(tenant.email)} />
              <InfoField label="جهة العمل" value={formatValue(tenant.employer)} />
              <InfoField label="العنوان الكامل" value={buildAddress(tenant) || "—"} />
              <InfoField label="جهة الطوارئ" value={buildEmergency(tenant) || "—"} />
            </div>
          </div>

          <div className="card space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-100">نظرة عامة</h4>
            <SummaryStat label="عقود نشطة" value={stats.activeContracts} tone={stats.activeContracts ? "success" : "default"} />
            <SummaryStat label="إجمالي العقود" value={stats.totalContracts} />
            <SummaryStat
              label="الرصيد المستحق"
              value={<Currency amount={stats.receivables} />}
              tone={stats.receivables > 0 ? "warning" : "default"}
            />
            <SummaryStat label="آخر استحقاق" value={formatDate(stats.lastInvoiceDueDate)} />
            {stats.latestContract && stats.latestContract.status === 'ACTIVE' && (
              (() => {
                const end = new Date(stats.latestContract.endDate);
                const now = new Date();
                const diff = end.getTime() - now.getTime();
                const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));

                let label = `${daysLeft} يوم`;
                let tone: "default" | "success" | "warning" | "danger" = "default";

                if (daysLeft <= 0) {
                  label = "منتهي";
                  tone = "danger";
                } else if (daysLeft <= 30) {
                  tone = "danger";
                } else if (daysLeft <= 60) {
                  tone = "warning";
                } else {
                  tone = "success";
                }

                return <SummaryStat label="المدة المتبقية للعقد" value={label} tone={tone} />;
              })()
            )}
          </div>
        </aside>
      </section>

      {editOpen && (
        <EditTenantModal
          tenant={tenant}
          saving={saving}
          onClose={() => setEditOpen(false)}
          onSave={handleSave}
        />
      )}

      {addInvoiceOpen && (
        <AddInvoiceModal
          contracts={contractList}
          onClose={() => setAddInvoiceOpen(false)}
          onSave={handleAddInvoice}
          saving={addingInvoice}
        />
      )}

      {renewingContract && (
        <RenewContractModal
          contract={{
            id: renewingContract.id,
            endDate: renewingContract.endDate,
            rentAmount: renewingContract.rentAmount,
            paymentFrequency: renewingContract.paymentFrequency,
          }}
          onClose={() => setRenewingContract(null)}
          onSuccess={() => {
            setRenewingContract(null);
            loadTenant();
          }}
        />
      )}
    </div>

  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200/60 bg-white/70 px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="text-xs text-gray-500 dark:text-slate-300">{label}</div>
      <div className="mt-1 text-sm font-medium text-gray-800 dark:text-white">{value}</div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "text-success bg-success/15 px-2 py-0.5 rounded-lg w-fit inline-block"
      : tone === "warning"
        ? "text-warning bg-warning/15 px-2 py-0.5 rounded-lg w-fit inline-block"
        : tone === "danger"
          ? "text-danger bg-danger/15 px-2 py-0.5 rounded-lg w-fit inline-block"
          : "text-gray-700 dark:text-slate-200";

  return (
    <div className={`rounded-xl border border-gray-200/60 px-4 py-3 dark:border-white/10`}>
      <div className="text-xs text-gray-500 dark:text-slate-300">{label}</div>
      <div className={`mt-1 text-base font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  const map: Record<string, { label: string; className: string }> = {
    ACTIVE: {
      label: "نشط",
      className: "badge-success shadow-sm",
    },
    ENDED: {
      label: "منتهي",
      className: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200",
    },
    CANCELLED: {
      label: "ملغى",
      className: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
    },
  };
  const info = status ? map[status] : undefined;
  if (!info) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 dark:bg-white/10 dark:text-slate-300">
        غير معروف
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${info.className}`}>
      {info.label}
    </span>
  );
}

function RenewalBadge({ status, contractStatus, endDate, onClick }: { status?: string | null; contractStatus?: string; endDate?: string | null; onClick?: () => void }) {
  // Check for 60-day grace period for ENDED contracts first (takes priority over renewalStatus)
  if (contractStatus === "ENDED" && endDate && status !== "RENEWED") {
    try {
      const end = new Date(endDate);
      const now = new Date();
      const endD = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      const nowD = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const diff = nowD.getTime() - endD.getTime();
      const daysSinceEnd = Math.ceil(diff / (1000 * 60 * 60 * 24));

      // Allow renewal within 60 days after contract end
      if (daysSinceEnd >= 0 && daysSinceEnd <= 60) {
        return (
          <span
            onClick={onClick}
            className="px-2 py-0.5 rounded text-[10px] bg-blue-600 text-white font-bold whitespace-nowrap cursor-pointer hover:bg-blue-700 transition-colors"
          >
            متاح للتجديد
          </span>
        );
      }
    } catch (e) {
      console.error("Date error:", e);
    }
  }

  if (status === "RENEWED") {
    return <span className="badge-success whitespace-nowrap">تم التجديد</span>;
  }

  if (contractStatus === "ENDED" || contractStatus === "CANCELLED") {
    return <span className="bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200 px-2 py-0.5 rounded text-[10px] whitespace-nowrap">منتهي</span>;
  }


  const map: Record<string, { label: string; className: string }> = {
    PENDING: { label: "قيد الانتظار", className: "badge-warning" },
    NOT_RENEWING: { label: "لن يتم التجديد", className: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200" },
  };
  const info = status ? map[status] : map["PENDING"];
  return (
    <span className={`${info?.className || "badge-warning"} whitespace-nowrap`}>
      {info?.label || "قيد الانتظار"}
    </span>
  );
}



function InvoiceBadge({ status, dueDate }: { status?: string | null; dueDate?: string | null }) {
  // Calculate if invoice is overdue
  const isOverdue = () => {
    if (status !== "PENDING" || !dueDate) return false;
    const due = new Date(dueDate);
    const now = new Date();
    // Compare dates without time
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return dueDay < today;
  };

  const map: Record<string, { label: string; className: string }> = {
    PENDING: { label: "معلق", className: "badge-warning shadow-sm" },
    PAID: { label: "مدفوع", className: "badge-success shadow-sm" },
    PARTIAL: { label: "سداد جزئي", className: "badge-partial shadow-sm" },
    CANCELLED: { label: "ملغى", className: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200" },
    OVERDUE: { label: "متأخرة", className: "badge-overdue shadow-sm" },
  };

  // Check if overdue first
  if (isOverdue()) {
    return (
      <span className="badge-overdue shadow-sm">
        متأخرة
      </span>
    );
  }

  const info = status ? map[status] : undefined;
  if (!info) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 dark:bg-white/10 dark:text-slate-300">
        غير معروف
      </span>
    );
  }
  return (
    <span className={`${info.className}`}>
      {info.label}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200/70 px-4 py-3 text-center text-sm text-gray-500 dark:border-white/10 dark:text-slate-300">
      {message}
    </div>
  );
}

type TenantFormState = {
  name: string;
  phone: string;
  email: string;
  nationalId: string;
  birthDate: string;
  gender: string;
  nationality: string;
  address: string;
  city: string;
  country: string;
  employer: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  notes: string;
};

function EditTenantModal({
  tenant,
  saving,
  onClose,
  onSave,
}: {
  tenant: TenantDetail;
  saving: boolean;
  onClose: () => void;
  onSave: (form: TenantFormState) => void;
}) {
  const [form, setForm] = useState<TenantFormState>(() => toFormState(tenant));

  useEffect(() => {
    setForm(toFormState(tenant));
  }, [tenant]);

  function update(field: keyof TenantFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="modal-backdrop">
      <div className="card w-full max-w-3xl space-y-5">
        <header className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">تعديل المستأجر</h3>
          <button className="btn-soft btn-soft-info" onClick={onClose}>
            إغلاق
          </button>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <Field label="الاسم">
            <input className="form-input" value={form.name} onChange={(e) => update("name", e.target.value)} />
          </Field>
          <Field label="رقم الجوال">
            <input className="form-input" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
          </Field>
          <Field label="البريد الإلكتروني">
            <input className="form-input" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </Field>
          <Field label="الهوية الوطنية">
            <input className="form-input" value={form.nationalId} onChange={(e) => update("nationalId", e.target.value)} />
          </Field>
          <Field label="تاريخ الميلاد">
            <input
              className="form-input"
              type="date"
              value={form.birthDate}
              onChange={(e) => update("birthDate", e.target.value)}
            />
          </Field>
          <Field label="الجنس">
            <select className="form-select" value={form.gender} onChange={(e) => update("gender", e.target.value)}>
              <option value="">—</option>
              <option value="MALE">ذكر</option>
              <option value="FEMALE">أنثى</option>
            </select>
          </Field>
          <Field label="الجنسية">
            <input
              className="form-input"
              list="nationalities-list"
              value={form.nationality}
              onChange={(e) => update("nationality", e.target.value)}
            />
            <datalist id="nationalities-list">
              {NATIONALITIES.map((nat) => (
                <option value={nat} key={nat} />
              ))}
            </datalist>
          </Field>
          <Field label="العنوان">
            <input className="form-input" value={form.address} onChange={(e) => update("address", e.target.value)} />
          </Field>
          <Field label="المدينة">
            <input className="form-input" value={form.city} onChange={(e) => update("city", e.target.value)} />
          </Field>
          <Field label="الدولة">
            <input className="form-input" value={form.country} onChange={(e) => update("country", e.target.value)} />
          </Field>
          <Field label="جهة العمل">
            <input className="form-input" value={form.employer} onChange={(e) => update("employer", e.target.value)} />
          </Field>
          <Field label="اسم جهة الطوارئ">
            <input
              className="form-input"
              value={form.emergencyContactName}
              onChange={(e) => update("emergencyContactName", e.target.value)}
            />
          </Field>
          <Field label="هاتف الطوارئ">
            <input
              className="form-input"
              value={form.emergencyContactPhone}
              onChange={(e) => update("emergencyContactPhone", e.target.value)}
            />
          </Field>
          <Field label="ملاحظات" className="md:col-span-2">
            <textarea
              className="form-input h-28"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </Field>
        </div>
        <div className="flex items-center justify-end gap-3">
          <button className="btn-outline" onClick={onClose} disabled={saving}>
            إلغاء
          </button>
          <button className="btn-primary" onClick={() => onSave(form)} disabled={saving}>
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${className || ""}`}>
      <span className="text-gray-600 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}

function toFormState(tenant: TenantDetail): TenantFormState {
  return {
    name: tenant.name || "",
    phone: tenant.phone || "",
    email: tenant.email || "",
    nationalId: tenant.nationalId || "",
    birthDate: tenant.birthDate ? tenant.birthDate.slice(0, 10) : "",
    gender: tenant.gender || "",
    nationality: tenant.nationality || "",
    address: tenant.address || "",
    city: tenant.city || "",
    country: tenant.country || "",
    employer: tenant.employer || "",
    emergencyContactName: tenant.emergencyContactName || "",
    emergencyContactPhone: tenant.emergencyContactPhone || "",
    notes: tenant.notes || "",
  };
}



function AddInvoiceModal({
  contracts,
  onClose,
  onSave,
  saving,
}: {
  contracts: TenantContract[];
  onClose: () => void;
  onSave: (data: { amount: number; dueDate: string; status: string; contractId?: number }) => void;
  saving: boolean;
}) {
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [contractId, setContractId] = useState("");

  const handleSubmit = () => {
    if (!amount || !dueDate) return;
    onSave({
      amount: Number(amount),
      dueDate,
      status,
      contractId: contractId ? Number(contractId) : undefined
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="card w-full max-w-sm space-y-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white">إضافة فاتورة جديدة</h3>
        <div className="space-y-3">
          <Field label="العقد (اختياري)">
            <select
              className="form-select"
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
            >
              <option value="">-- بدون عقد --</option>
              {contracts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.unitNumber ? `وحدة ${c.unitNumber}` : `عقد #${c.id}`} ({formatDate(c.startDate)} - {formatDate(c.endDate)})
                </option>
              ))}
            </select>
          </Field>
          <Field label="المبلغ (ريال)">
            <input
              type="number"
              className="form-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </Field>
          <Field label="تاريخ الاستحقاق">
            <input
              type="date"
              className="form-input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Field>
          <Field label="الحالة">
            <select
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="PENDING">معلق</option>
              <option value="PAID">مدفوع</option>
            </select>
          </Field>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <button className="btn-raw text-sm text-gray-500 hover:text-gray-700" onClick={onClose} disabled={saving}>
            إلغاء
          </button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={saving || !amount || !dueDate}
          >
            {saving ? "جاري الحفظ..." : "حفظ"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RecordPaymentModal({ invoice, onRecorded }: { invoice: TenantInvoice, onRecorded: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    amount: (Number(invoice.amount) - (invoice.payments || []).reduce((s: number, p: any) => s + p.amount, 0)).toFixed(2),
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
        className="btn-soft btn-soft-success p-1"
        onClick={() => setOpen(true)}
        title="تسجيل دفعة"
      >
        <PlusCircle className="w-4 h-4" />
      </button>

      {open && (
        <div className="modal-backdrop">
          <div className="card w-full max-w-md bg-white dark:bg-slate-900 border dark:border-white/10">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">تسجيل دفعة للفاتورة #{invoice.id}</h3>

            <div className="space-y-4 text-right">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-gray-600 dark:text-slate-300 font-medium">المبلغ</span>
                <input
                  type="number"
                  className="form-input text-right"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="text-gray-600 dark:text-slate-300 font-medium">تاريخ الدفع</span>
                <DateInput value={form.paidAt} onChange={(v) => setForm({ ...form, paidAt: v })} />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="text-gray-600 dark:text-slate-300 font-medium">طريقة الدفع</span>
                <select
                  className="form-select text-right"
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
