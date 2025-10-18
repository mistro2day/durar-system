import React from "react";

export default function Reports() {
  return (
    <div className="flex flex-col items-center justify-center h-[80vh] text-center space-y-4">
      <div className="animate-bounce text-6xl">🚧</div>
      <h2 className="text-3xl md:text-4xl font-bold text-gray-700">
        الصفحة قيد الإنشاء
      </h2>
      <p className="text-gray-500 text-lg max-w-md">
        نحن نعمل حالياً على تطوير صفحة التقارير لإضافة المزيد من المزايا والتحسينات.
        <br />
        يرجى العودة لاحقًا 👷‍♂️
      </p>
      <a
        href="/"
        className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        العودة إلى الصفحة الرئيسية
      </a>
    </div>
  );
}
