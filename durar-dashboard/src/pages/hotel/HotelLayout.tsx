import { NavLink, Outlet, useParams } from "react-router-dom";
import { Home, Building2, FileText, Users, Wrench, Receipt, BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../lib/api";

export default function HotelLayout() {
  const { id } = useParams();
  const base = `/hotel/${id}`;
  const [name, setName] = useState<string>("");

  useEffect(() => {
    if (!id) return;
    api.get(`/api/properties/${id}`).then(r => setName(r.data?.name || `#${id}`)).catch(()=>setName(`#${id}`));
  }, [id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800">{name || `#${id}`}</h2>
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
