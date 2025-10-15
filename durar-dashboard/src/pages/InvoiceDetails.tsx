import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Printer, ArrowRight, Download } from "lucide-react";
import api from "../lib/api";
import Logo from "../components/Logo";
import QRCode from "qrcode";
import { getSettings } from "../lib/settings";
import { useLocaleTag } from "../lib/settings-react";

type Invoice = {
  id: number;
  amount: number;
  status: string;
  dueDate: string;
  contract?: { id: number; tenantName?: string } | null;
  contractId?: number;
};

export default function InvoiceDetails() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const passed = (location.state as any)?.invoice as Invoice | undefined;

  const [invoice, setInvoice] = useState<Invoice | null>(passed || null);
  const [loading, setLoading] = useState<boolean>(!passed);
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState<string>("");
  const [unitInfo, setUnitInfo] = useState<{ unitNumber?: string; propertyName?: string }>({});

  useEffect(() => {
    if (passed) return;
    (async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        // لا يوجد endpoint مفرد؛ نجلب القائمة ونبحث
        const res = await api.get<Invoice[]>("/api/invoices");
        const found = res.data.find((x) => String(x.id) === String(id));
        if (found) setInvoice(found);
        else setError("الفاتورة غير موجودة");
      } catch (e: any) {
        setError(e?.response?.data?.message || "تعذر جلب الفاتورة");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, passed]);

  const localeTag = useLocaleTag();
  const totalText = useMemo(() => {
    if (!invoice) return "";
    return new Intl.NumberFormat(localeTag, { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(
      Number(invoice.amount || 0)
    );
  }, [invoice, localeTag]);

  const site = getSettings();
  const COMPANY_NAME = site.companyName;
  const COMPANY_CR = site.companyCR;
  const COMPANY_PHONE = site.companyPhone;
  const COMPANY_EMAIL = site.companyEmail;
  const COMPANY_ADDRESS = site.companyAddress;
  const vatPercent = Number(site.vatPercent || 0);
  const vatAmount = useMemo(() => {
    if (!invoice) return 0;
    return Math.round((Number(invoice.amount || 0) * vatPercent) as number);
  }, [invoice, vatPercent]);
  const grandTotal = useMemo(() => {
    if (!invoice) return 0;
    return Number(invoice.amount || 0) + (vatPercent ? vatAmount : 0);
  }, [invoice, vatAmount, vatPercent]);

  useEffect(() => {
    if (!invoice) return;
    const payload = {
      type: "invoice",
      id: invoice.id,
      tenant: invoice.contract?.tenantName || "-",
      amount: invoice.amount,
      dueDate: invoice.dueDate,
      url: typeof window !== "undefined" ? window.location.href : "",
    };
    QRCode.toDataURL(JSON.stringify(payload), { margin: 1, width: 180 })
      .then(setQr)
      .catch(() => setQr(""));
  }, [invoice]);

  // جلب معلومات الوحدة/العقار لعرضها في وصف البند
  useEffect(() => {
    (async () => {
      try {
        if (!invoice) return;
        const contractId = invoice.contract?.id || (invoice as any)?.contractId;
        if (!contractId) return;
        const res = await api.get<any[]>(`/api/contracts`);
        const c = (res.data || []).find((x: any) => Number(x.id) === Number(contractId));
        if (!c) return;
        const unitNumber = c.unit?.unitNumber || c.unit?.number;
        let propertyName: string | undefined = undefined;
        if (c.unit?.propertyId) {
          try {
            const props = await api.get<any[]>(`/api/properties`);
            const p = (props.data || []).find((pp: any) => Number(pp.id) === Number(c.unit.propertyId));
            if (p) propertyName = p.name;
          } catch {}
        }
        setUnitInfo({ unitNumber, propertyName });
      } catch {}
    })();
  }, [invoice]);

  function print() {
    window.print();
  }

  function downloadPdf() {
    // استخدام نافذة الطباعة لتنزيل PDF (الخيار الافتراضي في المتصفح)
    window.print();
  }

  if (loading) return <div className="bg-white rounded-xl shadow p-6 text-center text-gray-500">جاري التحميل...</div>;
  if (error) return <div className="bg-white rounded-xl shadow p-6 text-center text-red-600">{error}</div>;
  if (!invoice) return null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded border hover:bg-gray-50"
        >
          <ArrowRight className="w-4 h-4" />
          رجوع
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadPdf}
            className="inline-flex items-center gap-2 px-3 py-2 rounded border border-blue-600 text-blue-600 hover:bg-blue-50"
            title="تحميل كملف PDF"
          >
            <Download className="w-4 h-4" />
            تحميل PDF
          </button>
          <button
            onClick={print}
            className="inline-flex items-center gap-2 px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            <Printer className="w-4 h-4" />
            طباعة الفاتورة
          </button>
        </div>
      </div>

      {/* نسخة قابلة للطباعة */}
      <div className="bg-white rounded-xl shadow p-6 print:shadow-none print:rounded-none invoice-a4 mx-auto" style={{ maxWidth: 794 }}>
        <style>{`
          /* تنسيق عام للفاتورة ليبدو منسقًا عند الطباعة والعرض */
          .invoice-a4 { font-family: 'Tajawal', 'Poppins', ui-sans-serif, system-ui, -apple-system, Segoe UI, Arial, sans-serif; color: #1f2937; background: #ffffff; }
          .invoice-a4 h1,.invoice-a4 h2,.invoice-a4 h3 { color:#111827; }
          .invoice-a4 .muted { color:#6b7280; }
          .invoice-a4 .hr { height:1px; background:#e5e7eb; margin:12px 0; }
          .invoice-a4 table { width:100%; border-collapse:collapse; }
          .invoice-a4 thead th { background:#f9fafb; color:#374151; font-weight:600; }
          .invoice-a4 th,.invoice-a4 td { border-bottom:1px solid #e5e7eb; padding:12px; }
          .invoice-a4 tfoot td { font-weight:700; }
          .invoice-a4 .badge { display:inline-block; padding:2px 8px; border-radius:6px; font-size:12px; font-weight:600; }
          .invoice-a4 .badge-paid { background:#e6f7eb; color:#0a7f2e; border:1px solid #bde7c7; }
          .invoice-a4 .inv-head { display:grid; gap:16px; grid-template-columns: 1fr; }
          @media (min-width: 768px) { .invoice-a4 .inv-head { grid-template-columns: repeat(3,1fr); } }

          @media print {
            @page { size: A4; margin: 0 !important; }
            /* إخفاء أي عناصر خارج الفاتورة أثناء الطباعة */
            body * { visibility: hidden; }
            html, body { background:#ffffff !important; margin:0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .invoice-a4, .invoice-a4 * { visibility: visible; }
            /* اجعل الفاتورة تملأ مساحة صفحة A4 بالكامل بدون إطار */
            /* اجعل الفاتورة تملأ عرض الصفحة بالكامل مع احتساب أي حشوات داخليًا لتفادي القص */
            /* اجعل الفاتورة تملأ عرض الصفحة بالكامل مع حشوة متناسقة من الجانبين */
            /* املأ المساحة القابلة للطباعة بالكامل لتجنب الفراغات في الأعلى واليمين */
            .invoice-a4 { position: fixed !important; inset: 0 !important; box-sizing: border-box !important; width: auto !important; height: auto !important; margin: 0 !important; padding: 5mm !important; box-shadow: none !important; border-radius: 0 !important; background:#ffffff !important; direction: rtl !important; }
            .print:hidden { display: none !important; }
            header, section, footer { break-inside: avoid; }
            /* تأكيد خلفية بيضاء ونص أسود أثناء الطباعة */
            :root, [data-theme='dark'] { --bg:#ffffff !important; --surface:#ffffff !important; --surface-2:#f5f5f5 !important; --text:#000000 !important; --border:#dddddd !important; }
            body { background:#ffffff !important; color:#000000 !important; }
            .invoice-a4 { background:#ffffff !important; color:#000000 !important; }
            .invoice-a4 h1,.invoice-a4 h2,.invoice-a4 h3,.invoice-a4 p,.invoice-a4 td,.invoice-a4 th,.invoice-a4 span,.invoice-a4 li { color:#000000 !important; }
            .invoice-a4 thead th { background:#efefef !important; }
            /* إعادة توزيع رأس تفاصيل المستفيد والمرسل والـ QR لتتطابق مع المعاينة */
            .invoice-a4 .inv-head { grid-template-columns: 1fr 1fr 1fr !important; grid-template-areas: 'inv-qr inv-from inv-to'; align-items: start; }
            .invoice-a4 .inv-to { grid-area: inv-to; text-align: right; }
            .invoice-a4 .inv-from { grid-area: inv-from; text-align: center; }
            .invoice-a4 .inv-qr { grid-area: inv-qr; }
          }
        `}</style>
        <header className="flex items-start justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <Logo className="h-12" />
            <div>
              <h2 className="text-xl font-bold text-gray-800">{COMPANY_NAME}</h2>
              <p className="text-xs text-gray-500">رقم السجل: {COMPANY_CR}</p>
              <p className="text-xs text-gray-500">الهاتف: {COMPANY_PHONE} — البريد: {COMPANY_EMAIL}</p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-gray-800">فاتورة</h1>
            <p className="text-sm text-gray-500 mt-1">رقم الفاتورة: {invoice.id}</p>
            <p className="text-sm text-gray-500">تاريخ الاستحقاق: {formatDate(invoice.dueDate, localeTag)}</p>
          </div>
        </header>

        <section className="mt-6 inv-head grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1 inv-to">
            <p className="text-sm text-gray-500">إلى</p>
            <p className="text-base font-semibold text-gray-800">{invoice.contract?.tenantName || "-"}</p>
            <p className="text-xs text-gray-500">العنوان: —</p>
            <p className="text-xs text-gray-500">الهاتف: —</p>
          </div>
          <div className="space-y-1 inv-from">
            <p className="text-sm text-gray-500">من</p>
            <p className="text-base font-semibold text-gray-800">{COMPANY_NAME}</p>
            <p className="text-xs text-gray-500">{COMPANY_ADDRESS}</p>
            <p className="text-xs text-gray-500">الهاتف: {COMPANY_PHONE}</p>
          </div>
          <div className="space-y-1 md:text-right inv-qr">
            {qr ? (
              <img src={qr} alt="barcode" className="w-32 h-32 md:ml-auto" />
            ) : (
              <div className="w-32 h-32 border rounded grid place-items-center text-xs text-gray-400 md:ml-auto">BARCODE</div>
            )}
          </div>
        </section>

        <section className="mt-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-right p-3">الوصف</th>
                <th className="text-right p-3">المبلغ (ر.س)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="p-3 text-gray-800">
                  {`قيمة الإيجار${unitInfo.unitNumber || unitInfo.propertyName ? ` للوحدة رقم ${unitInfo.unitNumber || '-'}` : ''}${unitInfo.propertyName ? ` - ${unitInfo.propertyName}` : ''}`}
                </td>
                <td className="p-3">{totalText}</td>
              </tr>
            </tbody>
            <tfoot>
              {vatPercent ? (
                <>
                  <tr>
                    <td className="p-3 text-right font-semibold">المجموع قبل الضريبة</td>
                    <td className="p-3">{new Intl.NumberFormat(localeTag, { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(Number(invoice.amount || 0))}</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-right font-semibold">ضريبة القيمة المضافة ({vatPercent}%)</td>
                    <td className="p-3">{new Intl.NumberFormat(localeTag, { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(vatAmount)}</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-right font-semibold">الإجمالي</td>
                    <td className="p-3 font-bold text-gray-800">{new Intl.NumberFormat(localeTag, { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(grandTotal)}</td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td className="p-3 text-right font-semibold">الإجمالي</td>
                  <td className="p-3 font-bold text-gray-800">{totalText}</td>
                </tr>
              )}
              <tr>
                <td className="p-3 text-right font-semibold">الحالة</td>
                <td className="p-3">
                  {invoice.status === 'PAID' ? (
                    <span className="badge badge-paid">مدفوعة</span>
                  ) : (
                    <span className={`px-2 py-1 rounded text-xs ${statusClass(invoice.status)}`}>{mapStatus(invoice.status)}</span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        <section className="mt-8">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">الشروط والأحكام</h3>
          <ul className="list-disc pr-6 text-xs text-gray-600 space-y-1">
            <li>الدفع خلال 7 أيام من تاريخ الاستحقاق ما لم يُتفق على غير ذلك.</li>
            <li>تُحتسب غرامات تأخير على الفواتير المتأخرة بحسب السياسة المعتمدة.</li>
            <li>هذه الفاتورة صادرة إلكترونياً ولا تحتاج إلى توقيع أو ختم.</li>
          </ul>
        </section>

        <footer className="mt-8 text-center text-xs text-gray-500">
          العنوان: {COMPANY_ADDRESS} — الهاتف: {COMPANY_PHONE} — البريد: {COMPANY_EMAIL}
        </footer>
      </div>
    </div>
  );
}

function formatDate(d?: string, lt?: string) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString(lt || "ar-SA");
  } catch {
    return "-";
  }
}

function statusClass(v?: string) {
  switch (v) {
    case "PAID":
      return "bg-green-100 text-green-700";
    case "PENDING":
      return "bg-amber-100 text-amber-700";
    case "OVERDUE":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}
function mapStatus(v?: string) {
  switch (v) {
    case "PAID":
      return "مدفوعة";
    case "PENDING":
      return "معلّقة";
    case "OVERDUE":
      return "متأخرة";
    default:
      return v || "-";
  }
}
