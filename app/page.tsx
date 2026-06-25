import Link from "next/link";
import { cookies } from "next/headers";
import {
  BellRing,
  CalendarCheck,
  Check,
  Clock3,
  Eye,
  Headphones,
  HeartHandshake,
  Image,
  Link2,
  MapPin,
  MessageCircle,
  Music2,
  Palette,
  QrCode,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Star,
  UserCheck,
  UsersRound,
  Vote,
  WandSparkles,
  X,
} from "lucide-react";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { LiveVisitorNumber } from "@/components/LiveVisitorNumber";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getDraftHomeContent, getPublishedHomeContent } from "@/lib/home-content";
import { getHomePlatformStats } from "@/lib/home-stats";
import { getDraftHomePreviewSettings, getPublishedHomePreviewSettings } from "@/lib/preview-settings";
import { getDraftSiteSettings, getPublishedSiteSettings } from "@/lib/site-settings";
import { getWhatsAppOrderUrl } from "@/lib/utils";

const quickBenefits = [
  { title: "دعوة جاهزة للمشاركة", text: "لينك أنيق يتبعت على واتساب في ثواني.", icon: Send },
  { title: "تأكيد حضور RSVP", text: "الضيف يؤكد أو يعتذر من نفس الدعوة.", icon: UserCheck },
  { title: "لوكيشن وQR Code", text: "كل تفاصيل الوصول محفوظة في مكان واحد.", icon: QrCode },
  { title: "لوحة متابعة خاصة", text: "شوف الأسماء والأرقام والردود أول بأول.", icon: SlidersHorizontal },
];

const flowSteps = [
  { title: "اختار التصميم", text: "ابدأ من قالب قريب من ذوقكم.", icon: Palette },
  { title: "ابعت بيانات الفرح", text: "الأسماء، المعاد، القاعة، الصور، والموسيقى.", icon: MessageCircle },
  { title: "استلم لينك الدعوة", text: "لينك خاص جاهز للمشاركة مع QR Code.", icon: Link2 },
  { title: "تابع الحضور", text: "كل رد من المعازيم يظهر في لوحة واحدة.", icon: Eye },
];

const guestFeatures = [
  { title: "لينك خاص", text: "الضيف يفتح الدعوة من الموبايل بدون تحميل تطبيق.", icon: Link2 },
  { title: "QR Code", text: "مشاركة سهلة على الشاشة أو في المطبوعات.", icon: QrCode },
  { title: "لوكيشن القاعة", text: "العنوان والخريطة موجودين داخل الدعوة.", icon: MapPin },
  { title: "إضافة للتقويم", text: "تنبيه قبل الفرح بدل نسيان المعاد.", icon: CalendarCheck },
  { title: "موسيقى وصور", text: "دعوة تحس فعلا إنها تخصكم، مش صفحة عادية.", icon: Music2 },
];

const ownerFeatures = [
  { title: "مين شاف الدعوة", text: "اعرف التفاعل الحقيقي بدل التخمين.", icon: Eye },
  { title: "تأكيد الحضور", text: "ردود واضحة: هيحضر، مش هيحضر، أو لسه.", icon: Vote },
  { title: "كشف أسماء وأرقام", text: "كل بيانات الضيوف مرتبة وسهلة المراجعة.", icon: UsersRound },
  { title: "رسائل جماعية", text: "ابعت تذكير أو تنبيه لكل الضيوف مرة واحدة.", icon: BellRing },
  { title: "تعليقات بموافقتك", text: "ذكريات وكلمات تظهر بعد اعتمادك فقط.", icon: HeartHandshake },
];

const trustItems = [
  { title: "مناسب لكل المناسبات", text: "فرح، خطوبة، كتب كتاب، أو احتفال عائلي.", icon: Sparkles },
  { title: "بدون تطبيق", text: "يعمل من المتصفح مباشرة على أغلب الموبايلات.", icon: Smartphone },
  { title: "مشاركة واتساب", text: "اللينك جاهز للارسال للعيلة والصحاب.", icon: MessageCircle },
  { title: "خصوصية وتحكم", text: "لوحة خاصة وروابط واضحة لكل دور.", icon: ShieldCheck },
];

const previewPoints = [
  "الضيف يفتح الدعوة من اللينك مباشرة.",
  "يشوف الصور والموسيقى واللوكيشن في نفس التجربة.",
  "يأكد الحضور أو يعتذر بخطوة بسيطة.",
  "صاحب الدعوة يتابع الردود والأرقام من لوحة واحدة.",
];

const faqItems = [
  {
    question: "هل الضيوف يحتاجون تحميل تطبيق؟",
    answer: "لا. الدعوة تفتح من اللينك مباشرة على الموبايل أو الكمبيوتر.",
  },
  {
    question: "هل أقدر أعدل الدعوة بعد الإنشاء؟",
    answer: "نعم، تقدر تعدل البيانات والصور والتفاصيل حسب الباقة والإعدادات المتاحة.",
  },
  {
    question: "هل أقدر أعرف مين شاف الدعوة؟",
    answer: "الفكرة الأساسية إنك تتابع التفاعل والحضور من لوحة متابعة بدل ما تعتمد على التخمين.",
  },
  {
    question: "هل أقدر أرسل الدعوة على واتساب؟",
    answer: "نعم، الدعوة عبارة عن لينك خاص جاهز للمشاركة على واتساب أو أي تطبيق رسائل.",
  },
  {
    question: "هل يوجد QR Code؟",
    answer: "نعم، يمكن استخدام QR Code لتسهيل فتح الدعوة من أي موبايل.",
  },
  {
    question: "هل الدعوة تعمل على كل الموبايلات؟",
    answer: "تم تصميم التجربة لتعمل على المتصفحات الحديثة وتكون مريحة على الموبايل أولا.",
  },
];

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams?: Promise<{ broadcast?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const cookieStore = await cookies();
  const isAdminBroadcast = params.broadcast === "1" && (await verifyAdminSessionCookie(cookieStore.get(ADMIN_SESSION_COOKIE)?.value));
  const [previewSettings, content, siteSettings, platformStats] = await Promise.all([
    (isAdminBroadcast ? getDraftHomePreviewSettings() : getPublishedHomePreviewSettings()).catch(() => null),
    (isAdminBroadcast ? getDraftHomeContent() : getPublishedHomeContent()).catch(() => null),
    (isAdminBroadcast ? getDraftSiteSettings() : getPublishedSiteSettings()).catch(() => null),
    getHomePlatformStats().catch(() => null),
  ]);

  const previewTemplateSrc = `/templates/${previewSettings?.templateSlug || "featured-1"}/preview?silentPreview=1`;
  const showPreview = siteSettings?.homepage?.showPreview !== false;
  const showPricing = siteSettings?.homepage?.showPricing !== false;
  const heroMainTitle = content?.hero?.mainTitle || "دعوة فرح إلكترونية تعرفك مين شافها ومين هيحضر";
  const heroDescription = content?.hero?.description || "اختار تصميمك، ابعت اللينك للمعازيم، وتابع الحضور والرسائل واللوكيشن من لوحة واحدة.";
  const whatsappUrl = getWhatsAppOrderUrl("أريد طلب دعوة فرح إلكترونية من Wedding Daawa", siteSettings?.whatsappUrl);
  const stats = [
    { label: "دعوة منشأة", value: platformStats?.invitations || 116, suffix: "", icon: Palette },
    { label: "زيارة", value: platformStats?.views || 60062, suffix: "", icon: Eye },
    { label: "تسجيل حضور", value: platformStats?.confirmedRsvps || 8322, suffix: "", icon: UserCheck },
    { label: "Live", value: platformStats?.activeNow || 10, suffix: "", icon: Clock3, hint: "عدد الزوار في الوقت الحالي", live: true },
  ];
  const pricingRows = content?.pricing?.rows || [];
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Service",
    name: siteSettings?.siteName || "Wedding Daawa",
    description: siteSettings?.seo?.description || "دعوات زفاف رقمية مع RSVP وQR Code ومشاركة واتساب.",
    serviceType: "Digital wedding invitations",
    areaServed: "Egypt",
  });

  return (
    <div className="page-shell wd-home">
      {siteSettings?.announcement?.enabled !== false && (
        <AnnouncementBar
          text={siteSettings?.announcement?.text}
          ctaLabel={siteSettings?.announcement?.ctaLabel}
          ctaUrl={siteSettings?.announcement?.ctaUrl}
        />
      )}
      <SiteHeader />
      <main>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />

        <section className="wd-hero" aria-labelledby="home-hero-title">
          <div className="container wd-hero-grid">
            <div className="wd-hero-copy">
              <span className="wd-kicker" data-broadcast-id="home-content.hero.kicker">
                <Sparkles size={16} />
                {content?.hero?.kicker || "هنا تبدأ الحكاية"}
              </span>
              <h1 id="home-hero-title" data-broadcast-id="home-content.hero.mainTitle">{heroMainTitle}</h1>
              <p data-broadcast-id="home-content.hero.description">{heroDescription}</p>
              <div className="wd-hero-actions">
                <Link className="btn btn-gold btn-glow wd-primary-action" href="/templates" data-broadcast-id="home-content.hero.primaryCta">
                  <Palette size={19} />
                  {content?.hero?.primaryCta || "اختار التصميم"}
                </Link>
                <a className="btn btn-soft wd-secondary-action" href={whatsappUrl} target="_blank" rel="noreferrer" data-broadcast-id="home-content.hero.secondaryCta">
                  <MessageCircle size={19} />
                  {content?.hero?.secondaryCta || "اطلبها على واتساب"}
                </a>
              </div>
            </div>

            <div className="wd-hero-board" aria-label="ملخص تجربة الدعوة الرقمية">
              <div className="wd-board-header">
                <span>Wedding Daawa OS</span>
                <strong>يوم الفرح تحت السيطرة</strong>
              </div>
              <div className="wd-board-flow">
                {[
                  ["لينك الدعوة", "جاهز للمشاركة", Link2],
                  ["الضيف فتح", "تمت المشاهدة", Eye],
                  ["تأكيد الحضور", "الأسماء بتتجمع", UserCheck],
                  ["رسالة تذكير", "واتساب في الطريق", BellRing],
                ].map(([title, text, Icon]) => (
                  <div className="wd-board-row" key={title as string}>
                    <span>
                      <Icon size={18} />
                    </span>
                    <div>
                      <strong>{title as string}</strong>
                      <small>{text as string}</small>
                    </div>
                  </div>
                ))}
              </div>
              <div className="wd-board-footer">
                <span>بدون ورق. بدون زحمة. بدون تخمين.</span>
                <Sparkles size={16} />
              </div>
            </div>
          </div>
        </section>

        <section className="wd-value-strip" aria-label="مميزات سريعة">
          <div className="container wd-value-grid">
            {quickBenefits.map((item) => {
              const Icon = item.icon;
              return (
                <article className="wd-value-item" key={item.title}>
                  <span>
                    <Icon size={20} />
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.text}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="wd-section wd-flow-section" aria-labelledby="home-flow-title">
          <div className="container">
            <div className="wd-section-head">
              <span className="wd-kicker">الرحلة ببساطة</span>
              <h2 id="home-flow-title">من اختيار التصميم لحد آخر تأكيد حضور</h2>
            </div>
            <div className="wd-flow-grid">
              {flowSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <article className="wd-flow-card" key={step.title}>
                    <span className="wd-flow-number">{index + 1}</span>
                    <Icon size={24} />
                    <strong>{step.title}</strong>
                    <p>{step.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {showPreview ? (
          <section className="wd-section wd-preview-section" aria-labelledby="home-preview-title">
            <div className="container wd-preview-grid">
              <div className="wd-preview-copy">
                <span className="wd-kicker" data-broadcast-id="home-content.preview.eyebrow">{content?.preview?.eyebrow || "معاينة حية"}</span>
                <h2 id="home-preview-title" data-broadcast-id="home-content.preview.title">{content?.preview?.title || "شوف الدعوة وهي بتشتغل فعلا"}</h2>
                <p>المعاينة هنا مش ديكور. دي التجربة اللي هتوصل للضيف: فتح الدعوة، شاف التفاصيل، اختار الحضور، وكل حاجة اتسجلت عندك.</p>
                <ul className="wd-check-list">
                  {previewPoints.map((point) => (
                    <li key={point}>
                      <Check size={18} />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <div className="wd-preview-actions">
                  <Link className="btn btn-gold btn-glow" href="/badr-sarah-1" data-broadcast-id="home-content.preview.fullInviteCta">
                    <Eye size={18} />
                    {content?.preview?.fullInviteCta || "معاينة الدعوة كاملة"}
                  </Link>
                  <Link className="btn btn-soft" href="/templates" data-broadcast-id="home-content.preview.orderCta">
                    <WandSparkles size={18} />
                    {content?.preview?.orderCta || "استخدم هذا التصميم"}
                  </Link>
                </div>
              </div>
              <div className="wd-preview-phone" aria-label="معاينة مباشرة لقالب الدعوة">
                <span className="wd-preview-badge" data-broadcast-id="home-content.preview.badge">{content?.preview?.badge || "دعوة حية"}</span>
                {previewSettings?.mode === "image" && previewSettings?.imageUrl ? (
                  <img className="wd-preview-media" src={previewSettings.imageUrl} alt="معاينة صورة الدعوة" width={360} height={640} loading="lazy" decoding="async" />
                ) : previewSettings?.mode === "video" && previewSettings?.videoUrl ? (
                  <video className="wd-preview-media" src={previewSettings.videoUrl} muted loop playsInline autoPlay controls preload="metadata" />
                ) : (
                  <iframe src={previewTemplateSrc} title="معاينة مباشرة لقالب الدعوة" loading="lazy" sandbox="allow-scripts allow-same-origin" />
                )}
              </div>
            </div>
          </section>
        ) : null}

        <section id="features-section" className="wd-section wd-features-section" aria-labelledby="home-features-title">
          <div className="container">
            <div className="wd-section-head">
              <span className="wd-kicker">المميزات</span>
              <h2 id="home-features-title" data-broadcast-id="home-content.features.title">{content?.features?.title || "كل اللي الضيف يحتاجه، وكل اللي صاحب الفرح عايز يعرفه"}</h2>
            </div>
            <div className="wd-feature-groups">
              <FeatureGroup title="للضيوف" description="دعوة سهلة، واضحة، وبتفتح من أي موبايل." items={guestFeatures} />
              <FeatureGroup title="لصاحب الفرح" description="متابعة وتنظيم بدل الورق والأسئلة المتكررة." items={ownerFeatures} featured />
            </div>
          </div>
        </section>

        <section className="wd-section wd-trust-section" aria-label="أسباب الثقة">
          <div className="container wd-trust-grid">
            {trustItems.map((item) => {
              const Icon = item.icon;
              return (
                <article className="wd-trust-item" key={item.title}>
                  <Icon size={22} />
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="wd-section wd-stats-band" aria-label="ملخص سريع">
          <div className="container wd-stats-grid">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <article className="wd-stat" key={stat.label}>
                  <Icon size={22} />
                  <strong>
                    {"live" in stat ? <LiveVisitorNumber initial={stat.value} /> : stat.value.toLocaleString("en-US")}
                    {stat.suffix}
                  </strong>
                  <span>{stat.label}</span>
                  {"hint" in stat ? <small>{stat.hint}</small> : null}
                </article>
              );
            })}
          </div>
        </section>

        {showPricing ? (
          <section id="pricing-section" className="wd-section wd-pricing-section" aria-labelledby="home-pricing-title">
            <div className="container">
              <div className="wd-section-head">
                <span className="wd-kicker" data-broadcast-id="home-content.pricing.eyebrow">{content?.pricing?.eyebrow || "الباقات"}</span>
                <h2 id="home-pricing-title" data-broadcast-id="home-content.pricing.title">{content?.pricing?.title || "اختار الباقة المناسبة"}</h2>
                <p>جميع الباقات مجانية حاليًا لفترة محدودة أثناء الإطلاق التجريبي.</p>
              </div>
              <PricingComparison
                invitationPlanName={content?.pricing?.invitationPlanName || "الباقة الأساسية"}
                invitationPrice={content?.pricing?.invitationPrice || "100 ج"}
                plusPlanName={content?.pricing?.plusPlanName || "الباقة الكاملة"}
                plusPrice={content?.pricing?.plusPrice || "300 ج"}
                rows={pricingRows}
              />
            </div>
          </section>
        ) : null}

        <section className="wd-section wd-faq-section" aria-labelledby="home-faq-title">
          <div className="container wd-faq-grid">
            <div className="wd-faq-intro">
              <span className="wd-kicker">أسئلة قبل الطلب</span>
              <h2 id="home-faq-title">كل سؤال طبيعي قبل ما تبعت الدعوة للمعازيم</h2>
              <p>الهدف إن التجربة تبقى واضحة لك وللضيف من أول لينك.</p>
            </div>
            <div className="wd-faq-list">
              {faqItems.map((item) => (
                <details className="wd-faq-item" key={item.question}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="wd-final-cta" aria-labelledby="home-final-cta-title">
          <div className="container wd-final-cta-inner">
            <span className="wd-kicker">الخطوة الجاية</span>
            <h2 id="home-final-cta-title">جاهز تبعت دعوة فرح تليق بيومك؟</h2>
            <p>ابدأ من التصميم، أو ابعتلنا على واتساب ونرتب لك الدعوة من أولها لآخرها.</p>
            <div className="wd-hero-actions">
              <Link className="btn btn-gold btn-glow wd-primary-action" href="/templates">
                <Palette size={19} />
                اختار التصميم
              </Link>
              <a className="btn btn-soft wd-secondary-action" href={whatsappUrl} target="_blank" rel="noreferrer">
                <MessageCircle size={19} />
                كلّمنا على واتساب
              </a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function FeatureGroup({
  title,
  description,
  items,
  featured = false,
}: {
  title: string;
  description: string;
  items: Array<{ title: string; text: string; icon: typeof Link2 }>;
  featured?: boolean;
}) {
  return (
    <article className={`wd-feature-group${featured ? " wd-feature-group-featured" : ""}`}>
      <div className="wd-feature-group-head">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <div className="wd-feature-list">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div className="wd-feature-item" key={item.title}>
              <span>
                <Icon size={18} />
              </span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function PricingComparison({
  invitationPlanName,
  invitationPrice,
  plusPlanName,
  plusPrice,
  rows,
}: {
  invitationPlanName: string;
  invitationPrice: string;
  plusPlanName: string;
  plusPrice: string;
  rows: Array<{ id: string; feature: string; invitation: boolean; plus: boolean }>;
}) {
  const comparisonRows =
    rows.length > 0
      ? rows
      : [
          { id: "design", feature: "تصميم دعوة إلكترونية", invitation: true, plus: true },
          { id: "rsvp", feature: "تأكيد حضور RSVP", invitation: true, plus: true },
          { id: "qr", feature: "QR Code للمشاركة", invitation: true, plus: true },
          { id: "dashboard", feature: "لوحة متابعة خاصة", invitation: false, plus: true },
          { id: "broadcast", feature: "رسائل وتذكيرات واتساب", invitation: false, plus: true },
          { id: "analytics", feature: "إحصائيات المشاهدة والحضور", invitation: false, plus: true },
        ];

  return (
    <div className="wd-pricing-table-wrap">
      <div className="wd-pricing-table" role="table" aria-label="مقارنة الباقات">
        <div className="wd-pricing-row wd-pricing-row-head" role="row">
          <div role="columnheader">الميزة</div>
          <div role="columnheader">
            <strong data-broadcast-id="home-content.pricing.invitationPlanName">{invitationPlanName}</strong>
            <span>
              <s data-broadcast-id="home-content.pricing.invitationPrice">{invitationPrice}</s>
              مجانًا
            </span>
          </div>
          <div role="columnheader">
            <em>الأفضل</em>
            <strong data-broadcast-id="home-content.pricing.plusPlanName">{plusPlanName}</strong>
            <span>
              <s data-broadcast-id="home-content.pricing.plusPrice">{plusPrice}</s>
              مجانًا
            </span>
          </div>
        </div>
        {comparisonRows.map((row) => (
          <div className="wd-pricing-row" role="row" key={row.id}>
            <div role="cell" data-broadcast-id={`home-content.pricing.rows.${row.id}.feature`}>{row.feature}</div>
            <div role="cell" aria-label={row.invitation ? "متاح" : "غير متاح"}>
              {row.invitation ? <Check size={18} /> : <X size={18} />}
            </div>
            <div role="cell" aria-label={row.plus ? "متاح" : "غير متاح"}>
              {row.plus ? <Check size={18} /> : <X size={18} />}
            </div>
          </div>
        ))}
      </div>
      <div className="wd-pricing-actions">
        <Link className="btn btn-soft" href="/templates">
          <Sparkles size={18} />
          ابدأ بالأساسية
        </Link>
        <Link className="btn btn-gold btn-glow" href="/templates">
          <Star size={18} />
          اختار الكاملة
        </Link>
      </div>
    </div>
  );
}
