import React, { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Line } from "react-chartjs-2";
import "chart.js/auto";

export default function Dashboard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    axios
      .get("http://localhost:8080/api/dashboard", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => setData(res.data))
      .catch((err) => console.error(err));
  }, []);

  if (!data) return <p className="text-center text-gray-500 mt-10">جاري التحميل...</p>;

  const { summary, activities } = data;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">📊 لوحة التحكم</h1>

      {/* Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <h3 className="text-lg font-semibold">العقود النشطة</h3>
            <p className="text-3xl font-bold text-blue-600">{summary.contracts.active}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <h3 className="text-lg font-semibold">الوحدات المتاحة</h3>
            <p className="text-3xl font-bold text-green-600">{summary.units.available}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <h3 className="text-lg font-semibold">الإيرادات الشهرية</h3>
            <p className="text-3xl font-bold text-amber-600">{summary.revenue} ريال</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <div className="bg-white p-4 rounded-2xl shadow">
        <h2 className="text-xl font-bold mb-3">🕓 آخر الأنشطة</h2>
        <ul className="space-y-2">
          {activities.map((a: any) => (
            <li key={a.id} className="border-b pb-2">
              <p className="font-medium">{a.action}</p>
              <p className="text-sm text-gray-600">{a.description}</p>
              <p className="text-xs text-gray-400">
                {new Date(a.createdAt).toLocaleString("ar-SA")} — {a.user}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
