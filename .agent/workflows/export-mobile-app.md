---
description: كيفية تصدير تطبيق الجوال (Android & iOS)
---

لتصدير التطبيق واستخراج ملف APK أو رفعه للمتجر، نستخدم خدمة Expo Application Services (EAS). اتبع الخطوات التالية:

### 1. تثبيت أدوات EAS
افتح تيرمينال جديداً وقم بتثبيت EAS CLI عالمياً (إذا لم تقم بذلك مسبقاً):
```bash
npm install -g eas-cli
```

### 2. تسجيل الدخول
قم بتسجيل الدخول إلى حساب Expo الخاص بك:
```bash
eas login
```

### 3. تهيئة المشروع (لأول مرة فقط)
داخل مجلد `durar-mobile` قم بتشغيل:
```bash
eas build:configure
```

### 4. بناء التطبيق (Build)

**لنظام أندرويد (ملف APK للتجربة):**
```bash
eas build --platform android --profile preview
```
*هذا سيعطيك ملف APK يمكنك تثبيته مباشرة على هاتفك.*

**لنظام أندرويد (ملف AAB للمتجر):**
```bash
eas build --platform android --profile production
```

**لنظام iOS:**
*(يتطلب اشتراك Apple Developer)*
```bash
eas build --platform ios
```

### 5. متابعة البناء
بعد تشغيل الأمر، سيعطيك رابطاً لمتابعة عملية البناء على سيرفرات Expo. عند الانتهاء، ستجد زر تحميل الملف (Download).

---
**ملاحظة:** تأكد من تحديث رابط الـ API في ملف `services/api.ts` ليكون رابط السيرفر المباشر (Production URL) بدلاً من `localhost`.
