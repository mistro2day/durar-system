/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  // أضف أي متغيرات بيئية ثانية تستخدمها من .env هنا
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
