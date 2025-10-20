import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { useNavigate } from "react-router-dom";
import SortHeader from "../components/SortHeader";
import { useTableSort } from "../hooks/useTableSort";

type Property = { id: number; name: string; type: string; address?: string|null; _count?: { units: number }; tenantsCount?: number; invoicesCount?: number };

type PropertySortKey = "name" | "type" | "units" | "tenants" | "invoices";

export default function Properties() {
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<null | { open: true }>(null);
  const navigate = useNavigate();

  async function load() {
    setLoading(true); setError(null);
    try {
      const r = await api.get<Property[]>(`/api/properties`);
      setItems(r.data || []);
    } catch (e:any) {
      setError(e?.response?.data?.message || 'تعذر جلب العقارات');
    } finally { setLoading(false); }
  }
  useEffect(()=>{ load(); }, []);

  const rows = useMemo(()=>{
    const t = search.trim().toLowerCase();
    if (!t) return items;
    return items.filter(p => (p.name||'').toLowerCase().includes(t));
  }, [items, search]);

  const propertySortAccessors = useMemo<Record<PropertySortKey, (p: Property) => unknown>>(
    () => ({
      name: (p) => p.name || "",
      type: (p) => mapType(p.type),
      units: (p) => p._count?.units ?? 0,
      tenants: (p) => p.tenantsCount ?? 0,
      invoices: (p) => p.invoicesCount ?? 0,
    }),
    []
  );

  const {
    sortedItems: sortedProperties,
    sortState: propertySort,
    toggleSort: togglePropertySort,
  } = useTableSort<Property, PropertySortKey>(rows, propertySortAccessors, { key: "name", direction: "asc" });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800">العقارات</h2>
        <button className="btn-soft btn-soft-primary" onClick={()=>setModal({open:true})}>إضافة عقار</button>
      </div>
      <div className="card mb-4 flex items-end gap-3">
        <label className="text-sm flex flex-col">
          <span className="text-gray-600 mb-1">بحث</span>
          <input className="form-input" placeholder="اسم العقار" value={search} onChange={(e)=>setSearch(e.target.value)} />
        </label>
      </div>
      {loading ? (<div className="card text-center text-gray-500">جاري التحميل...</div>) : error ? (
        <div className="card text-center text-red-600">{error}</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="text-right p-3">
                  <SortHeader
                    label="الاسم"
                    active={propertySort?.key === "name"}
                    direction={propertySort?.key === "name" ? propertySort.direction : null}
                    onToggle={() => togglePropertySort("name")}
                  />
                </th>
                <th className="text-right p-3">
                  <SortHeader
                    label="النوع"
                    active={propertySort?.key === "type"}
                    direction={propertySort?.key === "type" ? propertySort.direction : null}
                    onToggle={() => togglePropertySort("type")}
                  />
                </th>
                <th className="text-right p-3">
                  <SortHeader
                    label="الوحدات"
                    active={propertySort?.key === "units"}
                    direction={propertySort?.key === "units" ? propertySort.direction : null}
                    onToggle={() => togglePropertySort("units")}
                  />
                </th>
                <th className="text-right p-3">
                  <SortHeader
                    label="المستأجرون"
                    active={propertySort?.key === "tenants"}
                    direction={propertySort?.key === "tenants" ? propertySort.direction : null}
                    onToggle={() => togglePropertySort("tenants")}
                  />
                </th>
                <th className="text-right p-3">
                  <SortHeader
                    label="الفواتير"
                    active={propertySort?.key === "invoices"}
                    direction={propertySort?.key === "invoices" ? propertySort.direction : null}
                    onToggle={() => togglePropertySort("invoices")}
                  />
                </th>
                <th className="text-right p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedProperties.map(p => (
                <tr key={p.id}>
                  <td className="p-3">{p.name}</td>
                  <td className="p-3">{mapType(p.type)}</td>
                  <td className="p-3">{p._count?.units ?? '-'}</td>
                  <td className="p-3">{p.tenantsCount ?? '-'}</td>
                  <td className="p-3">{p.invoicesCount ?? '-'}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button className="btn-soft btn-soft-info" onClick={()=>navigate(`/hotel/${p.id}/units`)}>الوحدات</button>
                      <button className="btn-soft btn-soft-success" onClick={()=>navigate(`/hotel/${p.id}/contracts`)}>العقود</button>
                      <button className="btn-soft btn-soft-warning" onClick={()=>navigate(`/hotel/${p.id}/invoices`)}>الفواتير</button>
                      <button className="btn-soft btn-soft-primary" onClick={()=>navigate(`/hotel/${p.id}/tenants`)}>المستأجرون</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal ? <PropertyModal onClose={()=>setModal(null)} onSaved={load} /> : null}
    </div>
  );
}

function mapType(t?: string) {
  if (!t) return '-';
  switch (t) {
    case 'HOTEL': return 'فندق';
    case 'BUILDING': return 'عمارة';
    case 'COMMERCIAL': return 'تجاري';
    default: return t;
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-gray-600">{label}</span>
      {children}
    </label>
  );
}

function PropertyModal({ onClose, onSaved }: { onClose: ()=>void; onSaved: ()=>void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("HOTEL");
  const [address, setAddress] = useState("");
  const [units, setUnits] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    try {
      setBusy(true);
      const unitsArr = units.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
      const payload: any = { name, type, address: address || undefined };
      if (unitsArr.length) payload.units = unitsArr;
      await api.post('/api/properties', payload);
      onClose(); onSaved();
    } catch (e:any) {
      alert(e?.response?.data?.message || 'تعذر إنشاء العقار');
    } finally { setBusy(false); }
  }

  return (
    <div className="modal-backdrop">
      <div className="card w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-4">إضافة عقار</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="اسم العقار"><input className="form-input" value={name} onChange={(e)=>setName(e.target.value)} /></Field>
          <Field label="النوع">
            <select className="form-select" value={type} onChange={(e)=>setType(e.target.value)}>
              <option value="HOTEL">فندق</option>
              <option value="BUILDING">عمارة</option>
              <option value="COMMERCIAL">تجاري</option>
            </select>
          </Field>
          <Field label="العنوان"><input className="form-input" value={address} onChange={(e)=>setAddress(e.target.value)} /></Field>
          <div className="md:col-span-3">
            <Field label="أسماء/أرقام الوحدات (سطر لكل وحدة)">
              <textarea className="form-input h-32" value={units} onChange={(e)=>setUnits(e.target.value)} placeholder="101\n102\n103" />
            </Field>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button className="btn-outline" onClick={onClose} disabled={busy}>إلغاء</button>
          <button className="btn-primary" onClick={submit} disabled={busy || !name}>حفظ</button>
        </div>
      </div>
    </div>
  );
}
