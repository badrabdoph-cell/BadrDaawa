"use client";

import { QRCodeSVG } from "qrcode.react";
import {
  Cairo,
  Rakkas,
  Playfair_Display,
  Libre_Baskerville,
} from "next/font/google";
import type { ClassicPosterProps } from "./ClassicPoster";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["800", "900"],
  variable: "--font-cairo",
});

const rakkas = Rakkas({
  subsets: ["arabic"],
  weight: "400",
  variable: "--font-rakkas",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-playfair",
});

const libre = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-libre",
});

function parseDate(value: string) {
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const clean = (value || "").trim();
  let date: Date | null = null;
  const iso = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  const dmy = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (iso) date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  else if (dmy) date = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  else { const n = new Date(clean); if (!Number.isNaN(n.getTime())) date = n; }
  if (!date || Number.isNaN(date.getTime())) date = new Date();
  return { day: String(date.getDate()), month: MONTHS[date.getMonth()] || "June", year: String(date.getFullYear()), headerDate: `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}` };
}

const newsText = Array.from({ length: 85 })
  .map(
    () =>
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Wedding invitation journal edition."
  )
  .join("\n");

function NewsTexture() {
  return (
    <>
      <div
        aria-hidden
        className="absolute left-[-12px] top-[-10px] h-[1280px] w-[150px] rotate-[-2deg] overflow-hidden text-[10px] leading-[11px] text-[#3c332a]/20"
        style={{ fontFamily: "Georgia, serif" }}
      >
        <p className="whitespace-pre-wrap">{newsText}</p>
      </div>
      <div
        aria-hidden
        className="absolute right-[-8px] top-[-8px] h-[390px] w-[180px] rotate-[8deg] overflow-hidden text-[10px] leading-[11px] text-[#3c332a]/16"
        style={{ fontFamily: "Georgia, serif" }}
      >
        <p className="whitespace-pre-wrap">{newsText}</p>
      </div>
      <div
        aria-hidden
        className="absolute right-[-10px] bottom-[-20px] h-[520px] w-[150px] rotate-[-2deg] overflow-hidden text-[10px] leading-[11px] text-[#3c332a]/16"
        style={{ fontFamily: "Georgia, serif" }}
      >
        <p className="whitespace-pre-wrap">{newsText}</p>
      </div>
    </>
  );
}

function HeartIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 64 58"
      className="absolute left-1/2 top-[68px] h-[42px] w-[42px] -translate-x-1/2"
    >
      <defs>
        <linearGradient id="heartGradient" x1="0" x2="1">
          <stop offset="0%" stopColor="#0c0702" />
          <stop offset="100%" stopColor="#3a2208" />
        </linearGradient>
      </defs>
      <path
        fill="url(#heartGradient)"
        d="M32 56S3 38.6 3 17.6C3 7.8 10.6 1 19.4 1c5.3 0 10.1 2.7 12.6 7.1C34.5 3.7 39.3 1 44.6 1 53.4 1 61 7.8 61 17.6 61 38.6 32 56 32 56Z"
      />
    </svg>
  );
}

function DateBadge({ date }: { date: { day: string; month: string; year: string } }) {
  return (
    <div className="absolute left-[72px] top-[914px] h-[355px] w-[326px]">
      <svg viewBox="0 0 326 355" className="absolute inset-0 h-full w-full">
        <defs>
          <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#000000" floodOpacity="0.25" />
          </filter>
        </defs>
        <path
          filter="url(#badgeShadow)"
          d="M68 5H258C265 44 285 66 320 76V279C284 289 264 313 257 350H69C61 313 41 289 6 279V76C41 66 61 44 68 5Z"
          fill="#020405"
        />
        <path
          d="M79 25H247C256 58 274 77 301 87V268C273 278 256 299 247 330H80C71 299 53 278 25 268V87C53 77 71 58 79 25Z"
          fill="none"
          stroke="#f5eee4"
          strokeWidth="2"
        />
      </svg>
      <div
        className="absolute inset-x-0 top-[70px] text-center text-[#f8f0e6]"
        style={{ fontFamily: "var(--font-libre)" }}
      >
        <div className="text-[78px] font-bold leading-[0.9] tracking-[-2px]">{date.day}</div>
        <div className="mt-[20px] text-[56px] font-bold leading-[0.95]">{date.month}</div>
        <div className="mt-[34px] text-[52px] font-bold leading-none">{date.year}</div>
        <div className="mx-auto mt-[36px] flex w-[160px] items-center justify-center gap-4">
          <span className="h-[2px] w-[58px] bg-[#f8f0e6]" />
          <span className="text-[26px] leading-none">♥</span>
          <span className="h-[2px] w-[58px] bg-[#f8f0e6]" />
        </div>
      </div>
    </div>
  );
}

function FrameCorner({ className, rotate = 0 }: { className: string; rotate?: number }) {
  return (
    <svg viewBox="0 0 34 34" className={`absolute h-[34px] w-[34px] ${className}`} style={{ transform: `rotate(${rotate}deg)` }}>
      <path d="M7 30V7h23" fill="none" stroke="#090909" strokeWidth="3" strokeLinecap="square" />
      <rect x="1.5" y="1.5" width="10" height="10" fill="#f9f0e6" stroke="#090909" strokeWidth="3" />
      <rect x="5" y="5" width="3" height="3" fill="#090909" />
    </svg>
  );
}

function CoupleLineArt() {
  return (
    <svg viewBox="0 0 150 150" className="absolute left-[42px] top-[34px] h-[126px] w-[126px]" fill="none" stroke="#141414" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="52" cy="25" r="10" />
      <path d="M45 38c-12 12-18 34-18 63M59 38c15 14 21 34 21 66" />
      <path d="M39 61h26M43 82h30M35 125c8-14 19-25 32-35" />
      <circle cx="92" cy="34" r="9" />
      <path d="M84 43c-12 13-20 35-24 83M100 43c16 16 28 43 34 85" />
      <path d="M68 90c15 11 43 12 58 0" />
      <path d="M62 127c24-18 49-18 73 0" />
      <path d="M73 66c9-8 18-8 28 0" />
      <path d="M86 58c-2 8-1 16 3 24" />
      <path d="M48 19c4-5 11-6 17-2M86 28c5-4 11-4 17 1" />
    </svg>
  );
}

function SaveDateCard({ month, venueName, weddingTime, invitationUrl }: { month: string; venueName: string; weddingTime: string; invitationUrl: string }) {
  return (
    <div className="absolute left-[505px] top-[1000px] h-[238px] w-[502px]">
      <div className="absolute inset-0 border-[2px] border-[#111]" />
      <div className="absolute inset-[12px] border-[2px] border-[#111]" />
      <FrameCorner className="left-[-12px] top-[-12px]" />
      <FrameCorner className="right-[-12px] top-[-12px]" rotate={90} />
      <FrameCorner className="right-[-12px] bottom-[-12px]" rotate={180} />
      <FrameCorner className="left-[-12px] bottom-[-12px]" rotate={270} />
      <CoupleLineArt />
      <div
        className="absolute left-[195px] top-[42px] text-[68px] font-bold leading-none text-[#111]"
        style={{ fontFamily: "var(--font-playfair)" }}
      >
        {month}
      </div>
      <div className="absolute right-[36px] top-[34px] flex h-[102px] w-[102px] items-center justify-center border border-dashed border-[#111] bg-[#f9f0e6] p-[5px]">
        <QRCodeSVG value={invitationUrl || "https://badrdaawa.com"} size={88} fgColor="#050505" bgColor="transparent" level="H" includeMargin={false} />
      </div>
      <div
        className="absolute left-[187px] top-[132px] w-[260px] text-center text-[28px] font-black leading-none tracking-[-1px] text-[#111]"
        style={{ fontFamily: "var(--font-cairo)" }}
      >
        {venueName || "LALIT ELOMR HALL"},,
      </div>
      <div
        className="absolute left-[240px] top-[178px] w-[180px] text-center text-[30px] font-bold leading-none text-[#111]"
        style={{ fontFamily: "var(--font-libre)" }}
      >
        At {weddingTime || "8 pm"}
      </div>
      <div className="absolute left-[224px] top-[211px] h-[2px] w-[70px] bg-[#111]" />
      <div className="absolute left-[327px] top-[211px] h-[2px] w-[70px] bg-[#111]" />
      <div className="absolute left-[300px] top-[199px] text-[26px] leading-none text-[#111]">♥</div>
    </div>
  );
}

function PhoneQrIcon() {
  return (
    <svg viewBox="0 0 80 80" className="absolute left-[508px] top-[1252px] h-[62px] w-[62px]" fill="none" stroke="#111" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M28 5h26c6 0 10 4 10 10v50c0 6-4 10-10 10H28c-6 0-10-4-10-10V15c0-6 4-10 10-10Z" />
      <path d="M34 11h14M35 69h12" />
      <rect x="31" y="23" width="7" height="7" />
      <rect x="46" y="23" width="7" height="7" />
      <rect x="31" y="38" width="7" height="7" />
      <path d="M46 40h8v8h-5v7h-9" />
      <path d="M18 47c-10 2-14 10-10 18 4 9 14 12 22 9" />
      <path d="M15 52l-8 13" />
    </svg>
  );
}

export default function WeddingPoster({ groomName, brideName, coverImage, weddingDate, venueName, venueAddress, weddingTime = "8 pm", invitationUrl, headline = "خبر عاجل !!!" }: ClassicPosterProps) {
  const date = parseDate(weddingDate);
  const coupleName = `${groomName || "أحمد"} ${brideName || "نورا"}`;

  return (
    <section
      aria-label="Wedding invitation"
      className={[cairo.variable, rakkas.variable, playfair.variable, libre.variable, "relative isolate overflow-hidden text-[#0d0d0d]"].join(" ")}
      style={{
        width: 1080,
        height: 1350,
        WebkitFontSmoothing: "antialiased",
        background: "radial-gradient(circle at 50% 34%, rgba(255,255,255,0.98) 0%, rgba(252,245,235,0.98) 46%, rgba(240,223,201,0.86) 100%)",
      }}
    >
      <NewsTexture />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.45]"
        style={{ background: "radial-gradient(circle at center, transparent 0%, transparent 62%, rgba(120,72,30,0.12) 100%)" }}
      />

      {/* Top header */}
      <div className="absolute left-[128px] top-[70px] text-[30px] font-bold leading-none" style={{ fontFamily: "var(--font-playfair)" }}>Wedding invitation</div>
      <HeartIcon />
      <div className="absolute right-[111px] top-[68px] text-[34px] font-bold leading-none tracking-[-1px]" style={{ fontFamily: "var(--font-libre)" }}>{date.headerDate}</div>
      <div className="absolute left-[96px] top-[110px] h-[5px] w-[910px] bg-[#090909]" />

      {/* Headline */}
      <h1
        dir="rtl"
        className="absolute left-0 top-[138px] w-full text-center text-[105px] font-black leading-none text-[#ed171f]"
        style={{ fontFamily: "var(--font-cairo)", letterSpacing: "-2px", textShadow: "0 2px 0 rgba(80,0,0,0.12)" }}
      >
        {headline}
      </h1>

      <div className="absolute left-[94px] top-[260px] h-[5px] w-[912px] bg-[#090909]" />
      <div className="absolute left-[94px] top-[273px] h-[5px] w-[912px] bg-[#090909]" />

      {/* Couple names */}
      <div
        dir="rtl"
        className="absolute left-0 top-[312px] w-full text-center text-[82px] leading-none text-[#241505]"
        style={{ fontFamily: "var(--font-rakkas)", textShadow: "0 3px 0 rgba(0,0,0,0.10)" }}
      >
        {coupleName}
      </div>

      <div className="absolute left-[94px] top-[403px] h-[5px] w-[912px] bg-[#090909]" />

      {/* Photo */}
      <div className="absolute left-[112px] top-[425px] h-[432px] w-[856px] rounded-[44px] border-[3px] border-[#d3c4b2] bg-[#fff8ee] p-[8px] shadow-[0_10px_26px_rgba(60,35,10,0.16)]">
        {coverImage ? (
          <img src={coverImage} alt={coupleName} className="h-full w-full rounded-[35px] object-cover" draggable={false} />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-[35px] bg-gray-200 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="h-20 w-20">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l1.25 1.25m-16.5 5.25h16.5m-16.5 0a2.25 2.25 0 0 1-2.25-2.25V5.25A2.25 2.25 0 0 1 2.25 3h19.5A2.25 2.25 0 0 1 24 5.25v13.5A2.25 2.25 0 0 1 21.75 21H2.25Z" />
            </svg>
          </div>
        )}
      </div>

      <div className="absolute left-[72px] top-[883px] h-[5px] w-[944px] bg-[#090909]" />

      {/* Bottom section */}
      <DateBadge date={date} />
      <div className="absolute left-[449px] top-[906px] h-[410px] w-[4px] bg-[#111]" />
      <div className="absolute left-[520px] top-[914px] w-[470px] text-center text-[60px] font-black leading-none text-[#111]" style={{ fontFamily: "var(--font-playfair)" }}>Save the date</div>
      <div className="absolute left-[510px] top-[982px] h-[2px] w-[500px] bg-[#111]" />

      <SaveDateCard month={date.month} venueName={venueName || "Wedding Hall"} weddingTime={weddingTime} invitationUrl={invitationUrl} />

      <PhoneQrIcon />
      <div className="absolute left-[585px] top-[1262px] h-[58px] w-[2px] bg-[#111]" />
      <div
        dir="rtl"
        className="absolute left-[600px] top-[1255px] w-[420px] text-center text-[30px] font-bold leading-none text-[#111]"
        style={{ fontFamily: "var(--font-cairo)" }}
      >
        امسح الكود لمشاهدة الدعوة كاملة
      </div>
      <div className="absolute left-[600px] top-[1294px] w-[420px] text-center text-[30px] font-normal leading-none text-[#111]" style={{ fontFamily: "Arial, sans-serif" }}>
        {invitationUrl ? (() => { try { return new URL(invitationUrl).host + "/invitation"; } catch { return "badrdaawa.com/invitation"; } })() : "badrdaawa.com/invitation"}
      </div>
    </section>
  );
}
