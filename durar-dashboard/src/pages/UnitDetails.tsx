import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../lib/api";

type MaintenanceAction = {
  id: number;
  actionTaken: string;
  performedBy: string;
  performedAt: string;
};

type MaintenanceTicket = {
  id: number;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "NEW" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  actions?: MaintenanceAction[];
};

type Contract = {
  id: number;
  tenantName: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  status: "ACTIVE" | "ENDED" | "CANCELLED";
  rentalType?: string;
};

type Unit = {
  id: number;
  number?: string;
  unitNumber?: string;
  type?: string;
  status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | string;
  floor?: number;
  rooms?: number;
  baths?: number;
  area?: number;
  property?: { id: number; name: string } | null;
  contracts?: Contract[];
  maintenance?: MaintenanceTicket[];
};

export default function UnitDetails() {
  const { id } = useParams();
  const [unit, setUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/api/units/${id}`);
        setUnit(res.data);
      } catch (e: any) {
        setError(e?.response?.data?.message || "تعذر جلب بيانات الوحدة");
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  const contractsActive = useMemo(() => (unit?.contracts || []).filter(c => c.status === "ACTIVE"), [unit]);
  const contractsEnded = useMemo(() => (unit?.contracts || []).filter(c => c.status !== "ACTIVE"), [unit]);

  if (loading) return <div className="p-6 card text-center text-gray-500">جاري التحميل...</div>;
  if (error) return <div className="p-6 card text-center text-red-600">{error}</div>;
  if (!unit) return null;

  const label = unit.unitNumber || unit.number || `#${unit.id}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800">تفاصيل الوحدة: {label}</h2>
        <Link to="/units" className="btn-outline">الرجوع للوحدات</Link>
      </div>

      {/* تفاصيل الوحدة */}
      <div className="card grid grid-cols-1 md:grid-cols-3 gap-4">
        <Detail label="العقار" value={unit.property?.name || "-"} />
        <Detail label="الحالة" valueClass={statusClass(unit.status)} value={mapUnitStatus(unit.status)} />
        <Detail label="النوع" value={mapRental(unit.type)} />
        <Detail label="الدور" value={unit.floor ?? "-"} />
        <Detail label="الغرف" value={unit.rooms ?? "-"} />
        <Detail label="الحمامات" value={unit.baths ?? "-"} />
        <Detail label="المساحة (م²)" value={unit.area ?? "-"} />
      </div>

      {/* الصيانة */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">الصيانة على الوحدة</h3>
          <span className="text-sm text-gray-500">الإجمالي: {unit.maintenance?.length || 0}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <colgroup>
              <col style={{width:'10%'}} />
              <col />
              <col style={{width:'12%'}} />
              <col style={{width:'14%'}} />
              <col style={{width:'14%'}} />
              <col style={{width:'18%'}} />
            </colgroup>
            <thead>
              <tr>
                <th className="text-right p-3">الرقم</th>
                <th className="text-right p-3">الوصف</th>
                <th className="text-right p-3">الأولوية</th>
                <th className="text-right p-3">الحالة</th>
                <th className="text-right p-3">الإجراءات</th>
                <th className="text-right p-3">تاريخ البلاغ</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(unit.maintenance || []).length ? (
                (unit.maintenance || []).map(t => (
                  <tr key={t.id} className="odd:bg-white even:bg-gray-50">
                    <td className="p-3">{t.id}</td>
                    <td className="p-3">{t.description}</td>
                    <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${priorityClass(t.priority)}`}>{mapPriority(t.priority)}</span></td>
                    <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${ticketStatusClass(t.status)}`}>{mapTicketStatus(t.status)}</span></td>
                    <td className="p-3">{t.actions?.length || 0}</td>
                    <td className="p-3">{formatDate(t.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="p-4 text-center text-gray-500" colSpan={6}>لا توجد بلاغات صيانة</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* العقود الحالية */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">العقود الحالية</h3>
          <span className="text-sm text-gray-500">{contractsActive.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <colgroup>
              <col style={{width:'32%'}} />
              <col style={{width:'16%'}} />
              <col style={{width:'16%'}} />
              <col style={{width:'16%'}} />
              <col style={{width:'20%'}} />
            </colgroup>
            <thead>
              <tr>
                <th className="text-right p-3">النزيل</th>
                <th className="text-right p-3">بداية</th>
                <th className="text-right p-3">نهاية</th>
                <th className="text-right p-3">الإيجار</th>
                <th className="text-right p-3">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {contractsActive.length ? contractsActive.map(c => (
                <tr key={c.id} className="odd:bg-white even:bg-gray-50">
                  <td className="p-3">{c.tenantName}</td>
                  <td className="p-3">{formatDate(c.startDate)}</td>
                  <td className="p-3">{formatDate(c.endDate)}</td>
                  <td className="p-3">{Number(c.rentAmount).toLocaleString("ar-SA")} ريال</td>
                  <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${contractStatusClass(c.status)}`}>{mapContractStatus(c.status)}</span></td>
                </tr>
              )) : (
                <tr><td className="p-4 text-center text-gray-500" colSpan={5}>لا توجد عقود حالية</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* العقود المنتهية / الملغاة */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">العقود المنتهية/الملغاة</h3>
          <span className="text-sm text-gray-500">{contractsEnded.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <colgroup>
              <col style={{width:'32%'}} />
              <col style={{width:'16%'}} />
              <col style={{width:'16%'}} />
              <col style={{width:'16%'}} />
              <col style={{width:'20%'}} />
            </colgroup>
            <thead>
              <tr>
                <th className="text-right p-3">النزيل</th>
                <th className="text-right p-3">بداية</th>
                <th className="text-right p-3">نهاية</th>
                <th className="text-right p-3">الإيجار</th>
                <th className="text-right p-3">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {contractsEnded.length ? contractsEnded.map(c => (
                <tr key={c.id} className="odd:bg-white even:bg-gray-50">
                  <td className="p-3">{c.tenantName}</td>
                  <td className="p-3">{formatDate(c.startDate)}</td>
                  <td className="p-3">{formatDate(c.endDate)}</td>
                  <td className="p-3">{Number(c.rentAmount).toLocaleString("ar-SA")} ريال</td>
                  <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${contractStatusClass(c.status)}`}>{mapContractStatus(c.status)}</span></td>
                </tr>
              )) : (
                <tr><td className="p-4 text-center text-gray-500" colSpan={5}>لا توجد عقود منتهية</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, valueClass }: { label: string; value: any; valueClass?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-gray-600">{label}</span>
      {valueClass ? (
        <span className={`px-2 py-1 rounded text-xs w-fit ${valueClass}`}>{String(value)}</span>
      ) : (
        <span className="font-medium">{String(value)}</span>
      )}
    </div>
  );
}

function formatDate(v?: string) {
  if (!v) return "-";
  try {
    return new Date(v).toLocaleDateString("ar-SA");
  } catch {
    return v;
  }
}

function statusClass(v?: string) {
  switch (v) {
    case "AVAILABLE":
      return "bg-green-100 text-green-700";
    case "OCCUPIED":
      return "bg-red-100 text-red-700";
    case "MAINTENANCE":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}
function mapUnitStatus(v?: string) {
  switch (v) {
    case "AVAILABLE":
      return "متاحة";
    case "OCCUPIED":
      return "مشغولة";
    case "MAINTENANCE":
      return "صيانة";
    default:
      return v || "-";
  }
}
function mapRental(v?: string) {
  if (v === "DAILY") return "يومي";
  if (v === "MONTHLY") return "شهري";
  if (v === "YEARLY") return "سنوي";
  return "-";
}

function mapPriority(p: MaintenanceTicket["priority"]) {
  switch (p) {
    case "LOW": return "منخفضة";
    case "MEDIUM": return "متوسطة";
    case "HIGH": return "مرتفعة";
  }
}
function priorityClass(p: MaintenanceTicket["priority"]) {
  switch (p) {
    case "LOW": return "bg-emerald-100 text-emerald-700";
    case "MEDIUM": return "bg-blue-100 text-blue-700";
    case "HIGH": return "bg-rose-100 text-rose-700";
  }
}

function mapTicketStatus(s: MaintenanceTicket["status"]) {
  switch (s) {
    case "NEW": return "جديد";
    case "IN_PROGRESS": return "قيد المعالجة";
    case "COMPLETED": return "مكتمل";
    case "CANCELLED": return "ملغي";
  }
}
function ticketStatusClass(s: MaintenanceTicket["status"]) {
  switch (s) {
    case "NEW": return "bg-slate-100 text-slate-700";
    case "IN_PROGRESS": return "bg-amber-100 text-amber-700";
    case "COMPLETED": return "bg-green-100 text-green-700";
    case "CANCELLED": return "bg-red-100 text-red-700";
  }
}

function mapContractStatus(s: Contract["status"]) {
  switch (s) {
    case "ACTIVE": return "نشط";
    case "ENDED": return "منتهي";
    case "CANCELLED": return "ملغي";
  }
}
function contractStatusClass(s: Contract["status"]) {
  switch (s) {
    case "ACTIVE": return "bg-green-100 text-green-700";
    case "ENDED": return "bg-slate-100 text-slate-700";
    case "CANCELLED": return "bg-red-100 text-red-700";
  }
}

