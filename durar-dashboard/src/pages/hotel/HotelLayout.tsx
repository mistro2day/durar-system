import { NavLink, Outlet, useParams } from "react-router-dom";
import { Home, Building2, FileText, Users, Wrench, Receipt, BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../lib/api";

export default function HotelLayout() {
  const { id } = useParams();
  const base = `/hotel/${id}`;
  const [name, setName] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get(`/api/properties/${id}`).then(r => setName(r.data?.name || `#${id}`)).catch(()=>setName(`#${id}`));
  }, [id]);

  async function saveName(v: string) {
    if (!id) return;
    const nv = v.trim();
    if (!nv || nv === name) return;
    try {
      setSaving(true);
      setName(nv); // تحديث متفائل
      await api.patch(`/api/properties/${id}`, { name: nv });
    } catch (e) {
      // تجاهل الخطأ مع تنبيه بسيط
      alert('تعذر حفظ اسم الفندق');
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800">فندق —</h2>
          <input
            className="form-input text-xl md:text-2xl font-bold w-[28ch]"
            value={name}
            onChange={(e)=>setName(e.target.value)}
            onBlur={(e)=>saveName(e.target.value)}
            onKeyDown={(e)=>{ if(e.key==='Enter'){ (e.target as HTMLInputElement).blur(); } }}
          />
          {saving ? <span className="text-xs text-gray-500">…حفظ</span> : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Tab to={`${base}/dashboard`} icon={<Home />} text="لوحة التحكم" />
        <Tab to={`${base}/units`} icon={<Building2 />} text="الوحدات" />
        <Tab to={`${base}/contracts`} icon={<FileText />} text="العقود" />
        <Tab to={`${base}/tenants`} icon={<Users />} text="المستأجرون" />
        <Tab to={`${base}/invoices`} icon={<Receipt />} text="الفواتير" />
        <Tab to={`${base}/maintenance`} icon={<Wrench />} text="الصيانة" />
        <Tab to={`${base}/reports`} icon={<BarChart3 />} text="التقارير" />
      </div>

      <Outlet />
    </div>
  );
}

function Tab({ to, icon, text }: { to: string; icon: React.ReactNode; text: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition ${
          isActive ? "bg-[--color-primary]/10 text-[--color-primary]" : "hover:bg-gray-50"
        }`}
    >
      <span className="w-4 h-4">{icon}</span>
      <span className="text-sm">{text}</span>
    </NavLink>
  );
}
