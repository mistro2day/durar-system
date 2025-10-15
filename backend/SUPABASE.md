نقل قاعدة البيانات إلى Supabase (Postgres)

ملخص سريع
- لا تغييرات على الفرونت إند. الباك إند (Express + Prisma) يتصل بـ Supabase كقاعدة Postgres.
- حدّث متغيرات البيئة، ثم انشر المايجريشنز، وبعدها شغّل السيرفر.

الخطوة 1) إعداد الاتصال
1) أنشئ مشروعك في Supabase وخذ Connection string لقاعدة Postgres.
2) انسخ الملف `.env.supabase.example` إلى `.env` وعدّل القيم:
   - `DATABASE_URL` عبر PgBouncer للاستخدام اليومي.
   - `DIRECT_URL` اتصال مباشر لعمليات Prisma Migrate.

مثال:
`DATABASE_URL=postgresql://postgres:<PASSWORD>@db.<PROJECT-REF>.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1`
`DIRECT_URL=postgresql://postgres:<PASSWORD>@db.<PROJECT-REF>.supabase.co:5432/postgres`

الخطوة 2) تثبيت الاعتمادات
```
cd durar-system/backend
npm i
```

الخطوة 3) إنشاء الجداول على Supabase
- الخيار الموصى به (Prisma):
```
npm run db:migrate:deploy
```

- بديل (SQL مباشر): افتح SQL Editor في Supabase ونفّذ محتوى الملف:
`durar-system/backend/supabase-init.sql`

ملاحظة: استخدم أحد الخيارين فقط كي لا يحصل تضارب.

الخطوة 4) تهيئة مستخدم أدمن (اختياري)
```
npm run seed:admin
```
أو اختر بريد/كلمة مرور عبر متغيرات البيئة `ADMIN_EMAIL` و`ADMIN_PASSWORD`.

الخطوة 5) استيراد بياناتك (اختياري)
- من قاعدة محلية Postgres (مثال: localhost:5434):
```
pg_dump --data-only --column-inserts --no-owner --no-privileges \
  -h localhost -p 5434 -U postgres durar_realestate > data.sql

psql "postgresql://postgres:<PASSWORD>@db.<PROJECT-REF>.supabase.co:5432/postgres" \
  -f data.sql
```

- أو استيراد عينات الفندق:
```
npm run db:import:samples
```

الخطوة 6) تشغيل الباك إند
```
npm run dev
# تحقق صحي: GET http://localhost:8080/api/health
```

أوامر مفيدة
- `npm run db:generate` لتوليد عميل Prisma.
- `npm run db:migrate:deploy` لتطبيق المايجريشنز على Supabase.
- `npm run db:studio` لتصفح البيانات (محليًا).
- `npm run db:check` اختبار سريع لوجود الأدمن.
- `npm run db:import:samples` استيراد عينات الفندق.

ملاحظات
- ملف `prisma/schema.prisma` يطابق بنية `supabase-init.sql`. استخدم Prisma لمزامنة المخطط ما لم تحتاج تشغيل SQL يدوي.
- لا حاجة لأي تغيير على الفرونت إند طالما يستهلك API من الباك إند.

