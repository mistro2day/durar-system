import { useEffect, useState } from "react";
import { getSettings, saveSettings, fetchSettingsFromServer, type SiteSettings } from "../lib/settings";

export default function Settings() {
  const [form, setForm] = useState<SiteSettings>(getSettings());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm(getSettings());
    fetchSettingsFromServer().then((remote) => {
      if (remote) setForm(getSettings());
    });
  }, []);

  function handleChange<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveSettings({
      ...form,
      vatPercent: Number(form.vatPercent || 0),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">إعدادات الموقع</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6">
        {/* بطاقة بيانات الشركة */}
        <div className="card grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="اسم الشركة">
            <input
              className="form-input"
              value={form.companyName}
              onChange={(e) => handleChange("companyName", e.target.value)}
              required
            />
          </Field>
          <Field label="رقم السجل التجاري">
            <input
              className="form-input"
              value={form.companyCR}
              onChange={(e) => handleChange("companyCR", e.target.value)}
            />
          </Field>
          <Field label="رقم الهاتف">
            <input
              className="form-input"
              value={form.companyPhone}
              onChange={(e) => handleChange("companyPhone", e.target.value)}
            />
          </Field>
          <Field label="البريد الإلكتروني">
            <input
              type="email"
              className="form-input"
              value={form.companyEmail}
              onChange={(e) => handleChange("companyEmail", e.target.value)}
            />
          </Field>
          <Field label="العنوان">
            <input
              className="form-input"
              value={form.companyAddress}
              onChange={(e) => handleChange("companyAddress", e.target.value)}
            />
          </Field>
          <Field label="نسبة ضريبة القيمة المضافة (%)">
            <input
              type="number"
              min={0}
              max={100}
              className="form-input"
              value={form.vatPercent}
              onChange={(e) => handleChange("vatPercent", Number(e.target.value))}
            />
          </Field>

          <div className="md:col-span-2 flex items-center justify-end gap-3 mt-2">
            {saved ? <span className="text-green-600 text-sm">تم الحفظ ✅</span> : null}
            <button type="submit" className="btn-primary">
              حفظ الإعدادات
            </button>
          </div>
        </div>

        {/* بطاقة اللغة */}
        <div className="card grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <h3 className="text-lg font-semibold mb-2">اللغة</h3>
            <p className="text-sm text-gray-500 mb-3">اختر لغة الواجهة.</p>
          </div>
          <label className="flex items-center gap-2">
            <input type="radio" name="locale" checked={form.locale === 'ar'} onChange={() => handleChange('locale', 'ar' as any)} />
            عربية
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="locale" checked={form.locale === 'en'} onChange={() => handleChange('locale', 'en' as any)} />
            English
          </label>
        </div>

        {/* بطاقة التقويم */}
        <div className="card grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <h3 className="text-lg font-semibold mb-2">نظام التاريخ</h3>
            <p className="text-sm text-gray-500 mb-3">اختر بين التقويم الميلادي والهجري لعرض التواريخ.</p>
          </div>
          <label className="flex items-center gap-2">
            <input type="radio" name="calendar" checked={form.calendar === 'gregorian'} onChange={() => handleChange('calendar', 'gregorian' as any)} />
            ميلادي (Gregorian)
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="calendar" checked={form.calendar === 'hijri'} onChange={() => handleChange('calendar', 'hijri' as any)} />
            هجري (Islamic)
          </label>
        </div>
        {/* شريط حفظ مثبت */}
        <div className="sticky bottom-0 z-10">
          <div className="card flex items-center justify-end gap-3">
            {saved ? <span className="text-green-600 text-sm">تم الحفظ ✅</span> : null}
            <button type="submit" className="btn-primary">تطبيق الإعدادات</button>
          </div>
        </div>
      </form>
      <p className="text-xs text-gray-500 mt-3">تستخدم هذه الإعدادات في طباعة الفواتير ولوحة التحكم.</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-gray-600">{label}</span>
      {children}
    </label>
  );
}
