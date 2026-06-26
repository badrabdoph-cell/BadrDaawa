"use client";

import React from "react";
import { QRCodeSVG } from "qrcode.react";

export interface WeddingSharePosterProps {
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

function parseWeddingDate(dateStr: string) {
  const date = new Date(dateStr);
  const day = date.getDate();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  const formattedDate = date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  return { day, month, year, formattedDate };
}

function shortUrl(url: string) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname + urlObj.pathname;
  } catch {
    return url;
  }
}

function PaperTexture() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-12" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="paperPattern" width="320" height="260" patternUnits="userSpaceOnUse">
          <g fill="#4a3526" fontFamily="Georgia" fontSize="15" opacity="0.12">
            <text x="4" y="18">The beautiful glamour</text>
            <text x="4" y="42">Wedding invitation template</text>
            <text x="4" y="66">Love story and celebration</text>
            <text x="4" y="90">Save the date and venue</text>
          </g>
          <g stroke="#4a3526" opacity="0.08">
            <line x1="0" y1="176" x2="220" y2="176" />
            <line x1="0" y1="194" x2="250" y2="194" />
            <line x1="0" y1="212" x2="180" y2="212" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#paperPattern)" />
    </svg>
  );
}

function Header({ date }: { date: ReturnType<typeof parseWeddingDate> }) {
  return (
    <div className="flex justify-between items-center px-[92px] pt-[74px]">
      <span className="text-[31px] font-black text-[#120d09] font-georgia">Wedding invitation</span>
      <span className="text-[38px] font-black text-[#4c2b11]">♥</span>
      <span className="text-[32px] font-black text-[#120d09] text-right">{date.formattedDate}</span>
    </div>
  );
}

function Headline({ headline }: { headline: string }) {
  return (
    <div className="text-center mt-[38px]">
      <div className="w-[856px] h-[5px] bg-black mx-auto" />
      <h2 className="text-[98px] font-black text-[#e73539] mt-[30px] leading-none" dir="rtl">
        {headline}
      </h2>
      <div className="w-[856px] h-[5px] bg-black mx-auto mt-[26px]" />
      <div className="w-[856px] h-[5px] bg-black mx-auto mt-[13px]" />
    </div>
  );
}

function CoupleNames({ groomName, brideName }: { groomName: string; brideName: string }) {
  return (
    <div className="text-center mt-[116px]">
      <h3 className="text-[76px] font-black text-[#4b2b10] leading-none" dir="rtl">
        {groomName} {brideName}
      </h3>
      <div className="w-[856px] h-[5px] bg-black mx-auto mt-[25px]" />
    </div>
  );
}

function PhotoFrame({ coverImage }: { coverImage: string }) {
  return (
    <div className="flex justify-center mt-[40px]">
      <div className="w-[716px] h-[442px] rounded-[26px] overflow-hidden border-4 border-black">
        {coverImage ? (
          <img
            src={coverImage}
            alt="Wedding photo"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#f8efe3] to-[#efe0cc] flex items-center justify-center">
            <svg className="w-24 h-24 text-[#4a3526] opacity-30" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

function DateCard({ date }: { date: ReturnType<typeof parseWeddingDate> }) {
  return (
    <div className="absolute left-[84px] top-[972px] w-[322px] h-[310px]">
      <svg width="322" height="310" viewBox="0 0 322 310">
        <defs>
          <clipPath id="dateCardClip">
            <rect x="0" y="0" width="322" height="310" rx="0" />
          </clipPath>
        </defs>
        <g clipPath="url(#dateCardClip)">
          <path d="M0 0H322V310H0V0ZM0 76C43 76 76 43 76 0H0V76ZM242 0C242 43 275 76 322 76V0H242ZM322 234C275 234 242 275 242 310H322V234ZM76 310C76 275 43 234 0 234V310H76Z" fill="#000" />
          <path d="M0 76C43 76 76 43 76 0H0V76ZM242 0C242 43 275 76 322 76V0H242ZM322 234C275 234 242 275 242 310H322V234ZM76 310C76 275 43 234 0 234V310H76Z" fill="#f8efe3" />
          <text x="161" y="106" textAnchor="middle" fontFamily="Georgia" fontSize="70" fontWeight="900" fill="#fff">{date.day}</text>
          <text x="161" y="202" textAnchor="middle" fontFamily="Georgia" fontSize="48" fill="#fff">{date.month}</text>
          <text x="161" y="292" textAnchor="middle" fontFamily="Georgia" fontSize="56" fontWeight="900" fill="#fff">{date.year}</text>
        </g>
      </svg>
    </div>
  );
}

function SaveTheDateCard({ date, venueName, weddingTime, invitationUrl }: { date: ReturnType<typeof parseWeddingDate>; venueName: string; weddingTime?: string; invitationUrl: string }) {
  const shortInvitationUrl = shortUrl(invitationUrl);
  
  return (
    <div className="absolute right-[112px] top-[954px]">
      <div className="w-[430px]">
        <h4 className="text-[58px] font-black text-black text-center mb-[25px] font-georgia">Save the date</h4>
        <div className="w-[356px] h-[4px] bg-black mx-auto" />
        <div className="mt-[57px] bg-[#fffaf1] opacity-[0.82] border-[3px] border-[#16120f] rounded-sm p-4 relative">
          <div className="border-2 border-[#16120f] p-4">
            <div className="text-center mb-4">
              <svg className="w-16 h-16 mx-auto text-[#4a3526]" viewBox="0 0 64 64" fill="currentColor">
                <path d="M32 4c-4.4 0-8 3.6-8 8v4h-4c-2.2 0-4 1.8-4 4v32c0 2.2 1.8 4 4 4h24c2.2 0 4-1.8 4-4v-32c0-2.2-1.8-4-4-4h-4v-4c0-4.4-3.6-8-8-8zm0 4c2.2 0 4 1.8 4 4v4h-8v-4c0-2.2 1.8-4 4-4zm-12 12h24v32h-24v-32z" />
              </svg>
            </div>
            <div className="text-center mb-4">
              <span className="text-[54px] font-black text-black font-georgia">{date.month}</span>
            </div>
            <div className="text-center mb-4">
              <span className="text-[28px] font-black text-black" dir="rtl">{venueName}</span>
            </div>
            <div className="text-center mb-4">
              <span className="text-[34px] font-black text-black font-georgia">At {weddingTime || "8 pm"}</span>
            </div>
            <div className="flex justify-center mt-4">
              <QRCodeSVG
                value={invitationUrl}
                size={116}
                level="H"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
          </div>
        </div>
        <div className="mt-4 text-center">
          <p className="text-[15px] font-black text-[#20140d] mb-2" dir="rtl">امسح الكود لمشاهدة الدعوة الكاملة</p>
          <p className="text-[20px] font-black text-[#13100d] font-georgia">{shortInvitationUrl}</p>
        </div>
      </div>
    </div>
  );
}

export default function WeddingSharePosterClassic({
  groomName,
  brideName,
  coverImage,
  weddingDate,
  venueName,
  venueAddress,
  weddingTime = "8 pm",
  invitationUrl,
  headline = "خبر عاجل !!!",
}: WeddingSharePosterProps) {
  const date = parseWeddingDate(weddingDate);

  return (
    <article
      dir="ltr"
      className="relative w-[1080px] h-[1350px] overflow-hidden bg-[#f7eddf]"
      style={{
        fontFamily: "Georgia, 'Times New Roman', var(--font-arabic), 'Cairo', 'Tajawal', serif",
      }}
    >
      {/* Background Gradient */}
      <div className="absolute inset-0">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="bgGradient" cx="50%" cy="18%" r="80%">
              <stop offset="0%" stopColor="#fffaf2" />
              <stop offset="62%" stopColor="#f8efe3" />
              <stop offset="100%" stopColor="#efe0cc" />
            </radialGradient>
          </defs>
          <rect width="1080" height="1350" fill="url(#bgGradient)" />
        </svg>
      </div>

      {/* Paper Texture */}
      <PaperTexture />

      {/* Decorative Side Panels */}
      <div className="absolute -left-[70px] -top-[10px] w-[310px] h-[1400px] opacity-[0.42] transform -rotate-8">
        <PaperTexture />
      </div>
      <div className="absolute right-[830px] -top-[50px] w-[320px] h-[1450px] opacity-[0.42] transform rotate-12">
        <PaperTexture />
      </div>

      {/* Header */}
      <Header date={date} />

      {/* Divider */}
      <div className="w-[856px] h-[5px] bg-black mx-auto mt-[18px]" />

      {/* Headline */}
      <Headline headline={headline} />

      {/* Couple Names */}
      <CoupleNames groomName={groomName} brideName={brideName} />

      {/* Divider */}
      <div className="w-[856px] h-[5px] bg-black mx-auto mt-[25px]" />

      {/* Photo Frame */}
      <PhotoFrame coverImage={coverImage} />

      {/* Divider */}
      <div className="w-[856px] h-[5px] bg-black mx-auto mt-[68px]" />

      {/* Date Card */}
      <DateCard date={date} />

      {/* Vertical Divider */}
      <div className="absolute left-[480px] top-[954px] w-[3px] h-[392px] bg-black" />

      {/* Save The Date Card */}
      <SaveTheDateCard date={date} venueName={venueName} weddingTime={weddingTime} invitationUrl={invitationUrl} />
    </article>
  );
}
