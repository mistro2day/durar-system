import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { useParams, Link } from "react-router-dom";
import { Wrench, Plus, Edit, ChevronDown, ChevronRight, X } from "lucide-react";
import SortHeader from "../components/SortHeader";
import type { SortDirection } from "../hooks/useTableSort";

type Unit = {
  id: number;
  unitNumber: string;
  number?: string;
  status: string; // AVAILABLE | OCCUPIED | MAINTENANCE
  type?: string;
  rentalType?: string;
  floor?: number; rooms?: number; baths?: number; area?: number;
  propertyId?: number;
  property?: { id: number; name: string } | null;
};

type UnitSortKey = "unit" | "status" | "type" | "rentalType" | "floor" | "rooms" | "baths";

export default function Units() {
  const [items, setItems] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<Array<{ id: number; name: string }>>([]);
  const [filterProperty, setFilterProperty] = useState<string>("");
  const [filterFloor, setFilterFloor] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [modal, setModal] = useState<null | { mode: 'add' | 'edit'; data?: Partial<Unit> }>(null);

  const clearFilters = useCallback(() => {
    setFilterProperty("");
    setFilterFloor("");
    setSearch("");
  }, []);

  const hasActiveFilters = useMemo(() => {
    return filterProperty !== "" || filterFloor !== "" || search !== "";
  }, [filterProperty, filterFloor, search]);
  const [openProps, setOpenProps] = useState<Record<string, boolean>>({});
  const [openFloors, setOpenFloors] = useState<Record<string, Record<number, boolean>>>({});
  const [unitSort, setUnitSort] = useState<{ key: UnitSortKey; direction: SortDirection } | null>(null);
  const params = useParams();
  const propertyId = (params as any)?.id as string | undefined;

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const qp = new URLSearchParams();
      const pid = propertyId || filterProperty;
      if (pid) qp.set('propertyId', String(pid));
      if (filterFloor) qp.set('floor', filterFloor);
      const res = await api.get<Unit[]>(`/api/units${qp.toString() ? `?${qp}` : ""}`);
      setItems(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || "تعذر جلب الوحدات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filterProperty, filterFloor]);

  useEffect(() => {
    // حمّل العقارات لخيارات التصفية/الإضافة إن لم نكن داخل فندق
    if (!propertyId) {
      api.get(`/api/properties?type=BUILDING`).then(r => setProperties(r.data || [])).catch(() => { });
    }
  }, [propertyId]);

  // اجعل دالة التحميل متاحة للاستيراد لإعادة التحديث بعد النجاح
  useEffect(() => {
    // @ts-ignore - legacy dashboards rely on window.loadUnits to trigger refresh
    (window as any).loadUnits = load;
    return () => { /* cleanup */ };
  }, [load]);

  const rows = useMemo(() => {
    const term = search.trim();
    if (!term) return items;
    return items.filter(u => ((u.unitNumber || (u as any).number || '') as string).toLowerCase().includes(term.toLowerCase()));
  }, [items, search]);
  const collator = useMemo(() => new Intl.Collator("ar", { numeric: true, sensitivity: "base" }), []);

  // Grouping: property -> floor -> units
  const grouped = useMemo(() => {
    const byProp = new Map<string, Map<number, Unit[]>>();
    for (const u of rows) {
      const propName = propertyId ? "" : (u.property?.name || "بدون اسم");
      const floor = Number(u.floor || 0);
      if (!byProp.has(propName)) byProp.set(propName, new Map());
      const floors = byProp.get(propName)!;
      if (!floors.has(floor)) floors.set(floor, []);
      floors.get(floor)!.push(u);
    }
    // sort floors ascending
    const compare = (a: Unit, b: Unit) => {
      if (!unitSort) {
        return collator.compare(unitLabel(a), unitLabel(b));
      }
      const dir = unitSort.direction === "asc" ? 1 : -1;
      const valueA = getUnitSortValue(a, unitSort.key);
      const valueB = getUnitSortValue(b, unitSort.key);
      let result: number;
      if (typeof valueA === "number" && typeof valueB === "number") {
        result = valueA - valueB;
      } else {
        result = collator.compare(String(valueA ?? ""), String(valueB ?? ""));
      }
      if (result === 0) {
        result = collator.compare(unitLabel(a), unitLabel(b));
      }
      return result * dir;
    };
    for (const [, floors] of byProp) {
      for (const [f, arr] of Array.from(floors.entries())) {
        floors.set(f, [...arr].sort(compare));
      }
    }
    return byProp;
  }, [rows, propertyId, unitSort, collator]);

  // (تم إزالة التحرير داخل الجدول وإعادة العرض للقراءة فقط)

  // Ensure default open state when data changes
  useEffect(() => {
    const np: Record<string, boolean> = { ...openProps };
    const nf: Record<string, Record<number, boolean>> = { ...openFloors };
    for (const [prop, floors] of grouped.entries()) {
      if (np[prop] === undefined) np[prop] = true;
      if (!nf[prop]) nf[prop] = {};
      for (const f of floors.keys()) {
        if (nf[prop][f] === undefined) nf[prop][f] = true;
      }
    }
    setOpenProps(np);
    setOpenFloors(nf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grouped]);

  function toggleProp(name: string) {
    setOpenProps((s) => ({ ...s, [name]: !s[name] }));
  }
  function toggleFloor(prop: string, floor: number) {
    setOpenFloors((s) => ({ ...s, [prop]: { ...(s[prop] || {}), [floor]: !(s[prop]?.[floor]) } }));
  }

  function toggleUnitSort(key: UnitSortKey) {
    setUnitSort((prev) => {
      if (!prev || prev.key !== key) {
        return { key, direction: "asc" };
      }
      if (prev.direction === "asc") {
        return { key, direction: "desc" };
      }
      return null;
    });
  }

  // لا يوجد تعديل جماعي بعد الآن

  async function updateStatus(id: number, status: string) {
    try {
      await api.patch(`/api/units/${id}`, { status });
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || "تعذر تحديث الحالة");
    }
  }

  async function openTicket(u: Unit) {
    const ulabel = u.unitNumber || (u as any).number || '';
    const description = prompt(`وصف البلاغ للوحدة ${ulabel}`);
    if (!description) return;
    try {
      await api.post(`/api/maintenance`, { unitId: u.id, description, priority: "MEDIUM" });
      alert("تم فتح بلاغ صيانة ✅");
    } catch (e: any) {
      alert(e?.response?.data?.message || "تعذر فتح بلاغ");
    }
  }

  // تصدير CSV من الحالة المحلية مباشرة مع تضمين اسم العقار
  function exportCsvLocal() {
    try {
      const data: string[][] = [];
      // رؤوس عربية متسقة مع المستورد في الخادم
      data.push(['العقار', 'الوحدة', 'الحالة', 'النوع', 'الإيجار', 'الدور', 'الغرف', 'الحمامات', 'المساحة']);
      for (const u of rows) {
        const unitLabel = u.unitNumber || (u as any).number || '';
        const propName = u.property?.name || '';
        const statusAr = mapStatus(u.status);
        const type = u.type || '';
        const rentalAr = mapRental(u.rentalType);
        const floor = u.floor ?? '';
        const rooms = u.rooms ?? '';
        const baths = u.baths ?? '';
        const area = u.area ?? '';
        data.push([
          String(propName),
          String(unitLabel || ''),
          String(statusAr || ''),
          String(type || rentalAr || ''),
          String(rentalAr || ''),
          String(floor),
          String(rooms),
          String(baths),
          String(area),
        ]);
      }
      const csv = data.map(r => r.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n');
      const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'units.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('تعذر التصدير');
    }
  }

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">الوحدات</h2>

      {/* فلاتر وإضافة */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          {!propertyId && (
            <div className="w-64">
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5 block">العقار:</label>
              <select className="form-select w-full bg-gray-50/50 dark:bg-white/5 border-gray-200 dark:border-white/10" value={filterProperty} onChange={(e) => setFilterProperty(e.target.value)}>
                <option value="">الكل</option>
                {properties.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
            </div>
          )}

          <div className="w-32">
            <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5 block">الدور:</label>
            <input className="form-input w-full bg-gray-50/50 dark:bg-white/5 border-gray-200 dark:border-white/10" type="number" value={filterFloor} onChange={(e) => setFilterFloor(e.target.value)} placeholder="مثال: 3" />
          </div>

          <div className="flex-1 min-w-[280px]">
            <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5 block">بحث بالوحدة:</label>
            <div className="relative group">
              <input
                className="form-input w-full pr-10 border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="رقم أو اسم الوحدة..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 ms-auto pt-5">
            <button className="btn-soft btn-soft-primary" onClick={() => setModal({ mode: 'add', data: { propertyId: propertyId ? Number(propertyId) : undefined } })}>
              <Plus className="w-4 h-4" /> إضافة وحدة
            </button>
            <button className="btn-soft btn-soft-info" onClick={exportCsvLocal}>تصدير CSV</button>
            <label className="btn-soft btn-soft-primary cursor-pointer">
              استيراد CSV
              <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
            </label>
            {propertyId ? (
              <button className="btn-soft btn-soft-danger" onClick={handleWipeUnits}>حذف جميع الوحدات</button>
            ) : null}
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
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card text-center text-gray-500">جاري التحميل...</div>
      ) : error ? (
        <div className="card text-center text-red-600">{error}</div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([propName, floors]) => (
            <div key={propName} className="card overflow-x-auto">
              {!propertyId && (
                <button className="w-full flex items-center justify-between text-right mb-3" onClick={() => toggleProp(propName)}>
                  <h3 className="text-lg font-semibold">{propName || '—'}</h3>
                  {openProps[propName] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
              )}
              {/* ملخص العمارة */}
              {(() => {
                let avail = 0, occ = 0, mnt = 0;
                floors.forEach(arr => {
                  for (const u of arr) {
                    if (u.status === 'AVAILABLE') avail++; else if (u.status === 'OCCUPIED') occ++; else if (u.status === 'MAINTENANCE') mnt++;
                  }
                });
                return (
                  <div className="mb-3 flex items-center gap-3 text-sm">
                    <span className="badge-success">متاحة: {avail}</span>
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-medium badge-warning">مشغولة: {occ}</span>
                    <span className="badge-info">صيانة: {mnt}</span>
                  </div>
                );
              })()}
              {openProps[propName] !== false && (
                <table className="table sticky">
                  <colgroup>
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '30%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="text-right p-3 font-semibold">
                        <SortHeader
                          label="الوحدة"
                          active={unitSort?.key === "unit"}
                          direction={unitSort?.key === "unit" ? unitSort.direction : null}
                          onToggle={() => toggleUnitSort("unit")}
                        />
                      </th>
                      <th className="text-right p-3 font-semibold">
                        <SortHeader
                          label="الحالة"
                          active={unitSort?.key === "status"}
                          direction={unitSort?.key === "status" ? unitSort.direction : null}
                          onToggle={() => toggleUnitSort("status")}
                        />
                      </th>
                      <th className="text-right p-3 font-semibold">
                        <SortHeader
                          label="النوع"
                          active={unitSort?.key === "type"}
                          direction={unitSort?.key === "type" ? unitSort.direction : null}
                          onToggle={() => toggleUnitSort("type")}
                        />
                      </th>
                      <th className="text-right p-3 font-semibold">
                        <SortHeader
                          label="الإيجار"
                          active={unitSort?.key === "rentalType"}
                          direction={unitSort?.key === "rentalType" ? unitSort.direction : null}
                          onToggle={() => toggleUnitSort("rentalType")}
                        />
                      </th>
                      <th className="text-right p-3 font-semibold">
                        <SortHeader
                          label="الدور"
                          active={unitSort?.key === "floor"}
                          direction={unitSort?.key === "floor" ? unitSort.direction : null}
                          onToggle={() => toggleUnitSort("floor")}
                        />
                      </th>
                      <th className="text-right p-3 font-semibold">
                        <SortHeader
                          label="الغرف"
                          active={unitSort?.key === "rooms"}
                          direction={unitSort?.key === "rooms" ? unitSort.direction : null}
                          onToggle={() => toggleUnitSort("rooms")}
                        />
                      </th>
                      <th className="text-right p-3 font-semibold">
                        <SortHeader
                          label="الحمامات"
                          active={unitSort?.key === "baths"}
                          direction={unitSort?.key === "baths" ? unitSort.direction : null}
                          onToggle={() => toggleUnitSort("baths")}
                        />
                      </th>
                      <th className="text-right p-3 font-semibold">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {Array.from(floors.keys()).sort((a, b) => a - b).map((f) => (
                      <>
                        <tr key={`floor-${f}`}>
                          <td colSpan={8} className="bg-[var(--surface-2)] text-gray-700 font-semibold p-2">
                            <button className="w-full flex items-center justify-between" onClick={() => toggleFloor(propName, f)}>
                              <span>الدور: {f}</span>
                              {openFloors[propName]?.[f] !== false ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          </td>
                        </tr>
                        {/* إحصائيات الدور */}
                        {openFloors[propName]?.[f] !== false && (() => {
                          const list = floors.get(f)!; const avail = list.filter(x => x.status === 'AVAILABLE').length; const occ = list.filter(x => x.status === 'OCCUPIED').length; const mnt = list.filter(x => x.status === 'MAINTENANCE').length; return (
                            <tr key={`stats-${f}`}>
                              <td colSpan={8} className="p-2">
                                <div className="flex items-center gap-3 text-sm">
                                  <span className="badge-success">متاحة: {avail}</span>
                                  <span className="badge-warning">مشغولة: {occ}</span>
                                  <span className="badge-info">صيانة: {mnt}</span>
                                </div>
                              </td>
                            </tr>
                          )
                        })()}
                        {openFloors[propName]?.[f] !== false && floors.get(f)!.map((u) => (
                          <tr key={u.id} className="odd:bg-white even:bg-gray-50">
                            <td className="p-3">
                              <Link to={`/units/${u.id}`} className="text-primary hover:underline">
                                {u.unitNumber || (u as any).number}
                              </Link>
                            </td>
                            <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${statusClass(u.status)}`}>{mapStatus(u.status)}</span></td>
                            <td className="p-3">{u.type || '-'}</td>
                            <td className="p-3">{mapRental(u.rentalType)}</td>
                            <td className="p-3">{u.floor ?? '-'}</td>
                            <td className="p-3">{u.rooms ?? '-'}</td>
                            <td className="p-3">{u.baths ?? '-'}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <button className="btn-soft btn-soft-success" onClick={() => updateStatus(u.id, "AVAILABLE")}>متاحة</button>
                                <button className="btn-soft btn-soft-warning" onClick={() => updateStatus(u.id, "OCCUPIED")}>مشغولة</button>
                                <button className="btn-soft btn-soft-info" onClick={() => updateStatus(u.id, "MAINTENANCE")}>صيانة</button>
                                <button className="btn-soft btn-soft-primary" onClick={() => openTicket(u)}><Wrench className="w-4 h-4" />بلاغ</button>
                                <button className="btn-soft btn-soft-info" onClick={() => setModal({ mode: 'edit', data: u })}><Edit className="w-4 h-4" />تعديل</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}

      {modal ? (
        <UnitModal
          mode={modal.mode}
          data={modal.data}
          properties={properties}
          defaultPropertyId={propertyId ? Number(propertyId) : undefined}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      ) : null}
    </div>
  );
}

function statusClass(v?: string) {
  switch (v) {
    case "AVAILABLE":
      return "bg-green-100 text-green-700";
    case "OCCUPIED":
      return "badge-warning";
    case "MAINTENANCE":
      return "badge-warning";
    default:
      return "bg-slate-100 text-slate-700";
  }
}
function unitLabel(unit: Unit) {
  return (unit.unitNumber || (unit as any).number || "") as string;
}

function getUnitSortValue(unit: Unit, key: UnitSortKey) {
  switch (key) {
    case "unit":
      return unitLabel(unit);
    case "status":
      return unit.status || "";
    case "type":
      return unit.type || "";
    case "rentalType":
      return unit.rentalType || "";
    case "floor":
      return unit.floor ?? Number.NEGATIVE_INFINITY;
    case "rooms":
      return unit.rooms ?? Number.NEGATIVE_INFINITY;
    case "baths":
      return unit.baths ?? Number.NEGATIVE_INFINITY;
    default:
      return unitLabel(unit);
  }
}

function mapStatus(v?: string) {
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
  return "-";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-gray-600">{label}</span>
      {children}
    </label>
  );
}

// تصدير CSV للوحدات المعروضة حالياً (باستخدام الحالة المحلية rows)
// (تم استبدال مصدّر CSV بدالة داخلية داخل المكون لتضمين اسم العقار)

async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const fd = new FormData();
    fd.append('file', file);
    const resp = await api.post('/api/units/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    const r = resp.data || {};
    alert(`تم الاستيراد: مضافة ${r.imported || 0}، محدّثة ${r.updated || 0}${r.errors?.length ? `\nأخطاء: \n- ${r.errors.join('\n- ')}` : ''}`);
    (e.target as any).value = '';
    // @ts-ignore - invoke global reload hook after import (legacy integration)
    if (typeof window.loadUnits === 'function') window.loadUnits();
  } catch (err: any) {
    alert(err?.response?.data?.message || 'تعذر استيراد الملف');
  }
}

async function handleWipeUnits() {
  try {
    // يستخرج id من /hotel/:id/units
    const match = window.location.pathname.match(/\/hotel\/(\d+)\/units/);
    const id = match ? match[1] : undefined;
    if (!id) return alert('لا يوجد فندق محدد');
    if (!confirm('سيتم حذف جميع الوحدات والعلاقات المرتبطة بهذا الفندق. هل أنت متأكد؟')) return;
    const r = await api.delete(`/api/units/by-property/${id}`);
    alert(`تم الحذف: الوحدات ${r.data?.deletedUnits || 0}`);
    // @ts-ignore - invoke global reload hook after deletion (legacy integration)
    if (typeof window.loadUnits === 'function') window.loadUnits();
  } catch (e: any) {
    alert(e?.response?.data?.message || 'تعذر حذف الوحدات');
  }
}

function UnitModal({ mode, data, onClose, onSaved, properties, defaultPropertyId }: { mode: 'add' | 'edit'; data?: Partial<Unit>; onClose: () => void; onSaved: () => void; properties: Array<{ id: number; name: string }>; defaultPropertyId?: number }) {
  const [form, setForm] = useState<Partial<Unit>>({
    id: data?.id,
    unitNumber: data?.unitNumber || (data as any)?.number || "",
    status: data?.status || "AVAILABLE",
    type: data?.type || "MONTHLY",
    rentalType: data?.rentalType || "MONTHLY",
    floor: data?.floor ?? 0,
    rooms: data?.rooms ?? 1,
    baths: data?.baths ?? 1,
    area: data?.area ?? undefined,
    propertyId: data?.propertyId || defaultPropertyId,
  });
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (saving) return;
    if (!form.unitNumber || !String(form.unitNumber).trim()) {
      alert("يرجى إدخال رقم/اسم الوحدة.");
      return;
    }
    if (!form.propertyId && !defaultPropertyId) {
      alert("يرجى اختيار العقار.");
      return;
    }
    try {
      setSaving(true);
      if (mode === 'add') {
        const payload: any = {
          unitNumber: form.unitNumber,
          status: form.status,
          type: form.type,
          propertyId: Number(form.propertyId),
          floor: Number(form.floor), rooms: Number(form.rooms), baths: Number(form.baths), area: form.area ? Number(form.area) : undefined,
        };
        await api.post('/api/units', payload);
      } else if (mode === 'edit' && form.id) {
        const payload: any = {
          unitNumber: form.unitNumber,
          status: form.status,
          type: form.type,
          floor: Number(form.floor), rooms: Number(form.rooms), baths: Number(form.baths), area: form.area ? Number(form.area) : undefined,
        };
        await api.patch(`/api/units/${form.id}`, payload);
      }
      onClose();
      onSaved();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'تعذر حفظ الوحدة');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="card w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-4">{mode === 'add' ? 'إضافة وحدة' : 'تعديل وحدة'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="رقم/اسم الوحدة">
            <input className="form-input" value={form.unitNumber || ''} onChange={(e) => setForm({ ...form, unitNumber: e.target.value })} />
          </Field>
          <Field label="الحالة">
            <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="AVAILABLE">متاحة</option>
              <option value="OCCUPIED">مشغولة</option>
              <option value="MAINTENANCE">صيانة</option>
            </select>
          </Field>
          {!defaultPropertyId && (
            <Field label="العقار">
              <select className="form-select" value={String(form.propertyId || '')} onChange={(e) => setForm({ ...form, propertyId: Number(e.target.value) })}>
                <option value="">—</option>
                {properties.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
            </Field>
          )}
          <Field label="الدور"><input className="form-input" type="number" value={String(form.floor ?? '')} onChange={(e) => setForm({ ...form, floor: Number(e.target.value) })} /></Field>
          <Field label="الغرف"><input className="form-input" type="number" value={String(form.rooms ?? '')} onChange={(e) => setForm({ ...form, rooms: Number(e.target.value) })} /></Field>
          <Field label="الحمامات"><input className="form-input" type="number" value={String(form.baths ?? '')} onChange={(e) => setForm({ ...form, baths: Number(e.target.value) })} /></Field>
          <Field label="المساحة (م²)"><input className="form-input" type="number" step="0.1" value={String(form.area ?? '')} onChange={(e) => setForm({ ...form, area: Number(e.target.value) })} /></Field>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button className="btn-outline disabled:opacity-60" onClick={onClose} disabled={saving}>إلغاء</button>
          <button className="btn-primary disabled:opacity-60" onClick={submit} disabled={saving}>حفظ</button>
        </div>
      </div>
    </div>
  );
}
