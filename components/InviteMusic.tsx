"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

const DEFAULT_MUSIC_URL = "/assets/audio/badr-sarah-wedding-3.mp3";

export function InviteMusic({ musicUrl }: { musicUrl?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasAudioErrorRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const audioSource = musicUrl || DEFAULT_MUSIC_URL;

  const start = async () => {
    setNeedsTap(false);
    if (!audioRef.current || hasAudioErrorRef.current) {
      setIsPlaying(false);
      return;
    }

    try {
      audioRef.current.currentTime = audioRef.current.currentTime || 0;
      await audioRef.current.play();
      setIsPlaying(true);
    } catch {
      if (audioRef.current?.error) {
        hasAudioErrorRef.current = true;
        setIsPlaying(false);
        return;
      }
      setNeedsTap(true);
    }
  };

  const stop = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
  };

  useEffect(() => {
    hasAudioErrorRef.current = false;
    const timer = window.setTimeout(() => {
      void start();
    }, 3100);

    const startOnInteraction = () => {
      void start();
    };

    window.addEventListener("pointerdown", startOnInteraction, { once: true, passive: true });
    window.addEventListener("touchstart", startOnInteraction, { once: true, passive: true });
    window.addEventListener("keydown", startOnInteraction, { once: true });
    window.addEventListener("scroll", startOnInteraction, { once: true, passive: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", startOnInteraction);
      window.removeEventListener("touchstart", startOnInteraction);
      window.removeEventListener("keydown", startOnInteraction);
      window.removeEventListener("scroll", startOnInteraction);
    };
  }, [audioSource]);

  return (
    <div className="music-control">
      <audio
        ref={audioRef}
        src={audioSource}
        loop
        preload="auto"
        playsInline
        onCanPlay={() => {
          hasAudioErrorRef.current = false;
        }}
        onError={() => {
          hasAudioErrorRef.current = true;
          setIsPlaying(false);
          setNeedsTap(false);
        }}
      />
      <button
        className={`music-button ${needsTap ? "attention" : ""} ${isPlaying ? "playing" : ""}`}
        type="button"
        onClick={isPlaying ? stop : start}
        aria-label={isPlaying ? "إيقاف الموسيقى" : "تشغيل الموسيقى"}
        title={isPlaying ? "إيقاف الموسيقى" : "تشغيل الموسيقى"}
      >
        {isPlaying ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>
    </div>
  );
}
