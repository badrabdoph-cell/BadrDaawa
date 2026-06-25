import React from "react";
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
import { DEFAULT_SECTION_ORDER } from "@/lib/home-sections";

const quickBenefits = [
  { id: "quick-1", title: "دعوة جاهزة للمشاركة", text: "لينك أنيق يتبعت على واتساب في ثواني.", icon: Send },
  { id: "quick-2", title: "تأكيد حضور RSVP", text: "الضيف يؤكد أو يعتذر من نفس الدعوة.", icon: UserCheck },
  { id: "quick-3", title: "لوكيشن وQR Code", text: "كل تفاصيل الوصول محفوظة في مكان واحد.", icon: QrCode },
  { id: "quick-4", title: "لوحة متابعة خاصة", text: "شوف الأسماء والأرقام والردود أول بأول.", icon: SlidersHorizontal },
];

const flowSteps = [
  { id: "flow-1", title: "اختار التصميم", text: "ابدأ من قالب قريب من ذوقكم.", icon: Palette },
  { id: "flow-2", title: "ابعت بيانات الفرح", text: "الأسماء، المعاد، القاعة، الصور، والموسيقى.", icon: MessageCircle },
  { id: "flow-3", title: "استلم لينك الدعوة", text: "لينك خاص جاهز للمشاركة مع QR Code.", icon: Link2 },
  { id: "flow-4", title: "تابع الحضور", text: "كل رد من المعازيم يظهر في لوحة واحدة.", icon: Eye },
];

const guestFeatures = [
  { id: "guest-1", title: "لينك خاص", text: "الضيف يفتح الدعوة من الموبايل بدون تحميل تطبيق.", icon: Link2 },
  { id: "guest-2", title: "QR Code", text: "مشاركة سهلة على الشاشة أو في المطبوعات.", icon: QrCode },
  { id: "guest-3", title: "لوكيشن القاعة", text: "العنوان والخريطة موجودين داخل الدعوة.", icon: MapPin },
  { id: "guest-4", title: "إضافة للتقويم", text: "تنبيه قبل الفرح بدل نسيان المعاد.", icon: CalendarCheck },
  { id: "guest-5", title: "موسيقى وصور", text: "دعوة تحس فعلا إنها تخصكم، مش صفحة عادية.", icon: Music2 },
];

const ownerFeatures = [
  { id: "owner-1", title: "مين شاف الدعوة", text: "اعرف التفاعل الحقيقي بدل التخمين.", icon: Eye },
  { id: "owner-2", title: "تأكيد الحضور", text: "ردود واضحة: هيحضر، مش هيحضر، أو لسه.", icon: Vote },
  { id: "owner-3", title: "كشف أسماء وأرقام", text: "كل بيانات الضيوف مرتبة وسهلة المراجعة.", icon: UsersRound },
  { id: "owner-4", title: "رسائل جماعية", text: "ابعت تذكير أو تنبيه لكل الضيوف مرة واحدة.", icon: BellRing },
  { id: "owner-5", title: "تعليقات بموافقتك", text: "ذكريات وكلمات تظهر بعد اعتمادك فقط.", icon: HeartHandshake },
];

const trustItems = [
  { id: "trust-1", title: "مناسب لكل المناسبات", text: "فرح، خطوبة، كتب كتاب، أو احتفال عائلي.", icon: Sparkles },
  { id: "trust-2", title: "بدون تطبيق", text: "يعمل من المتصفح مباشرة على أغلب الموبايلات.", icon: Smartphone },
  { id: "trust-3", title: "مشاركة واتساب", text: "اللينك جاهز للارسال للعيلة والصحاب.", icon: MessageCircle },
  { id: "trust-4", title: "خصوصية وتحكم", text: "لوحة خاصة وروابط واضحة لكل دور.", icon: ShieldCheck },
];

const previewPoints = [
  "الضيف يفتح الدعوة من اللينك مباشرة.",
  "يشوف الصور والموسيقى واللوكيشن في نفس التجربة.",
  "يأكد الحضور أو يعتذر بخطوة بسيطة.",
  "صاحب الدعوة يتابع الردود والأرقام من لوحة واحدة.",
];

const faqItems = [
  { id: "faq-1", question: "هل الضيوف يحتاجون تحميل تطبيق؟", answer: "لا. الدعوة تفتح من اللينك مباشرة على الموبايل أو الكمبيوتر." },
  { id: "faq-2", question: "هل أقدر أعدل الدعوة بعد الإنشاء؟", answer: "نعم، تقدر تعدل البيانات والصور والتفاصيل حسب الباقة والإعدادات المتاحة." },
  { id: "faq-3", question: "هل أقدر أعرف مين شاف الدعوة؟", answer: "الفكرة الأساسية إنك تتابع التفاعل والحضور من لوحة متابعة بدل ما تعتمد على التخمين." },
  { id: "faq-4", question: "هل أقدر أرسل الدعوة على واتساب؟", answer: "نعم، الدعوة عبارة عن لينك خاص جاهز للمشاركة على واتساب أو أي تطبيق رسائل." },
  { id: "faq-5", question: "هل يوجد QR Code؟", answer: "نعم، يمكن استخدام QR Code لتسهيل فتح الدعوة من أي موبايل." },
  { id: "faq-6", question: "هل الدعوة تعمل على كل الموبايلات؟", answer: "تم تصميم التجربة لتعمل على المتصفحات الحديثة وتكون مريحة على الموبايل أولا." },
];

function withFallbackIcons<T extends { id?: string; icon?: typeof Link2 }>(
  source: T[] | undefined,
  fallback: Array<T & { icon: typeof Link2 }>,
) {
  const items = source?.length ? source : fallback;
  return items.map((item, index) => {
    const fallbackItem = fallback.find((candidate) => candidate.id && item.id && candidate.id === item.id) || fallback[index];
    return { ...item, icon: item.icon || fallbackItem?.icon || Link2 };
  });
}

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
  const sectionOrder = siteSettings?.homepage?.sectionOrder?.length ? siteSettings.homepage.sectionOrder : DEFAULT_SECTION_ORDER;
  const heroMainTitle = content?.hero?.mainTitle || "دعوة فرح إلكترونية تعرفك مين شافها ومين هيحضر";
  const heroDescription = content?.hero?.description || "اختار تصميمك، ابعت اللينك للمعازيم، وتابع الحضور والرسائل واللوكيشن من لوحة واحدة.";
  const whatsappUrl = getWhatsAppOrderUrl("أريد طلب دعوة فرح إلكترونية من Wedding Daawa", siteSettings?.whatsappUrl);
  const quickBenefitItems = withFallbackIcons(content?.quickBenefits, quickBenefits);
  const flowStepItems = withFallbackIcons(content?.flowSteps, flowSteps);
  const guestFeatureItems = withFallbackIcons(content?.guestFeatures, guestFeatures);
  const ownerFeatureItems = withFallbackIcons(content?.ownerFeatures, ownerFeatures);
  const trustContentItems = withFallbackIcons(content?.trustItems, trustItems);
  const previewPointItems = content?.previewPoints?.length ? content.previewPoints : previewPoints;
  const faqContentItems = content?.faqItems?.length ? content.faqItems : faqItems;
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

  const sections: Record<string, () => React.ReactNode> = {
    "hero": () => (
      <section className="wd-hero" aria-labelledby="home-hero-title" data-home-section="hero">
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
              <span data-broadcast-id="home-content.hero.boardTitle">{content?.hero?.boardTitle || "Wedding Daawa OS"}</span>
              <strong data-broadcast-id="home-content.hero.boardSubtitle">{content?.hero?.boardSubtitle || "يوم الفرح تحت السيطرة"}</strong>
            </div>
            <div className="wd-board-flow">
              {[
                [content?.hero?.flow?.linkInviteTitle || "لينك الدعوة", content?.hero?.flow?.linkInviteText || "جاهز للمشاركة", Link2, "home-content.hero.flow.linkInviteTitle", "home-content.hero.flow.linkInviteText"],
                [content?.hero?.flow?.guestOpenedTitle || "الضيف فتح", content?.hero?.flow?.guestOpenedText || "تمت المشاهدة", Eye, "home-content.hero.flow.guestOpenedTitle", "home-content.hero.flow.guestOpenedText"],
                [content?.hero?.flow?.rsvpTitle || "تأكيد الحضور", content?.hero?.flow?.rsvpText || "الأسماء بتتجمع", UserCheck, "home-content.hero.flow.rsvpTitle", "home-content.hero.flow.rsvpText"],
                [content?.hero?.flow?.reminderTitle || "رسالة تذكير", content?.hero?.flow?.reminderText || "واتساب في الطريق", BellRing, "home-content.hero.flow.reminderTitle", "home-content.hero.flow.reminderText"],
              ].map(([title, text, Icon, titleId, textId]) => (
                <div className="wd-board-row" key={titleId as string}>
                  <span>
                    <Icon size={18} />
                  </span>
                  <div>
                    <strong data-broadcast-id={titleId as string}>{title as string}</strong>
                    <small data-broadcast-id={textId as string}>{text as string}</small>
                  </div>
                </div>
              ))}
            </div>
            <div className="wd-board-footer">
              <span data-broadcast-id="home-content.hero.boardFooter">{content?.hero?.boardFooter || "بدون ورق. بدون زحمة. بدون تخمين."}</span>
              <Sparkles size={16} />
            </div>
          </div>
        </div>
      </section>
    ),
    "quick-benefits": () => (
      <section className="wd-value-strip" aria-label="مميزات سريعة" data-home-section="quick-benefits">
        <div className="container wd-value-grid">
          {quickBenefitItems.map((item) => {
            const Icon = item.icon;
            return (
              <article className="wd-value-item" key={item.id || item.title}>
                <span>
                  <Icon size={20} />
                </span>
                <div>
                  <strong data-broadcast-id={item.id ? `home-content.quickBenefits.${item.id}.title` : undefined}>{item.title}</strong>
                  <p data-broadcast-id={item.id ? `home-content.quickBenefits.${item.id}.text` : undefined}>{item.text}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    ),
    "flow": () => (
      <section className="wd-section wd-flow-section" aria-labelledby="home-flow-title" data-home-section="flow">
        <div className="container">
          <div className="wd-section-head">
            <span className="wd-kicker">الرحلة ببساطة</span>
            <h2 id="home-flow-title">من اختيار التصميم لحد آخر تأكيد حضور</h2>
          </div>
          <div className="wd-flow-grid">
            {flowStepItems.map((step, index) => {
              const Icon = step.icon;
              return (
                <article className="wd-flow-card" key={step.id || step.title}>
                  <span className="wd-flow-number">{index + 1}</span>
                  <Icon size={24} />
                  <strong data-broadcast-id={step.id ? `home-content.flowSteps.${step.id}.title` : undefined}>{step.title}</strong>
                  <p data-broadcast-id={step.id ? `home-content.flowSteps.${step.id}.text` : undefined}>{step.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    ),
    "preview": () => showPreview ? (
      <section className="wd-section wd-preview-section" aria-labelledby="home-preview-title" data-home-section="preview">
        <div className="container wd-preview-grid">
          <div className="wd-preview-copy">
            <span className="wd-kicker" data-broadcast-id="home-content.preview.eyebrow">{content?.preview?.eyebrow || "معاينة حية"}</span>
            <h2 id="home-preview-title" data-broadcast-id="home-content.preview.title">{content?.preview?.title || "شوف الدعوة وهي بتشتغل فعلا"}</h2>
            <p>المعاينة هنا مش ديكور. دي التجربة اللي هتوصل للضيف: فتح الدعوة، شاف التفاصيل، اختار الحضور، وكل حاجة اتسجلت عندك.</p>
            <ul className="wd-check-list">
              {previewPointItems.map((point, index) => (
                <li key={index}>
                  <Check size={18} />
                  <span data-broadcast-id={`home-content.previewPoints.${index}`}>{point}</span>
                </li>
              ))}
            </ul>
            <div className="wd-preview-actions">
              <Link className="btn btn-soft wd-designs-glow" href="/templates" data-broadcast-id="home-content.preview.orderCta">
                <WandSparkles size={18} />
                شاهد باقي التصاميم
              </Link>
            </div>
          </div>
          <div className="wd-preview-stage">
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
            <Link className="btn btn-gold btn-glow wd-preview-full-action" href="/badr-sarah-1" data-broadcast-id="home-content.preview.fullInviteCta">
              <Eye size={18} />
              {content?.preview?.fullInviteCta || "معاينة الدعوة كاملة"}
            </Link>
          </div>
        </div>
      </section>
    ) : null,
    "features": () => (
      <section id="features-section" className="wd-section wd-features-section" aria-labelledby="home-features-title" data-home-section="features">
        <div className="container">
          <div className="wd-section-head">
            <span className="wd-kicker">المميزات</span>
            <h2 id="home-features-title" data-broadcast-id="home-content.features.title">{content?.features?.title || "كل اللي الضيف يحتاجه، وكل اللي صاحب الفرح عايز يعرفه"}</h2>
          </div>
          <div className="wd-feature-groups">
            <FeatureGroup title="للضيوف" description="دعوة سهلة، واضحة، وبتفتح من أي موبايل." items={guestFeatureItems} sourcePath="guestFeatures" />
            <FeatureGroup title="لصاحب الفرح" description="متابعة وتنظيم بدل الورق والأسئلة المتكررة." items={ownerFeatureItems} sourcePath="ownerFeatures" featured />
          </div>
        </div>
      </section>
    ),
    "trust": () => (
      <section className="wd-section wd-trust-section" aria-label="أسباب الثقة" data-home-section="trust">
        <div className="container wd-trust-grid">
          {trustContentItems.map((item) => {
            const Icon = item.icon;
            return (
              <article className="wd-trust-item" key={item.id || item.title}>
                <Icon size={22} />
                <strong data-broadcast-id={item.id ? `home-content.trustItems.${item.id}.title` : undefined}>{item.title}</strong>
                <p data-broadcast-id={item.id ? `home-content.trustItems.${item.id}.text` : undefined}>{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>
    ),
    "stats": () => (
      <section className="wd-section wd-stats-band" aria-label="ملخص سريع" data-home-section="stats">
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
    ),
    "pricing": () => showPricing ? (
      <section id="pricing-section" className="wd-section wd-pricing-section" aria-labelledby="home-pricing-title" data-home-section="pricing">
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
    ) : null,
    "faq": () => (
      <section className="wd-section wd-faq-section" aria-labelledby="home-faq-title" data-home-section="faq">
        <div className="container wd-faq-grid">
          <div className="wd-faq-intro">
            <span className="wd-kicker">أسئلة قبل الطلب</span>
            <h2 id="home-faq-title">كل سؤال طبيعي قبل ما تبعت الدعوة للمعازيم</h2>
            <p>الهدف إن التجربة تبقى واضحة لك وللضيف من أول لينك.</p>
          </div>
          <div className="wd-faq-list">
            {faqContentItems.map((item) => (
              <details className="wd-faq-item" key={item.id || item.question}>
                <summary data-broadcast-id={item.id ? `home-content.faqItems.${item.id}.question` : undefined}>{item.question}</summary>
                <p data-broadcast-id={item.id ? `home-content.faqItems.${item.id}.answer` : undefined}>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    ),
    "final-cta": () => (
      <section className="wd-final-cta" aria-labelledby="home-final-cta-title" data-home-section="final-cta">
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
    ),
  };

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
        {sectionOrder.map((id) => {
          const render = sections[id];
          return render ? <React.Fragment key={id}>{render()}</React.Fragment> : null;
        })}
      </main>
      <Link className="wd-floating-start" href="/order" aria-label="ابدأ الآن واطلب دعوة">
        <Sparkles size={18} />
        <span>أبدأ الآن</span>
      </Link>
      <SiteFooter />
    </div>
  );
}

function FeatureGroup({
  title,
  description,
  items,
  sourcePath,
  featured = false,
}: {
  title: string;
  description: string;
  items: Array<{ title: string; text: string; icon?: typeof Link2; id?: string }>;
  sourcePath: "guestFeatures" | "ownerFeatures";
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
          const Icon = item.icon || Link2;
          return (
            <div className="wd-feature-item" key={item.id || item.title}>
              <span>
                <Icon size={18} />
              </span>
              <div>
                <strong data-broadcast-id={item.id ? `home-content.${sourcePath}.${item.id}.title` : undefined}>{item.title}</strong>
                <p data-broadcast-id={item.id ? `home-content.${sourcePath}.${item.id}.text` : undefined}>{item.text}</p>
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
