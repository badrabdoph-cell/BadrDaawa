"use client";

import Image from "next/image";
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

type DateParts = {
  day: string;
  month: string;
  year: string;
  headerDate: string;
};

const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function parseWeddingDate(value: string): DateParts {
  const clean = value?.trim();

  let date: Date | null = null;

  if (clean) {
    const iso = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    const dmy = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);

    if (iso) {
      date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    } else if (dmy) {
      date = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    } else {
      const nativeDate = new Date(clean);
      if (!Number.isNaN(nativeDate.getTime())) date = nativeDate;
    }
  }

  if (!date || Number.isNaN(date.getTime())) {
    date = new Date();
  }

  const day = String(date.getDate());
  const month = MONTHS_EN[date.getMonth()] || "";
  const year = String(date.getFullYear());

  return {
    day,
    month,
    year,
    headerDate: `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`,
  };
}

function shortUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.host + parsed.pathname.replace(/\/$/, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}

function PaperTexture() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.22]"
      viewBox="0 0 1080 1350"
      aria-hidden="true"
    >
      <defs>
        <pattern id="classic-paper-lines" width="260" height="220" patternUnits="userSpaceOnUse">
          <rect width="260" height="220" fill="transparent" />
          <g fill="#2a1a0f" opacity="0.12" fontFamily="Georgia, serif" fontSize="16">
            <text x="8" y="22">The beautiful glamour</text>
            <text x="8" y="48">You make up freshly</text>
            <text x="8" y="74">Wedding invitation</text>
            <text x="8" y="100">Love story begins here</text>
            <text x="8" y="126">Save the date today</text>
          </g>
          <g stroke="#2a1a0f" strokeWidth="1" opacity="0.08">
            <line x1="0" y1="156" x2="210" y2="156" />
            <line x1="0" y1="176" x2="240" y2="176" />
            <line x1="0" y1="196" x2="170" y2="196" />
          </g>
        </pattern>

        <radialGradient id="classic-paper-glow" cx="50%" cy="18%" r="78%">
          <stop offset="0%" stopColor="#fffaf0" />
          <stop offset="58%" stopColor="#f7eddf" />
          <stop offset="100%" stopColor="#efe0cc" />
        </radialGradient>

        <filter id="classic-soft-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.055" />
          </feComponentTransfer>
        </filter>
      </defs>

      <rect width="1080" height="1350" fill="url(#classic-paper-glow)" />
      <rect width="1080" height="1350" filter="url(#classic-soft-noise)" />
      <g opacity="0.44">
        <rect x="-40" y="-20" width="310" height="1350" fill="url(#classic-paper-lines)" transform="rotate(-9 120 600)" />
        <rect x="780" y="-80" width="360" height="1420" fill="url(#classic-paper-lines)" transform="rotate(14 950 600)" />
      </g>
    </svg>
  );
}

function Rule({ className = "" }: { className?: string }) {
  return (
    <div className={`w-full ${className}`}>
      <div className="h-[5px] w-full bg-[#060606]" />
    </div>
  );
}

function DoubleRule({ className = "" }: { className?: string }) {
  return (
    <div className={`flex w-full flex-col gap-[8px] ${className}`}>
      <div className="h-[5px] w-full bg-[#050505]" />
      <div className="h-[5px] w-full bg-[#050505]" />
    </div>
  );
}

function Header({ date }: { date: string }) {
  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-end gap-6 px-[112px] pt-[50px]">
      <h2 className="font-serif text-[31px] font-black leading-none tracking-[-0.03em] text-[#0b0907]">
        Wedding invitation
      </h2>

      <div className="pb-[1px] text-[36px] leading-none text-[#3a210d]">♥</div>

      <time className="text-right font-serif text-[33px] font-black leading-none tracking-[-0.03em] text-[#0b0907]">
        {date}
      </time>
    </header>
  );
}

function Headline({ headline }: { headline: string }) {
  return (
    <section className="px-[112px] pt-[13px]">
      <Rule />
      <h1
        dir="rtl"
        className="py-[22px] text-center font-black leading-none tracking-[-0.045em] text-[#ef272c]"
        style={{
          fontFamily:
            "var(--font-arabic), 'Cairo', 'Tajawal', 'Noto Kufi Arabic', 'Arial', sans-serif",
          fontSize: 82,
          textShadow: "0 2px 0 rgba(120,20,20,.08)",
        }}
      >
        {headline}
      </h1>
      <DoubleRule />
    </section>
  );
}

function CoupleNames({ groomName, brideName }: Pick<ClassicPosterProps, "groomName" | "brideName">) {
  return (
    <section className="px-[112px] pt-[34px]">
      <h2
        dir="rtl"
        className="text-center font-black leading-none tracking-[-0.055em] text-[#3b210c]"
        style={{
          fontFamily:
            "var(--font-arabic), 'Cairo', 'Tajawal', 'Noto Kufi Arabic', 'Arial', sans-serif",
          fontSize: 72,
          textShadow: "0 2px 0 rgba(255,255,255,.85)",
        }}
      >
        {groomName} {brideName}
      </h2>
      <Rule className="mt-[28px]" />
    </section>
  );
}

function PhotoFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <section className="px-[184px] pt-[36px]">
      <div className="relative h-[442px] overflow-hidden rounded-[24px] bg-[#1f1a13] shadow-[0_8px_24px_rgba(30,20,10,0.16)] ring-1 ring-black/10">
        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            priority
            className="object-cover"
            sizes="712px"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[#2b2118] text-[34px] font-black text-white/80">
            صورة الدعوة
          </div>
        )}
      </div>
    </section>
  );
}

function DateCard({ date }: { date: DateParts }) {
  return (
    <section className="flex justify-center">
      <div className="relative grid h-[306px] w-[318px] place-items-center bg-[#020204] text-white shadow-[0_10px_28px_rgba(0,0,0,.16)]">
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 318 306"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0 0H318V306H0V0ZM0 75C42 75 75 42 75 0H0V75ZM243 0C243 42 276 75 318 75V0H243ZM318 231C276 231 243 264 243 306H318V231ZM75 306C75 264 42 231 0 231V306H75Z"
            fill="#f7eddf"
            fillRule="evenodd"
          />
        </svg>

        <div className="relative z-10 grid justify-items-center pt-[8px]">
          <strong className="font-serif text-[67px] font-black leading-[0.92] tracking-[-0.04em]">
            {date.day}
          </strong>
          <span className="mt-[30px] font-serif text-[48px] leading-none tracking-[-0.03em]">
            {date.month}
          </span>
          <strong className="mt-[32px] font-serif text-[55px] font-black leading-none tracking-[-0.04em]">
            {date.year}
          </strong>
        </div>
      </div>
    </section>
  );
}

function QRCodeCard({ invitationUrl }: Pick<ClassicPosterProps, "invitationUrl">) {
  return (
    <div className="grid grid-cols-[136px_1fr] items-center gap-18 border-t-[3px] border-[#12100d] pt-[18px]">
      <div className="grid justify-items-center gap-8">
        <div className="grid h-[120px] w-[120px] place-items-center border-[3px] border-[#16120f] bg-white p-2">
          <QRCodeSVG
            value={invitationUrl || "https://badrdaawa.com"}
            size={104}
            bgColor="#ffffff"
            fgColor="#111111"
            level="H"
            marginSize={0}
          />
        </div>
        <p
          dir="rtl"
          className="w-[145px] text-center text-[15px] font-black leading-[1.35] text-[#21150f]"
          style={{
            fontFamily:
              "var(--font-arabic), 'Cairo', 'Tajawal', 'Noto Kufi Arabic', 'Arial', sans-serif",
          }}
        >
          امسح الكود لمشاهدة الدعوة الكاملة
        </p>
      </div>

      <div className="min-w-0">
        <p className="truncate text-[20px] font-black leading-none text-[#111]">
          {shortUrl(invitationUrl)}
        </p>
      </div>
    </div>
  );
}

function VenueCard({
  venueName,
  venueAddress,
  weddingTime = "8 pm",
  invitationUrl,
  month,
}: Pick<ClassicPosterProps, "venueName" | "venueAddress" | "weddingTime" | "invitationUrl"> & { month: string }) {
  return (
    <section>
      <h3 className="mb-[20px] text-center font-serif text-[50px] font-black leading-none tracking-[-0.045em] text-[#070604]">
        Save the date
      </h3>

      <div className="relative border-[3px] border-[#16120f] bg-[#fffaf1]/80 px-[24px] pb-[20px] pt-[25px] shadow-[0_4px_0_rgba(0,0,0,.04)]">
        <svg
          className="pointer-events-none absolute inset-[-10px] h-[calc(100%+20px)] w-[calc(100%+20px)]"
          viewBox="0 0 430 245"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <g fill="none" stroke="#15110e" strokeWidth="2">
            <rect x="7" y="7" width="416" height="231" />
            <path d="M0 20H20V0M410 0V20H430M430 225H410V245M20 245V225H0" />
          </g>
          <g fill="#fffaf1" stroke="#15110e" strokeWidth="2">
            <rect x="0" y="0" width="9" height="9" />
            <rect x="421" y="0" width="9" height="9" />
            <rect x="0" y="236" width="9" height="9" />
            <rect x="421" y="236" width="9" height="9" />
          </g>
        </svg>

        <div className="relative z-10 grid gap-[18px]">
          <div className="grid grid-cols-[100px_1fr_74px] items-center gap-10">
            <svg viewBox="0 0 90 130" className="h-[126px] w-[90px]" aria-hidden="true">
              <g fill="none" stroke="#5b4a3e" strokeWidth="3" opacity="0.42">
                <circle cx="30" cy="20" r="11" />
                <path d="M30 34V78M17 50L30 40L44 52M19 118L30 78L43 118" />
                <circle cx="61" cy="26" r="10" />
                <path d="M61 39V76M48 56L61 43L75 58M45 118L61 76L78 118" />
                <path d="M42 49C50 41 58 41 66 49" />
              </g>
            </svg>

            <div className="min-w-0 text-center">
              <p className="font-serif text-[50px] font-normal leading-none text-[#0b0907]">
                {month}
              </p>
              <p className="mt-[18px] truncate text-[30px] font-black uppercase leading-none tracking-[-0.02em] text-[#050505]">
                „{venueName || "Wedding Hall"}„
              </p>
              {venueAddress ? (
                <p
                  dir="rtl"
                  className="mt-[8px] truncate text-[17px] font-black text-[#3b210c]"
                  style={{
                    fontFamily:
                      "var(--font-arabic), 'Cairo', 'Tajawal', 'Noto Kufi Arabic', 'Arial', sans-serif",
                  }}
                >
                  {venueAddress}
                </p>
              ) : null}
              <p className="mt-[22px] font-serif text-[35px] font-black leading-none text-[#0b0907]">
                At {weddingTime}
              </p>
            </div>

            <svg viewBox="0 0 64 64" className="h-[64px] w-[64px]" aria-hidden="true">
              <g fill="none" stroke="#171310" strokeWidth="4">
                <rect x="9" y="13" width="46" height="42" rx="3" />
                <path d="M9 25H55M21 7V18M43 7V18" />
                <path d="M18 34H25M29 34H36M40 34H47M18 43H25M29 43H36M40 43H47" />
              </g>
            </svg>
          </div>

          <QRCodeCard invitationUrl={invitationUrl} />
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return null;
}

export default function ClassicPoster({
  groomName,
  brideName,
  coverImage,
  weddingDate,
  venueName,
  venueAddress,
  weddingTime = "8 pm",
  invitationUrl,
  headline = "خبر عاجل!!!",
}: ClassicPosterProps) {
  const date = parseWeddingDate(weddingDate);

  return (
    <article
      dir="ltr"
      className="relative h-[1350px] w-[1080px] overflow-hidden bg-[#f7eddf] text-[#0b0907]"
      style={{
        fontFamily:
          "Georgia, 'Times New Roman', var(--font-arabic), 'Cairo', 'Tajawal', serif",
      }}
    >
      <PaperTexture />

      <div className="relative z-10">
        <Header date={date.headerDate} />

        <Headline headline={headline} />

        <CoupleNames groomName={groomName} brideName={brideName} />

        <PhotoFrame src={coverImage} alt={`${groomName} ${brideName}`} />

        <div className="px-[112px] pt-[28px]">
          <Rule />
        </div>

        <section className="grid grid-cols-[355px_1px_1fr] gap-[45px] px-[88px] pt-[38px]">
          <DateCard date={date} />

          <div className="h-[388px] w-[3px] bg-[#12100d]" />

          <VenueCard
            venueName={venueName}
            venueAddress={venueAddress}
            weddingTime={weddingTime}
            invitationUrl={invitationUrl}
            month={date.month}
          />
        </section>

        <Footer />
      </div>
    </article>
  );
}
