import { ArrowDown, Eye, Send, SlidersHorizontal, UserCheck, UsersRound } from "lucide-react";

const benefits = [
  {
    icon: UserCheck,
    title: "اعرف مين هيحضر فرحك",
    desc: "متابعة تسجيل الحضور لحظة بلحظة.",
  },
  {
    icon: UsersRound,
    title: "كشف بالأسماء والأرقام",
    desc: "شاهد بيانات الضيوف المسجلين بالكامل.",
  },
  {
    icon: Send,
    title: "رسالة جماعية بضغطة واحدة",
    desc: "أرسل تنبيه أو تذكير لكل الضيوف مرة واحدة.",
  },
  {
    icon: SlidersHorizontal,
    title: "عدّل دعوتك في أي وقت",
    desc: "غيّر البيانات والصور بسهولة.",
  },
];

export function QuickBenefits() {
  return (
    <section className="quick-benefits" aria-label="مميزات سريعة">
      <div className="container">
        <div className="quick-benefits-grid">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <article className="quick-benefit-card" key={benefit.title}>
                <span className="quick-benefit-icon">
                  <Icon size={22} />
                </span>
                <div>
                  <strong className="quick-benefit-title">{benefit.title}</strong>
                  <p className="quick-benefit-desc">{benefit.desc}</p>
                </div>
              </article>
            );
          })}
        </div>
        <div className="quick-benefits-action">
          <a href="#features-section" className="btn btn-soft quick-benefits-more">
            <ArrowDown size={16} />
            <span>شاهد باقي المميزات</span>
          </a>
        </div>
      </div>
    </section>
  );
}
