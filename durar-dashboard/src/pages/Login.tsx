import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { saveToken } from "../lib/auth";
import Logo from "../components/Logo";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post("/api/auth/login", { email, password });
      saveToken(res.data.token);
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || "فشل تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F6FA] p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm card">
        <div className="flex flex-col items-center mb-4">
          <Logo className="h-14" />
        </div>
        <h1 className="text-2xl font-bold text-center text-durar-blue mb-6">تسجيل الدخول</h1>

        <label className="block text-sm mb-1">البريد الإلكتروني</label>
        <input
          type="email"
          className="w-full border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring focus:ring-blue-100"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@durar.local"
          required
        />

        <label className="block text-sm mb-1">كلمة المرور</label>
        <input
          type="password"
          className="w-full border rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring focus:ring-blue-100"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <button type="submit" disabled={loading} className="w-full btn-primary justify-center disabled:opacity-60">
          {loading ? "جارٍ الدخول..." : "دخول"}
        </button>

        <p className="text-center text-xs text-gray-500 mt-4">ⓒ درر للخدمات العقارية</p>
      </form>
    </div>
  );
}
