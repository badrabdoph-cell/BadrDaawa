"use client";

import { QRCodeSVG } from "qrcode.react";

export interface ClassicPosterProps {
  groomName: string;
  brideName: string;
  coverImage: string;
  weddingDate: string;
  venueName: string;
  venueAddress?: string;
  weddingTime?: string;
  invitationUrl: string;
  headline?: string;
}

type ParsedDate = {
  day: string;
  month: string;
  year: string;
  headerDate: string;
};

const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function parseWeddingDate(value: string): ParsedDate {
  const input = (value || "").trim();
  let date: Date | null = null;
  const iso = input.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  const dmy = input.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);

  if (iso) date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  else if (dmy) date = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  else {
    const nativeDate = new Date(input);
    if (!Number.isNaN(nativeDate.getTime())) date = nativeDate;
  }

  if (!date || Number.isNaN(date.getTime())) date = new Date();

  return {
    day: String(date.getDate()),
    month: MONTHS_EN[date.getMonth()] || "June",
    year: String(date.getFullYear()),
    headerDate: `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`,
  };
}

function shortenUrl(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`.replace(/\/$/, "");
  } catch {
    return (url || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}

function PaperTexture() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1080 1350" aria-hidden="true">
      <defs>
        <radialGradient id="classic-poster-bg" cx="50%" cy="18%" r="78%">
          <stop offset="0%" stopColor="#fffaf2" />
          <stop offset="62%" stopColor="#f8efe3" />
          <stop offset="100%" stopColor="#efe0cc" />
        </radialGradient>
        <pattern id="classic-paper-lines" width="320" height="260" patternUnits="userSpaceOnUse">
          <g opacity="0.12" fill="#4a3526" fontFamily="Georgia, serif">
            <text x="4" y="18" fontSize="15">The beautiful glamour</text>
            <text x="4" y="42" fontSize="15">Wedding invitation template</text>
            <text x="4" y="66" fontSize="15">You make up freshly</text>
            <text x="4" y="90" fontSize="15">Love story and celebration</text>
            <text x="4" y="114" fontSize="15">Save the date and venue</text>
            <text x="4" y="138" fontSize="15">Perfect moments forever</text>
          </g>
          <g opacity="0.08" stroke="#4a3526" strokeWidth="1">
            <line x1="0" y1="176" x2="220" y2="176" />
            <line x1="0" y1="194" x2="250" y2="194" />
            <line x1="0" y1="212" x2="180" y2="212" />
            <line x1="0" y1="230" x2="210" y2="230" />
          </g>
        </pattern>
        <filter id="classic-paper-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.05" />
          </feComponentTransfer>
        </filter>
      </defs>
      <rect width="1080" height="1350" fill="url(#classic-poster-bg)" />
      <rect width="1080" height="1350" filter="url(#classic-paper-noise)" />
      <g opacity="0.42">
        <rect x="-70" y="-10" width="310" height="1400" fill="url(#classic-paper-lines)" transform="rotate(-8 85 675)" />
        <rect x="830" y="-50" width="320" height="1450" fill="url(#classic-paper-lines)" transform="rotate(12 990 675)" />
      </g>
    </svg>
  );
}

function Rule({ className = "" }: { className?: string }) {
  return <div className={`h-[5px] w-full bg-black ${className}`} />;
}

function DoubleRule({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-[8px] ${className}`}>
      <Rule />
      <Rule />
    </div>
  );
}

function Header({ headerDate }: { headerDate: string }) {
  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-end gap-4 px-[92px] pt-[44px]">
      <h3 className="font-serif text-[31px] font-black leading-none tracking-[-0.03em] text-[#120d09]">Wedding invitation</h3>
      <div className="pb-[1px] text-[38px] leading-none text-[#4c2b11]">♥</div>
      <div className="text-right font-serif text-[32px] font-black leading-none tracking-[-0.03em] text-[#120d09]">{headerDate}</div>
    </header>
  );
}

function Headline({ headline }: { headline: string }) {
  return (
    <section className="px-[112px] pt-[14px]">
      <Rule />
      <h1 dir="rtl" className="py-[18px] text-center text-[98px] font-black leading-none tracking-[-0.06em] text-[#e73539]" style={{ fontFamily: "var(--font-arabic), 'Cairo', 'Tajawal', 'Noto Kufi Arabic', sans-serif", textShadow: "0 2px 0 rgba(120,20,20,.08)" }}>
        {headline}
      </h1>
      <DoubleRule />
    </section>
  );
}

function CoupleNames({ groomName, brideName }: Pick<ClassicPosterProps, "groomName" | "brideName">) {
  return (
    <section className="px-[112px] pt-[34px]">
      <h2 dir="rtl" className="text-center text-[76px] font-black leading-none tracking-[-0.055em] text-[#4b2b10]" style={{ fontFamily: "var(--font-arabic), 'Cairo', 'Tajawal', 'Noto Kufi Arabic', sans-serif", textShadow: "0 2px 0 rgba(255,255,255,.7)" }}>
        {groomName} {brideName}
      </h2>
      <Rule className="mt-[28px]" />
    </section>
  );
}

function PhotoFrame({ coverImage, alt }: { coverImage: string; alt: string }) {
  return (
    <section className="px-[182px] pt-[38px]">
      <div className="relative h-[442px] overflow-hidden rounded-[26px] bg-[#20160f] shadow-[0_10px_24px_rgba(34,21,11,0.18)]">
        {coverImage ? <img src={coverImage} alt={alt} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center bg-[#2b2118] text-[34px] font-black text-white/80">صورة الدعوة</div>}
      </div>
    </section>
  );
}

function DateCard({ date }: { date: ParsedDate }) {
  return (
    <div className="flex justify-center">
      <div className="relative h-[310px] w-[322px] overflow-hidden bg-black text-white shadow-[0_10px_28px_rgba(0,0,0,.16)]">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 322 310" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 0H322V310H0V0ZM0 76C43 76 76 43 76 0H0V76ZM246 0C246 43 279 76 322 76V0H246ZM322 234C279 234 246 267 246 310H322V234ZM76 310C76 267 43 234 0 234V310H76Z" fill="#f8efe3" fillRule="evenodd" />
        </svg>
        <div className="relative z-10 grid h-full place-items-center py-[34px] text-center">
          <strong className="font-serif text-[70px] font-black leading-none tracking-[-0.05em]">{date.day}</strong>
          <span className="font-serif text-[48px] leading-none tracking-[-0.03em]">{date.month}</span>
          <strong className="font-serif text-[56px] font-black leading-none tracking-[-0.04em]">{date.year}</strong>
        </div>
      </div>
    </div>
  );
}

function QRCodeCard({ invitationUrl }: Pick<ClassicPosterProps, "invitationUrl">) {
  return (
    <div className="mt-[16px] grid grid-cols-[136px_1fr] items-center gap-[20px] border-t-[3px] border-[#17120f] pt-[18px]">
      <div className="grid justify-items-center gap-[10px]">
        <div className="grid h-[122px] w-[122px] place-items-center border-[3px] border-[#16120f] bg-white p-[8px]">
          <QRCodeSVG value={invitationUrl || "https://badrdaawa.com"} size={104} level="H" bgColor="#ffffff" fgColor="#111111" />
        </div>
        <p dir="rtl" className="w-[150px] text-center text-[14px] font-black leading-[1.4] text-[#20140d]" style={{ fontFamily: "var(--font-arabic), 'Cairo', 'Tajawal', 'Noto Kufi Arabic', sans-serif" }}>امسح الكود لمشاهدة الدعوة الكاملة</p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-[20px] font-black leading-none text-[#13100d]">{shortenUrl(invitationUrl)}</p>
      </div>
    </div>
  );
}

function VenueCard({ venueName, venueAddress, weddingTime, invitationUrl, month }: Pick<ClassicPosterProps, "venueName" | "venueAddress" | "weddingTime" | "invitationUrl"> & { month: string }) {
  return (
    <div>
      <div className="pb-[18px]">
        <h3 className="text-center font-serif text-[58px] font-black leading-none tracking-[-0.04em] text-black">Save the date</h3>
        <div className="mt-[16px] h-[4px] w-full bg-black" />
      </div>
      <div className="relative border-[3px] border-[#16120f] bg-[rgba(255,250,241,0.82)] px-[26px] pb-[22px] pt-[24px]">
        <svg className="pointer-events-none absolute inset-[-10px] h-[calc(100%+20px)] w-[calc(100%+20px)]" viewBox="0 0 430 245" preserveAspectRatio="none" aria-hidden="true">
          <g fill="none" stroke="#15110e" strokeWidth="2"><rect x="7" y="7" width="416" height="231" /><path d="M0 20H20V0M410 0V20H430M430 225H410V245M20 245V225H0" /></g>
          <g fill="#fffaf1" stroke="#15110e" strokeWidth="2"><rect x="0" y="0" width="9" height="9" /><rect x="421" y="0" width="9" height="9" /><rect x="0" y="236" width="9" height="9" /><rect x="421" y="236" width="9" height="9" /></g>
        </svg>
        <div className="relative z-10">
          <div className="grid grid-cols-[92px_1fr_62px] items-center gap-[18px]">
            <svg viewBox="0 0 80 118" className="h-[114px] w-[80px]" aria-hidden="true"><g fill="none" stroke="#6b5b4f" strokeWidth="2.4" opacity="0.42"><circle cx="24" cy="16" r="9" /><path d="M24 28V66M13 41L24 32L35 42M13 106L24 66L36 106" /><circle cx="54" cy="22" r="8" /><path d="M54 33V65M43 48L54 38L65 49M41 106L54 65L67 106" /><path d="M34 40C40 33 47 33 54 40" /></g></svg>
            <div className="min-w-0 text-center">
              <p className="font-serif text-[54px] leading-none text-black">{month}</p>
              <p className="mt-[14px] break-words text-[28px] font-black uppercase leading-[1.12] tracking-[-0.02em] text-black">,,{venueName || "Wedding Hall"},,</p>
              {venueAddress ? <p dir="rtl" className="mt-[8px] break-words text-[16px] font-black leading-[1.35] text-[#4b2b10]" style={{ fontFamily: "var(--font-arabic), 'Cairo', 'Tajawal', 'Noto Kufi Arabic', sans-serif" }}>{venueAddress}</p> : null}
              <p className="mt-[18px] font-serif text-[34px] font-black leading-none text-black">At {weddingTime || "8 pm"}</p>
            </div>
            <svg viewBox="0 0 64 64" className="h-[56px] w-[56px]" aria-hidden="true"><g fill="none" stroke="#171310" strokeWidth="3.6"><rect x="9" y="13" width="46" height="42" rx="3" /><path d="M9 25H55M21 7V18M43 7V18" /><path d="M18 34H25M29 34H36M40 34H47M18 43H25M29 43H36M40 43H47" /></g></svg>
          </div>
          <QRCodeCard invitationUrl={invitationUrl} />
        </div>
      </div>
    </div>
  );
}

export default function ClassicPoster({ groomName, brideName, coverImage, weddingDate, venueName, venueAddress, weddingTime = "8 pm", invitationUrl, headline = "خبر عاجل!!!" }: ClassicPosterProps) {
  const date = parseWeddingDate(weddingDate);
  return (
    <article dir="ltr" className="relative h-[1350px] w-[1080px] overflow-hidden bg-[#f8efe3] text-[#130d08]" style={{ fontFamily: "Georgia, 'Times New Roman', var(--font-arabic), 'Cairo', 'Tajawal', serif" }}>
      <PaperTexture />
      <div className="relative z-10 h-full w-full">
        <Header headerDate={date.headerDate} />
        <Headline headline={headline} />
        <CoupleNames groomName={groomName} brideName={brideName} />
        <PhotoFrame coverImage={coverImage} alt={`${groomName} ${brideName}`} />
        <section className="px-[112px] pt-[26px]"><Rule /></section>
        <section className="grid grid-cols-[332px_1px_1fr] gap-[46px] px-[84px] pt-[38px]">
          <DateCard date={date} />
          <div className="h-[392px] w-[3px] bg-black" />
          <VenueCard venueName={venueName} venueAddress={venueAddress} weddingTime={weddingTime} invitationUrl={invitationUrl} month={date.month} />
        </section>
      </div>
    </article>
  );
}
