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

function parseWeddingDate(value: string) {
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const clean = (value || "").trim();
  let date: Date | null = null;
  const iso = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  const dmy = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (iso) date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  else if (dmy) date = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  else { const n = new Date(clean); if (!Number.isNaN(n.getTime())) date = n; }
  if (!date || Number.isNaN(date.getTime())) date = new Date();
  const day = String(date.getDate());
  const month = MONTHS[date.getMonth()] || "";
  const year = String(date.getFullYear());
  const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
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
    <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0.12 }} xmlns="http://www.w3.org/2000/svg">
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
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "74px 92px 0" }}>
      <span style={{ fontSize: "31px", fontWeight: "900", color: "#120d09", fontFamily: "Georgia" }}>Wedding invitation</span>
      <span style={{ fontSize: "38px", fontWeight: "900", color: "#4c2b11" }}>♥</span>
      <span style={{ fontSize: "32px", fontWeight: "900", color: "#120d09", textAlign: "right" }}>{date.formattedDate}</span>
    </div>
  );
}

function Headline({ headline }: { headline: string }) {
  return (
    <div style={{ textAlign: "center", marginTop: "38px" }}>
      <div style={{ width: "856px", height: "5px", backgroundColor: "black", margin: "0 auto" }} />
      <h2 style={{ fontSize: "98px", fontWeight: "900", color: "#e73539", marginTop: "30px", lineHeight: 1, marginBottom: 0 }} dir="rtl">
        {headline}
      </h2>
      <div style={{ width: "856px", height: "5px", backgroundColor: "black", margin: "26px auto 0" }} />
      <div style={{ width: "856px", height: "5px", backgroundColor: "black", margin: "13px auto 0" }} />
    </div>
  );
}

function CoupleNames({ groomName, brideName }: { groomName: string; brideName: string }) {
  return (
    <div style={{ textAlign: "center", marginTop: "116px" }}>
      <h3 style={{ fontSize: "76px", fontWeight: "900", color: "#4b2b10", lineHeight: 1, marginBottom: 0 }} dir="rtl">
        {groomName} {brideName}
      </h3>
      <div style={{ width: "856px", height: "5px", backgroundColor: "black", margin: "25px auto 0" }} />
    </div>
  );
}

function PhotoFrame({ coverImage }: { coverImage: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: "40px" }}>
      <div style={{ width: "716px", height: "442px", borderRadius: "26px", overflow: "hidden", border: "4px solid black" }}>
        {coverImage ? (
          <img
            src={coverImage}
            alt="Wedding photo"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "linear-gradient(to bottom right, #f8efe3, #efe0cc)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg style={{ width: "96px", height: "96px", color: "#4a3526", opacity: 0.3 }} fill="currentColor" viewBox="0 0 24 24">
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
    <div style={{ position: "absolute", left: "84px", top: "972px", width: "322px", height: "310px" }}>
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
    <div style={{ position: "absolute", right: "112px", top: "954px" }}>
      <div style={{ width: "430px" }}>
        <h4 style={{ fontSize: "58px", fontWeight: "900", color: "black", textAlign: "center", marginBottom: "25px", fontFamily: "Georgia" }}>Save the date</h4>
        <div style={{ width: "356px", height: "4px", backgroundColor: "black", margin: "0 auto" }} />
        <div style={{ marginTop: "57px", backgroundColor: "#fffaf1", opacity: 0.82, border: "3px solid #16120f", borderRadius: "2px", padding: "16px", position: "relative" }}>
          <div style={{ border: "2px solid #16120f", padding: "16px" }}>
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <svg style={{ width: "64px", height: "64px", margin: "0 auto", color: "#4a3526" }} viewBox="0 0 64 64" fill="currentColor">
                <path d="M32 4c-4.4 0-8 3.6-8 8v4h-4c-2.2 0-4 1.8-4 4v32c0 2.2 1.8 4 4 4h24c2.2 0 4-1.8 4-4v-32c0-2.2-1.8-4-4-4h-4v-4c0-4.4-3.6-8-8-8zm0 4c2.2 0 4 1.8 4 4v4h-8v-4c0-2.2 1.8-4 4-4zm-12 12h24v32h-24v-32z" />
              </svg>
            </div>
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <span style={{ fontSize: "54px", fontWeight: "900", color: "black", fontFamily: "Georgia" }}>{date.month}</span>
            </div>
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <span style={{ fontSize: "28px", fontWeight: "900", color: "black" }} dir="rtl">{venueName}</span>
            </div>
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <span style={{ fontSize: "34px", fontWeight: "900", color: "black", fontFamily: "Georgia" }}>At {weddingTime || "8 pm"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginTop: "16px" }}>
              <QRCodeSVG
                value={invitationUrl || "https://badrdaawa.com"}
                size={116}
                level="H"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
          </div>
        </div>
        <div style={{ marginTop: "16px", textAlign: "center" }}>
          <p style={{ fontSize: "15px", fontWeight: "900", color: "#20140d", marginBottom: "8px" }} dir="rtl">امسح الكود لمشاهدة الدعوة الكاملة</p>
          <p style={{ fontSize: "20px", fontWeight: "900", color: "#13100d", fontFamily: "Georgia" }}>{shortInvitationUrl}</p>
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
      style={{
        width: "1080px",
        height: "1350px",
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#f7eddf",
        fontFamily: "Georgia, 'Times New Roman', 'Cairo', 'Tajawal', serif",
      }}
    >
      {/* Background Gradient */}
      <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bgGradient" cx="50%" cy="18%" r="80%">
            <stop offset="0%" stopColor="#fffaf2" />
            <stop offset="62%" stopColor="#f8efe3" />
            <stop offset="100%" stopColor="#efe0cc" />
          </radialGradient>
        </defs>
        <rect width="1080" height="1350" fill="url(#bgGradient)" />
      </svg>

      {/* Paper Texture */}
      <PaperTexture />

      {/* Decorative Side Panels */}
      <div style={{ position: "absolute", left: "-70px", top: "-10px", width: "310px", height: "1400px", opacity: 0.42, transform: "rotate(-8deg)" }}>
        <PaperTexture />
      </div>
      <div style={{ position: "absolute", right: "-70px", top: "-50px", width: "320px", height: "1450px", opacity: 0.42, transform: "rotate(12deg)" }}>
        <PaperTexture />
      </div>

      {/* Header */}
      <Header date={date} />

      {/* Divider */}
      <div style={{ width: "856px", height: "5px", backgroundColor: "black", margin: "18px auto 0" }} />

      {/* Headline */}
      <Headline headline={headline} />

      {/* Couple Names */}
      <CoupleNames groomName={groomName} brideName={brideName} />

      {/* Divider */}
      <div style={{ width: "856px", height: "5px", backgroundColor: "black", margin: "25px auto 0" }} />

      {/* Photo Frame */}
      <PhotoFrame coverImage={coverImage} />

      {/* Divider */}
      <div style={{ width: "856px", height: "5px", backgroundColor: "black", margin: "68px auto 0" }} />

      {/* Date Card */}
      <DateCard date={date} />

      {/* Vertical Divider */}
      <div style={{ position: "absolute", left: "480px", top: "954px", width: "3px", height: "392px", backgroundColor: "black" }} />

      {/* Save The Date Card */}
      <SaveTheDateCard date={date} venueName={venueName} weddingTime={weddingTime} invitationUrl={invitationUrl} />
    </article>
  );
}
