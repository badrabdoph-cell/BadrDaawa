import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Eye, Home, Palette, Sparkles } from "lucide-react";
import { getPublicTemplateWithPreviewMusic } from "@/lib/template-settings";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import type { Metadata } from "next";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const styleLabels: Record<string, string> = {
  featured: "مميز",
  royal: "ملكي",
  noir: "داكن",
  ivory: "رومانسي",
  mobile: "موبايل",
  boho: "بوهو",
  garden: "حدائق",
  cinematic: "سينمائي",
  glass: "زجاجي",
  minimal: "مينيمال",
  neon: "نيون",
  vintage: "فينتاج",
  ocean: "أوشن",
  artdeco: "آرت ديكو",
  magazine: "مجلة",
  custom: "خاص",
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const template = await getPublicTemplateWithPreviewMusic(slug);
  if (!template) return {};
  return {
    title: template.arabicName,
    description: template.concept,
  };
}

export default async function TemplateDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const template = await getPublicTemplateWithPreviewMusic(slug);
  if (!template) notFound();

  const previewHref = `/templates/${template.slug}/preview?hidePreviewChrome=1`;
  const orderHref = `/order?template=${template.slug}`;
  const previewImage = template.previewImage.endsWith(".svg") && template.previewImage.startsWith("/assets/templates/")
    ? `/templates/${template.slug}/card-preview.svg`
    : template.previewImage;

  return (
    <div className="page-shell">
      <SiteHeader />
      <main>
        <section className="section">
          <div className="container template-detail-hero">
            <div className="template-detail-image">
              <Image
                src={previewImage}
                alt={`معاينة تصميم ${template.arabicName}`}
                width={800}
                height={600}
                className="template-detail-img"
                priority
              />
            </div>
            <div className="template-detail-info">
              <span className="eyebrow">
                <Palette size={14} />
                {template.category}
              </span>
              <h1>{template.arabicName}</h1>
              <p className="template-detail-subtitle">{template.name}</p>
              <div className="template-detail-tags">
                <span className="badge">{styleLabels[template.style] || template.style}</span>
                <span className="badge">{template.category}</span>
              </div>
              <p className="template-detail-description">{template.concept}</p>
              <div className="button-row button-row-lg">
                <Link className="btn btn-gold btn-glow" href={orderHref}>
                  <Sparkles size={18} />
                  اختيار هذا القالب
                </Link>
                <Link className="btn btn-soft btn-glass" href={previewHref}>
                  <Eye size={18} />
                  معاينة
                </Link>
              </div>
              <Link className="template-detail-back" href="/templates">
                <ArrowRight size={16} />
                العودة لجميع التصاميم
              </Link>
            </div>
          </div>
        </section>

        <section className="section compact">
          <div className="container">
            <div className="section-title-block">
              <span className="eyebrow">معاينة حية</span>
              <h2>شوف التصميم على أرض الواقع</h2>
              <p className="section-lead">هذه المعاينة تعرض شكل الدعوة كاملة. جرب تتنقل بين الأقسام 🤍</p>
            </div>
            <div className="template-live-preview-wrap">
              <iframe
                src={`/templates/${template.slug}/preview?silentPreview=1&embed=1`}
                className="template-live-preview-iframe"
                title={`معاينة حية لقالب ${template.arabicName}`}
                sandbox="allow-scripts allow-same-origin"
                loading="lazy"
              />
            </div>
          </div>
        </section>

        <section className="section compact">
          <div className="container">
            <div className="section-title-block">
              <span className="eyebrow">اختيار التصميم</span>
              <h2>عجبك التصميم؟ 🤍</h2>
              <p className="section-lead">قدر تطلبه دلوقتي و نبدأ نجهز دعوتك.</p>
            </div>
            <div className="button-row button-row-center button-row-lg">
              <Link className="btn btn-gold btn-glow" href={orderHref}>
                <Sparkles size={20} />
                اختيار هذا القالب وبدء الطلب
              </Link>
              <Link className="btn btn-soft" href="/templates">
                <ArrowRight size={18} />
                استعرض تصاميم أخرى
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
