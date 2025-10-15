import React from "react";

export default function LoadingOverlay({ visible, text = "جارٍ تحميل البيانات..." }: { visible: boolean; text?: string }) {
  if (!visible) return null; // إلغاء التركيب بالكامل لمنع أي وميض
  return (
    <div className="fixed inset-0 z-40 grid place-items-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />
      <div className="relative card w-[90%] max-w-sm text-center animate-fade-in">
        <div className="flex items-center justify-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-[--color-primary] border-t-transparent animate-spin" />
          <div className="text-sm text-gray-700">{text}</div>
        </div>
      </div>
    </div>
  );
}
