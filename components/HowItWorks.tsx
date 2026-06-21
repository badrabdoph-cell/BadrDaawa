import Link from "next/link";
import { Check, Palette, SlidersHorizontal } from "lucide-react";

const steps = [
  { number: 1, icon: Palette, title: "اختار التصميم" },
  { number: 2, icon: SlidersHorizontal, title: "اكتب بياناتك" },
  { number: 3, icon: Check, title: "استلم دعوتك" },
];

export function HowItWorks() {
  return (
    <section className="how-it-works" aria-label="ازاي تصمم دعوتك">
      <div className="container">
        <h2 className="how-it-works-title">ازاي تصمم دعوتك؟</h2>
        <div className="how-it-works-steps">
          {steps.map((step, index) => (
            <div className="how-it-works-step" key={step.number}>
              <div className="how-it-works-step-inner">
                <span className="how-it-works-step-number">{step.number}</span>
                <span className="how-it-works-step-icon">
                  <step.icon size={24} />
                </span>
                <strong className="how-it-works-step-title">{step.title}</strong>
              </div>
              {index < steps.length - 1 ? (
                <span className="how-it-works-arrow" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </span>
              ) : null}
            </div>
          ))}
        </div>
        <p className="how-it-works-subtitle">
          خلال دقائق فقط هتكون دعوتك جاهزة للمشاركة مع الضيوف.
        </p>
        <div className="button-row how-it-works-actions">
          <Link className="btn btn-gold btn-glow home-cta home-cta-primary" href="/templates">
            <Palette size={19} />
            <span>شاهد التصاميم</span>
          </Link>
          <Link className="btn btn-gold btn-glow home-cta home-cta-primary" href="/templates">
            <Check size={19} />
            <span>ابدأ الآن</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
