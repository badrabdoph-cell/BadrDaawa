# BadrDaawa

منصة عربية RTL لدعوات الزفاف الرقمية الفاخرة.

## ماذا تحتوي النسخة

- موقع رئيسي: الرئيسية، القوالب، الأسعار، FAQ، التواصل، الطلب.
- 20 قالب زفاف بهويات مختلفة وملفات preview محلية.
- صفحة دعوة ديناميكية مثل `/badr-sarah-1`.
- RSVP للضيوف مع اسم، هاتف، عدد أفراد، وحالة حضور.
- لوحة Super Admin لإدارة الطلبات، الدعوات، القوالب، العملاء، النسخ الاحتياطي، والتحليلات.
- لوحة عميل لكل دعوة مع قائمة حضور، QR Code، وتصدير Excel/PDF.
- Prisma schema جاهز لـ PostgreSQL على Railway.
- GitHub Actions للنسخ الاحتياطي كل ساعة ونسخة يومية كاملة.

## التشغيل المحلي

```bash
pnpm install
pnpm generate:assets
cp .env.example .env
pnpm dev
```

افتح:

- الموقع: `http://localhost:3000`
- دعوة تجريبية: `http://localhost:3000/badr-sarah-1`
- لوحة عميل: `http://localhost:3000/badr-sarah-1/ad_3399`
- لوحة Admin: `http://localhost:3000/admin`

## قاعدة البيانات على Railway

1. أنشئ PostgreSQL database على Railway.
2. ضع `DATABASE_URL` في `.env` وفي Secrets الخاصة بالـ deployment.
3. نفذ:

```bash
pnpm db:generate
pnpm db:migrate
```

## النسخ الاحتياطي

لتشغيل Backup لوحة الإدارة كل 6 ساعات على Railway، أضف خدمة Cron مستقلة تستخدم `railway-cron.json`:

- اضبط `BACKUP_CRON_SECRET` في خدمة الموقع الرئيسية وفي الـ Scheduled Job بنفس القيمة.
- اضبط `BACKUP_CRON_URL=https://your-live-app-domain.example/api/cron/backup` على دومين التطبيق الحقيقي القابل للوصول.
- اجعل Start Command لخدمة الـ Cron هو `pnpm backup:trigger` وليس `pnpm start`.
- استخدم schedule `0 */6 * * *`.

يعيد endpoint `/api/cron/backup` كود `200` عند نجاح إنشاء نسخة Runtime Data وملفات العملاء، ويعيد `500` إذا فشل إنشاء النسخة. Runtime Backups لا ترفع إلى GitHub.

الاسترجاع Manual Only ولا يعمل تلقائياً من التطبيق أو من GitHub. راجع:

```bash
BACKUP_RESTORE.md
```

## PDF عربي

تم تضمين خط عربي مفتوح المصدر لإخراج PDF عربي كامل:

```text
public/fonts/NotoNaskhArabic-Regular.ttf
```

## نشر الإنتاج

- اربط المشروع بـ Railway أو Vercel.
- اضبط `NEXT_PUBLIC_SITE_URL` على دومين التطبيق الحقيقي.
- اضبط `DATABASE_URL`.
- اضبط `WHATSAPP_ORDER_PHONE=01011511561`.
- شغّل migrations قبل أول تشغيل.
