import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { useLocaleTag } from "../lib/settings-react";
import { hasPermission, getSettings } from "../lib/settings";
import { getRole } from "../lib/auth";
import { Pencil, Plus, KeyRound, Mail } from "lucide-react";
import SortHeader from "../components/SortHeader";
import { useTableSort } from "../hooks/useTableSort";

type User = { id: number; name: string; email: string; role: string; createdAt: string };

type UserSortKey = "id" | "name" | "email" | "role" | "createdAt";

export default function Users() {
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<null | { mode: "add" | "edit"; data?: Partial<User> }>(null);
  const [pwdModal, setPwdModal] = useState<null | { id: number; email: string }>(null);
  const [saving, setSaving] = useState(false);

  const role = getRole();
  const site = getSettings();
  const canEdit = hasPermission(role, "users.edit", site);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<User[]>("/api/users");
      setItems(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || "تعذر جلب المستخدمين");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => items, [items]);

  const userSortAccessors = useMemo<Record<UserSortKey, (user: User) => unknown>>(
    () => ({
      id: (user) => user.id,
      name: (user) => user.name || "",
      email: (user) => user.email || "",
      role: (user) => user.role || "",
      createdAt: (user) => user.createdAt || "",
    }),
    []
  );

  const {
    sortedItems: sortedUsers,
    sortState: userSort,
    toggleSort: toggleUserSort,
  } = useTableSort<User, UserSortKey>(rows, userSortAccessors, { key: "createdAt", direction: "desc" });

  async function handleSaveUser(form: Partial<User> & { password?: string }) {
    setSaving(true);
    try {
      if (modal?.mode === "add") {
        await api.post("/api/users", form);
      } else if (modal?.mode === "edit" && form.id) {
        await api.put(`/api/users/${form.id}`, form);
      }
      setModal(null);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || "تعذر الحفظ");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword(id: number, newPassword: string) {
    setSaving(true);
    try {
      await api.patch(`/api/users/${id}/password`, { newPassword });
      setPwdModal(null);
      alert("تم تحديث كلمة المرور");
    } catch (e: any) {
      alert(e?.response?.data?.message || "تعذر تحديث كلمة المرور");
    } finally {
      setSaving(false);
    }
  }

  async function handleForgot(email: string) {
    try {
      await api.post(`/api/auth/forgot`, { email });
      alert("تم إرسال رابط الاسترجاع إن وُجد بريد مطابق");
    } catch (e: any) {
      alert(e?.response?.data?.message || "تعذر إرسال الرابط");
    }
  }

  const localeTag = useLocaleTag();
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800">المستخدمون</h2>
        {canEdit && (
          <button
            onClick={() => setModal({ mode: "add", data: { name: "", email: "", role: "USER" } })}
            className="inline-flex items-center gap-2 px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> مستخدم جديد
          </button>
        )}
      </div>

      {loading ? (
        <div className="card text-center text-gray-500">جاري التحميل...</div>
      ) : error ? (
        <div className="card text-center text-red-600">{error}</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table sticky">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-right p-3 font-semibold text-gray-700">
                  <SortHeader
                    label="#"
                    active={userSort?.key === "id"}
                    direction={userSort?.key === "id" ? userSort.direction : null}
                    onToggle={() => toggleUserSort("id")}
                  />
                </th>
                <th className="text-right p-3 font-semibold text-gray-700">
                  <SortHeader
                    label="الاسم"
                    active={userSort?.key === "name"}
                    direction={userSort?.key === "name" ? userSort.direction : null}
                    onToggle={() => toggleUserSort("name")}
                  />
                </th>
                <th className="text-right p-3 font-semibold text-gray-700">
                  <SortHeader
                    label="البريد"
                    active={userSort?.key === "email"}
                    direction={userSort?.key === "email" ? userSort.direction : null}
                    onToggle={() => toggleUserSort("email")}
                  />
                </th>
                <th className="text-right p-3 font-semibold text-gray-700">
                  <SortHeader
                    label="الدور"
                    active={userSort?.key === "role"}
                    direction={userSort?.key === "role" ? userSort.direction : null}
                    onToggle={() => toggleUserSort("role")}
                  />
                </th>
                <th className="text-right p-3 font-semibold text-gray-700">
                  <SortHeader
                    label="تاريخ الإنشاء"
                    active={userSort?.key === "createdAt"}
                    direction={userSort?.key === "createdAt" ? userSort.direction : null}
                    onToggle={() => toggleUserSort("createdAt")}
                  />
                </th>
                <th className="text-right p-3 font-semibold text-gray-700">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedUsers.map((u) => (
                <tr key={u.id} className="odd:bg-white even:bg-gray-50">
                  <Td>{u.id}</Td>
                  <Td>{u.name}</Td>
                  <Td>{u.email}</Td>
                  <Td>{mapRole(u.role)}</Td>
                  <Td>{new Date(u.createdAt).toLocaleString(localeTag)}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      {canEdit && (
                        <button
                          onClick={() => setModal({ mode: "edit", data: u })}
                          className="btn-soft btn-soft-info"
                          title="تعديل"
                        >
                          <Pencil className="w-4 h-4" />
                          <span className="hidden sm:inline">تعديل</span>
                        </button>
                      )}
                      {canEdit && (
                        <button
                          onClick={() => setPwdModal({ id: u.id, email: u.email })}
                          className="btn-soft btn-soft-warning"
                          title="تغيير كلمة المرور"
                        >
                          <KeyRound className="w-4 h-4" />
                          <span className="hidden sm:inline">كلمة المرور</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleForgot(u.email)}
                        className="btn-soft btn-soft-primary"
                        title="إرسال رابط الاسترجاع"
                      >
                        <Mail className="w-4 h-4" />
                        <span className="hidden sm:inline">استرجاع بالبريد</span>
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal ? (
        <UserModal
          mode={modal.mode}
          data={modal.data}
          saving={saving}
          onClose={() => setModal(null)}
          onSave={handleSaveUser}
        />
      ) : null}

      {pwdModal ? (
        <PasswordModal
          email={pwdModal.email}
          saving={saving}
          onClose={() => setPwdModal(null)}
          onSave={(pwd) => handleResetPassword(pwdModal.id, pwd)}
        />
      ) : null}
    </div>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="p-3 text-gray-800">{children}</td>;
}

function mapRole(r?: string) {
  switch ((r || "").toUpperCase()) {
    case "ADMIN":
      return "مدير";
    case "MANAGER":
      return "مشرف";
    case "STAFF":
    case "USER":
      return "موظف";
    default:
      return r || "-";
  }
}

function UserModal({ mode, data, saving, onClose, onSave }: { mode: "add" | "edit"; data?: Partial<User>; saving: boolean; onClose: () => void; onSave: (u: Partial<User> & { password?: string }) => void }) {
  const [form, setForm] = useState<Partial<User> & { password?: string }>(data || {});
  return (
    <div className="modal-backdrop">
      <div className="card w-full max-w-lg">
        <h3 className="text-lg font-semibold mb-4">{mode === "add" ? "مستخدم جديد" : "تعديل المستخدم"}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="الاسم">
            <input className="border rounded p-2 w-full" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="البريد">
            <input className="border rounded p-2 w-full" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="الدور">
            <select className="border rounded p-2 w-full" value={form.role || "USER"} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="ADMIN">مدير</option>
              <option value="USER">موظف</option>
            </select>
          </Field>
          {mode === "add" ? (
            <Field label="كلمة المرور (مبدئية)">
              <input type="password" className="border rounded p-2 w-full" value={form.password || ""} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
          ) : null}
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button className="btn-outline" onClick={onClose}>إلغاء</button>
          <button className="btn-primary" disabled={saving} onClick={() => onSave(form)}>
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
}

function PasswordModal({ email, saving, onClose, onSave }: { email: string; saving: boolean; onClose: () => void; onSave: (pwd: string) => void }) {
  const [pwd, setPwd] = useState("");
  return (
    <div className="modal-backdrop">
      <div className="card w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">تعيين كلمة مرور جديدة</h3>
        <p className="text-sm text-gray-600 mb-2">للمستخدم: {email}</p>
        <input type="password" className="border rounded p-2 w-full" placeholder="كلمة المرور الجديدة" value={pwd} onChange={(e) => setPwd(e.target.value)} />
        <div className="mt-6 flex items-center justify-end gap-3">
          <button className="btn-outline" onClick={onClose}>إلغاء</button>
          <button className="btn-primary" disabled={saving || !pwd} onClick={() => onSave(pwd)}>
            حفظ
          </button>
        </div>
      </div>
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
