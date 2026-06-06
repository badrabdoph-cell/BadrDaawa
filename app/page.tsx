import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#2C2C2C] font-sans antialiased selection:bg-amber-200 dir=rtl" dir="rtl">
      
      {/* 1. القائمة العلوية التفاعلية (Navbar) */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#FAF9F6]/80 border-b border-amber-100 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 bg-clip-text text-transparent tracking-wide">
              بدر للدعوات الرقمية
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 font-medium text-gray-700">
            <Link href="#features" className="hover:text-amber-600 transition-colors">المميزات</Link>
            <Link href="#templates" className="hover:text-amber-600 transition-colors">القوالب الفاخرة</Link>
            <Link href="#pricing" className="hover:text-amber-600 transition-colors">الأسعار</Link>
            <Link href="#faq" className="hover:text-amber-600 transition-colors">الأسئلة الشائعة</Link>
          </div>

          <div>
            <Link href="#pricing" className="relative inline-flex items-center justify-center px-6 py-3 overflow-hidden font-medium text-white transition-all duration-300 bg-gradient-to-r from-amber-500 to-amber-700 rounded-full shadow-lg group hover:shadow-amber-500/30 hover:scale-105 active:scale-95">
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-amber-600 to-amber-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              <span className="relative">أنشئ دعوتك الآن</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* 2. قسم البطولة البراق (Hero Section) */}
      <section className="relative overflow-hidden py-20 lg:py-32 bg-gradient-to-b from-amber-50/50 via-transparent to-transparent">
        {/* خلفية براقة بلمسات ذهبية متناثرة */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none opacity-40">
          <div className="absolute top-12 left-10 w-72 h-72 bg-amber-200 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-yellow-100 rounded-full blur-[150px]"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          <div className="lg:col-span-7 text-center lg:text-right space-y-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold bg-amber-100/60 text-amber-800 border border-amber-200/50 backdrop-blur-sm animate-pulse">
              ✨ الجيل الجديد من دعوات الزفاف الفاخرة
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight">
              خلّد ذكرى ليلتك الكبرى بـ <span className="bg-gradient-to-l from-amber-600 to-amber-500 bg-clip-text text-transparent">دعوة رقمية ملكية</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              تخلّص من مشاق الدعوات الورقية وتكلفتها. صمم دعوة زفاف تفاعلية ساحرة، تليق بفخامة حفلكم، مع ميزة تأكيد حضور الضيوف الفوري ومشاركة أدق تفاصيل فرحتكم بلمسة عصرية.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
              <Link href="#templates" className="px-8 py-4 text-center rounded-full bg-slate-900 text-white font-semibold shadow-xl hover:bg-slate-800 hover:scale-105 transition-all duration-300">
                تصفح القوالب الحية
              </Link>
              <Link href="#features" className="px-8 py-4 text-center rounded-full bg-white text-gray-800 font-semibold border border-gray-200 shadow-sm hover:bg-gray-50 hover:border-amber-300 transition-all duration-300">
                اكتشف المميزات الذكية
              </Link>
            </div>
          </div>

          {/* محاكاة حية تفاعلية لجوال يعرض قالب زفاف (Live Preview Mockup) */}
          <div className="lg:col-span-5 flex justify-center relative">
            <div className="relative w-[290px] h-[580px] bg-slate-900 rounded-[40px] p-3 shadow-[0_25px_60px_-15px_rgba(180,140,50,0.3)] border-4 border-slate-800">
              {/* شاشة الجوال الداخلية */}
              <div className="w-full h-full bg-[#FCFBF7] rounded-[32px] overflow-hidden relative flex flex-col justify-between p-6 border border-amber-100">
                {/* زينة القالب العلوية */}
                <div className="text-center space-y-4 pt-8">
                  <span className="text-xs tracking-[0.2em] text-amber-600 font-bold block">SAVE THE DATE</span>
                  <div className="w-8 h-[1px] bg-amber-300 mx-auto"></div>
                  <h3 className="text-2xl font-serif text-gray-900 font-medium">بدر & Sara</h3>
                  <p className="text-[11px] text-gray-500">نصنع معاً بداية لقصة حب أبدية</p>
                </div>

                {/* تفاصيل القالب الوسطى */}
                <div className="bg-amber-50/60 border border-amber-100/70 rounded-2xl p-4 text-center space-y-2 backdrop-blur-sm shadow-sm">
                  <p className="text-xs text-amber-900 font-semibold">قاعة الملكة المفتوحة</p>
                  <p className="text-[10px] text-gray-500">التاريخ: الجمعة القادم الساعة 8 مساءً</p>
                  <div className="inline-block px-3 py-1 bg-amber-600 text-white text-[10px] rounded-full font-medium shadow-sm">
                    موقع القاعة (GPS) 📍
                  </div>
                </div>

                {/* زر تأكيد الحضور السفلي مع ترك مساحة نظيفة بالكامل أسفله */}
                <div className="space-y-4 pb-4">
                  <button className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-600/10">
                    تأكيد حضور الحفل (RSVP)
                  </button>
                  {/* مساحة سفلية فارغة ونظيفة ومصممة خصيصاً لوضع العلامات المائية باحترافية تامّة ودون تداخل */}
                  <div className="h-6 w-full opacity-0">Watermark Space</div>
                </div>
              </div>
              {/* كاميرا الجوال العلوية (Notch) */}
              <div className="absolute top-5 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-900 rounded-full"></div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. شبكة المميزات الذكية التفاعلية (Features Grid) */}
      <section id="features" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">مزايا حصرية تجعل دعوتك استثنائية</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">كل ما تحتاجه لإدارة ضيوفك وإبهارهم متوفر في لوحة تحكم واحدة ذكية.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: "تأكيد حضور فوري (RSVP)", desc: "يتلقى المدعوون خيار تأكيد الحضور مع تحديد عدد المرافقين بدقة متناهية.", icon: "✍️" },
              { title: "خرائط وقاعات دقيقة", desc: "ربط مباشر بموقع القاعة الجغرافي عبر خرائط Google لسهولة الوصول المباشر.", icon: "📍" },
              { title: "لوحة تحكم ذكية للعميل", desc: "تابع قوائم ضيوفك لحظة بلحظة مع إمكانية تصدير البيانات لملفات Excel و PDF بكبسة زر.", icon: "📊" },
              { title: "أمان وتنظيم بـ QR Code", desc: "رمز استجابة سريع لكل ضيف يضمن سهولة التحقق من الأسماء عند بوابات القاعة.", icon: "🔒" }
            ].map((feature, idx) => (
              <div key={idx} className="group p-8 rounded-2xl bg-[#FAF9F6] border border-amber-100/50 transition-all duration-300 hover:bg-white hover:shadow-[0_15px_40px_-10px_rgba(217,119,6,0.12)] hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl bg-amber-100/50 flex items-center justify-center text-2xl mb-6 group-hover:bg-amber-600 group-hover:text-white transition-colors duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. معرض القوالب الفاخرة المطور (Live Templates Showcase) */}
      <section id="templates" className="py-24 bg-gradient-to-b from-white to-amber-50/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
            <div className="space-y-4 text-center md:text-right">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">اختر هوية دعوتك من تشكيلتنا الملكية</h2>
              <p className="text-gray-500 max-w-xl">20 قالب زفاف مصمم بأعلى معايير الأناقة الرقمية لتناسب كافة الأذواق الفاخرة.</p>
            </div>
            <div className="flex justify-center gap-2">
              <button className="px-5 py-2.5 text-sm font-medium rounded-full bg-amber-600 text-white shadow-sm">الكل</button>
              <button className="px-5 py-2.5 text-sm font-medium rounded-full bg-white text-gray-600 border border-gray-200 hover:border-amber-300">كلاسيك</button>
              <button className="px-5 py-2.5 text-sm font-medium rounded-full bg-white text-gray-600 border border-gray-200 hover:border-amber-300">مودرن فاخر</button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((item) => (
              <div key={item} className="group rounded-3xl bg-white border border-amber-100 overflow-hidden shadow-sm transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:-translate-y-1.5">
                <div className="relative h-72 bg-gradient-to-br from-amber-50 to-amber-100/50 flex items-center justify-center overflow-hidden">
                  {/* تأثير بريق متدرج عند التمرير على الكارت */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="text-center p-6 transform group-hover:scale-105 transition-transform duration-500">
                    <span className="text-4xl block mb-2">✨</span>
                    <h4 className="text-xl font-serif font-semibold text-gray-800">قالب الملكية الفاخرة {item}</h4>
                  </div>
                  <span className="absolute top-4 right-4 px-3 py-1 text-xs font-semibold bg-amber-600 text-white rounded-full">الأكثر طلباً</span>
                </div>
                <div className="p-6 flex items-center justify-between bg-white border-t border-gray-50">
                  <div>
                    <h5 className="font-bold text-gray-900">هوية الزهور والذهب</h5>
                    <p className="text-xs text-gray-400">تأثيرات حركة ناعمة وموسيقى هادئة</p>
                  </div>
                  <Link href="/badr-sara-1" className="px-4 py-2 text-xs font-bold text-amber-700 bg-amber-50 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-all duration-300">
                    معاينة حية ⚡
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. قسم باقات الأسعار المطور (Pricing Tiers) */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">استثمر في ليلتك الكبرى بذكاء</h2>
            <p className="text-gray-500 max-w-xl mx-auto">باقات مرنة ومميزات متكاملة دون تكاليف خفية أو مصاريف طباعة باهظة.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch">
            {/* الباقة الفضية */}
            <div className="border border-gray-100 rounded-3xl p-8 bg-white flex flex-col justify-between shadow-sm hover:border-amber-200 transition-all">
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-gray-700">الباقة الفضية</h4>
                <div className="flex items-baseline gap-1 text-gray-950">
                  <span className="text-4xl font-extrabold tracking-tight">1,500</span>
                  <span className="text-sm font-semibold">ج.م</span>
                </div>
                <p className="text-sm text-gray-500">مثالية للحفلات العائلية البسيطة والراقية.</p>
                <hr className="border-gray-100" />
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-center gap-2">✔️ اختيار قالب واحد ثابت</li>
                  <li className="flex items-center gap-2">✔️ تأكيد حضور حتى 100 ضيف</li>
                  <li className="flex items-center gap-2">✔️ رابط مخصص للدعوة</li>
                  <li className="flex items-center gap-2">✔️ موقع القاعة الجغرافي GPS</li>
                </ul>
              </div>
              <Link href="https://wa.me/01011511561" className="mt-8 block w-full py-3 text-center text-sm font-bold bg-gray-50 text-gray-900 rounded-xl hover:bg-amber-50 hover:text-amber-700 transition-colors">
                اطلب الباقة الآن
              </Link>
            </div>

            {/* الباقة الماسية (المميزة) */}
            <div className="border-2 border-amber-500 rounded-3xl p-8 bg-[#FAF9F6] flex flex-col justify-between shadow-xl shadow-amber-600/5 relative transform md:-translate-y-4">
              <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
                الأكثر مبيعاً ✨
              </span>
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-amber-900">الباقة الماسية الملكية</h4>
                <div className="flex items-baseline gap-1 text-gray-950">
                  <span className="text-5xl font-extrabold tracking-tight">3,500</span>
                  <span className="text-sm font-semibold">ج.م</span>
                </div>
                <p className="text-sm text-amber-800/80">التجربة الكاملة والشاملة لزفاف أسطوري وبراق.</p>
                <hr className="border-amber-200/50" />
                <ul className="space-y-3 text-sm text-gray-700">
                  <li className="flex items-center gap-2">✨ قوالب حركية تفاعلية بالكامل</li>
                  <li className="flex items-center gap-2">✨ تأكيد حضور عدد غير محدود من الضيوف</li>
                  <li className="flex items-center gap-2">✨ لوحة تحكم ذكية للعميل لتصدير البيانات</li>
                  <li className="flex items-center gap-2">✨ نظام الأمان المطور عبر الـ QR Code</li>
                  <li className="flex items-center gap-2">✨ إضافة معرض صور وخلفية موسيقية فاخرة</li>
                </ul>
              </div>
              <Link href="https://wa.me/01011511561" className="mt-8 block w-full py-3.5 text-center text-sm font-bold bg-gradient-to-r from-amber-500 to-amber-700 text-white rounded-xl shadow-md hover:shadow-amber-600/20 hover:scale-[1.02] transition-all">
                احجز باقتك الملكية فوراً
              </Link>
            </div>

            {/* الباقة الذهبية */}
            <div className="border border-gray-100 rounded-3xl p-8 bg-white flex flex-col justify-between shadow-sm hover:border-amber-200 transition-all">
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-gray-700">الباقة الذهبية</h4>
                <div className="flex items-baseline gap-1 text-gray-950">
                  <span className="text-4xl font-extrabold tracking-tight">2,300</span>
                  <span className="text-sm font-semibold">ج.م</span>
                </div>
                <p className="text-sm text-gray-500">التوازن المثالي بين الميزات المتقدمة والسعر المدروس.</p>
                <hr className="border-gray-100" />
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-center gap-2">✔️ قوالب متحركة مميزة</li>
                  <li className="flex items-center gap-2">✔️ تأكيد حضور حتى 300 ضيف</li>
                  <li className="flex items-center gap-2">✔️ لوحة تحكم العميل لمراقبة الأسماء</li>
                  <li className="flex items-center gap-2">✔️ عداد تنازلي وموقع القاعة الجغرافي</li>
                </ul>
              </div>
              <Link href="https://wa.me/01011511561" className="mt-8 block w-full py-3 text-center text-sm font-bold bg-gray-50 text-gray-900 rounded-xl hover:bg-amber-50 hover:text-amber-700 transition-colors">
                اطلب الباقة الآن
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. قسم الأسئلة الشائعة (FAQ) المنظم */}
      <section id="faq" className="py-24 bg-[#FAF9F6]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl font-bold text-gray-900">كل ما يدور في ذهنك حول الدعوات الرقمية</h2>
          </div>

          <div className="space-y-4">
            {[
              { q: "كيف يستلم الضيوف الدعوات؟", a: "بمجرد إتمام تصميم الدعوة، نمنحك رابطاً مخصصاً مشفراً بدقة فائقة. يمكنك إرساله بكبسة زر واحدة عبر WhatsApp أو أي منصة تواصل اجتماعي لجميع ضيوفك." },
              { q: "هل يمكنني تعديل بيانات الدعوة بعد إطلاقها؟", a: "نعم وبكل تأكيد، من خلال لوحة التحكم الخاصة بك يمكنك تعديل التواريخ، التوقيت، أو أي تفاصيل أخرى فوراً ودون الحاجة لتغيير الرابط المستلم." },
              { q: "كيف تعمل ميزة تأكيد الحضور (RSVP)؟", a: "عندما يفتح الضيف الرابط، يظهر له نموذج أنيق يطلب منه تأكيد الحضور والمرافقين. البيانات تصلك فوراً وتُحدث تلقائياً في لوحة تحكم العميل الخاصة بك." }
            ].map((faq, idx) => (
              <details key={idx} className="group border border-amber-100/60 rounded-2xl bg-white p-6 [&_summary::-webkit-details-marker]:hidden cursor-pointer shadow-sm transition-all duration-300 open:shadow-md">
                <summary className="flex items-center justify-between gap-1.5 text-gray-900">
                  <h5 className="font-bold text-lg">{faq.q}</h5>
                  <span className="shrink-0 rounded-full bg-amber-50 p-1.5 text-amber-600 transition duration-300 group-open:-rotate-180">
                    👇
                  </span>
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-gray-600 border-t border-gray-50 pt-4">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 7. تذييل الصفحة الفاخر والمدروس (Footer) */}
      <footer className="bg-slate-900 text-white py-12 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-right relative z-10">
          <div className="space-y-4">
            <h4 className="text-xl font-bold bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">منصة بدر للدعوات</h4>
            <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto md:mx-0">شريكك الرقمي المثالي لتنظيم المناسبات السعيدة بأعلى معايير الرقي والأناقة التقنية الحديثة.</p>
          </div>
          <div className="flex flex-col gap-2 text-sm text-gray-400">
            <span className="font-bold text-white mb-2">روابط سريعة</span>
            <Link href="#features" className="hover:text-amber-400 transition-colors">المميزات</Link>
            <Link href="#templates" className="hover:text-amber-400 transition-colors">قوالب الزفاف</Link>
            <Link href="#pricing" className="hover:text-amber-400 transition-colors">باقات الأسعار</Link>
          </div>
          <div className="space-y-4">
            <span className="font-bold text-white block">تواصل معنا مباشر</span>
            <p className="text-xs text-gray-400">فريق الدعم الفني جاهز لخدمتكم وتجهيز قوالبكم على مدار الساعة.</p>
            <Link href="https://wa.me/01011511561" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-md hover:bg-emerald-700 transition-all">
              تواصل عبر الواتساب الفوري 💬
            </Link>
          </div>
        </div>
        
        {/* شريط الحقوق والمساحة النظيفة المخصصة بالكامل للعلامة المائية لتجنب أي تداخل */}
        <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-slate-800 text-center text-xs text-gray-500 space-y-4">
          <p>© {new Date().getFullYear()} بدر للدعوات الرقمية. جميع الحقوق محفوظة.</p>
          {/* مساحة فارغة مخصصة ونظيفة ومصممة بعناية لترك مسافة للعلامة المائية لضمان عدم تداخلها مع أي كود أو روابط */}
          <div className="h-8 w-full opacity-0">Watermark Reserved Area</div>
        </div>
      </footer>

    </div>
  );
}