"use client";

import { QRCodeSVG } from "qrcode.react";
import type { ClassicPosterProps } from "./ClassicPoster";

function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path fillRule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314" />
    </svg>
  );
}

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
  return { day: String(date.getDate()), month: MONTHS[date.getMonth()] || "", year: String(date.getFullYear()), headerDate: `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}` };
}

export default function SimplePoster({ groomName, brideName, coverImage, weddingDate, venueName, venueAddress, weddingTime = "8 pm", invitationUrl, headline = "خبر عاجل !!!" }: ClassicPosterProps) {
  const date = parseDate(weddingDate);

  return (
    <div className="relative h-[1350px] w-[1080px] bg-[#f8f5f0] text-black font-sans overflow-hidden">
      {/* Background watermark text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.04]" style={{ transform: "rotate(-30deg)" }}>
        <span className="text-[200px] font-serif font-black tracking-widest whitespace-nowrap">Wedding invitation</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-black">
        <span className="font-serif text-lg tracking-wide">Wedding invitation</span>
        <MoonIcon />
        <span className="text-lg font-serif">{date.headerDate}</span>
      </div>

      {/* Headline */}
      <div className="mx-10 my-8 border-t-2 border-b-2 border-black py-6 text-center">
        <p className="text-[#cc2222] text-6xl font-black leading-none tracking-wide" style={{ fontFamily: "'Amiri', 'Traditional Arabic', 'var(--font-arabic)', serif" }}>
          {headline}
        </p>
      </div>

      {/* Names */}
      <div className="mx-10 border-t-2 border-b-2 border-black py-8 text-center">
        <h1 className="text-7xl font-black leading-none tracking-tight" style={{ fontFamily: "'Amiri', 'Traditional Arabic', 'var(--font-arabic)', serif" }}>
          {groomName || "أحمد"} {brideName || "نورا"}
        </h1>
      </div>

      {/* Photo */}
      <div className="mx-16 my-8 rounded-[40px] overflow-hidden border border-black/30 h-[440px] bg-gray-200">
        {coverImage ? (
          <img src={coverImage} alt={`${groomName} ${brideName}`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="h-20 w-20">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l1.25 1.25m-16.5 5.25h16.5m-16.5 0a2.25 2.25 0 0 1-2.25-2.25V5.25A2.25 2.25 0 0 1 2.25 3h19.5A2.25 2.25 0 0 1 24 5.25v13.5A2.25 2.25 0 0 1 21.75 21H2.25Z" />
            </svg>
          </div>
        )}
      </div>

      {/* Double rule */}
      <div className="mx-10 mb-4">
        <div className="h-[2px] bg-black" />
        <div className="h-[2px] bg-black mt-[6px]" />
      </div>

      {/* Bottom section: Date + Venue */}
      <div className="mx-10 grid grid-cols-[350px_1fr] gap-8">
        {/* Date card */}
        <div className="relative h-[370px] bg-black text-white rounded-[24px] overflow-hidden">
          <div className="absolute inset-3 border-[4px] border-white/20 rounded-[80px]" />
          <div className="relative z-10 flex flex-col items-center justify-center h-full gap-1 text-center px-4">
            <span className="font-serif text-7xl font-black leading-none">{date.day}</span>
            <span className="font-serif text-4xl font-bold uppercase mt-3 leading-none">{date.month}</span>
            <span className="font-serif text-4xl font-bold mt-2 leading-none">{date.year}</span>
            <div className="mt-4 text-white/80"><MoonIcon /></div>
          </div>
        </div>

        {/* Venue card */}
        <div className="rounded-[24px] border-[4px] border-black p-6 flex flex-col justify-between">
          <h2 className="text-center font-serif text-3xl font-black mb-4">Save the date</h2>
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
            <div className="flex items-center gap-3 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="h-10 w-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l1.25 1.25m-16.5 5.25h16.5m-16.5 0a2.25 2.25 0 0 1-2.25-2.25V5.25A2.25 2.25 0 0 1 2.25 3h19.5A2.25 2.25 0 0 1 24 5.25v13.5A2.25 2.25 0 0 1 21.75 21H2.25Z" />
              </svg>
              <span className="text-lg">Couple Image</span>
            </div>
            <p className="font-serif text-2xl font-bold uppercase tracking-tight">„{venueName || "Wedding Hall"}„</p>
            {venueAddress ? <p className="text-sm font-bold" style={{ fontFamily: "'Amiri', 'Traditional Arabic', 'var(--font-arabic)', serif" }}>{venueAddress}</p> : null}
            <p className="font-serif text-xl font-bold">At {weddingTime}</p>
          </div>

          {/* QR */}
          <div className="mt-4 border-t-2 border-black pt-4 flex items-center gap-4">
            <div className="shrink-0 grid h-[80px] w-[80px] place-items-center border-2 border-black bg-white p-1">
              <QRCodeSVG value={invitationUrl || "https://badrdaawa.com"} size={70} level="H" bgColor="#ffffff" fgColor="#111111" marginSize={0} />
            </div>
            <p className="text-xs font-black leading-tight" style={{ fontFamily: "'Amiri', 'Traditional Arabic', 'var(--font-arabic)', serif" }}>
              امسح الكود لمشاهدة الدعوة كاملة
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
