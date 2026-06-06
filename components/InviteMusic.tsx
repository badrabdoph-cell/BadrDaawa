"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

export const DEFAULT_INVITE_MUSIC_URL = "/assets/audio/badr-sara-wedding-3.mp3";

export function InviteMusic({ musicUrl }: { musicUrl?: string | null }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const retryTimersRef = useRef<number[]>([]);
  const hasErrorRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [needsInteraction, setNeedsInteraction] = useState(false);
  const [hasError, setHasError] = useState(false);

  const audioSource = useMemo(() => {
    const source = musicUrl?.trim();
    return source || DEFAULT_INVITE_MUSIC_URL;
  }, [musicUrl]);

  const clearRetryTimer = useCallback(() => {
    retryTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    retryTimersRef.current = [];
  }, []);

  const start = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || hasErrorRef.current) return false;

    try {
      audio.loop = true;
      audio.volume = 1;
      audio.muted = false;
      if (audio.readyState === 0) audio.load();
      if (!audio.currentTime) audio.currentTime = 0;
      await audio.play();
      setIsPlaying(true);
      setNeedsInteraction(false);
      clearRetryTimer();
      return true;
    } catch {
      setIsPlaying(false);
      setNeedsInteraction(true);
      return false;
    }
  }, [clearRetryTimer]);

  const stop = useCallback(() => {
    clearRetryTimer();
    audioRef.current?.pause();
    setIsPlaying(false);
    setNeedsInteraction(false);
  }, [clearRetryTimer]);

  useEffect(() => {
    const audio = audioRef.current;
    hasErrorRef.current = false;
    setHasError(false);
    setIsPlaying(false);
    setNeedsInteraction(false);
    clearRetryTimer();
    audio?.load();

    const attemptStart = () => {
      void start();
    };

    const retryDelays = [120, 700, 1600, 3200];
    retryTimersRef.current = retryDelays.map((delay) => window.setTimeout(attemptStart, delay));

    const startAfterInteraction = () => {
      void start();
    };

    window.addEventListener("pointerdown", startAfterInteraction, { passive: true });
    window.addEventListener("touchstart", startAfterInteraction, { passive: true });
    window.addEventListener("click", startAfterInteraction);
    window.addEventListener("keydown", startAfterInteraction);
    window.addEventListener("scroll", startAfterInteraction, { passive: true });
    window.addEventListener("focus", startAfterInteraction);

    const restartWhenVisible = () => {
      if (document.visibilityState === "visible" && audioRef.current?.paused) {
        void start();
      }
    };

    document.addEventListener("visibilitychange", restartWhenVisible);

    return () => {
      clearRetryTimer();
      audio?.pause();
      window.removeEventListener("pointerdown", startAfterInteraction);
      window.removeEventListener("touchstart", startAfterInteraction);
      window.removeEventListener("click", startAfterInteraction);
      window.removeEventListener("keydown", startAfterInteraction);
      window.removeEventListener("scroll", startAfterInteraction);
      window.removeEventListener("focus", startAfterInteraction);
      document.removeEventListener("visibilitychange", restartWhenVisible);
    };
  }, [audioSource, clearRetryTimer, start]);

  return (
    <div className="music-control">
      <audio
        ref={audioRef}
        src={audioSource}
        autoPlay
        loop
        preload="auto"
        playsInline
        onCanPlay={() => {
          hasErrorRef.current = false;
          setHasError(false);
          void start();
        }}
        onEnded={() => {
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            void start();
          }
        }}
        onError={() => {
          hasErrorRef.current = true;
          setHasError(true);
          setIsPlaying(false);
          setNeedsInteraction(false);
        }}
        onPause={() => {
          setIsPlaying(false);
        }}
        onPlay={() => {
          setIsPlaying(true);
          setNeedsInteraction(false);
        }}
      />
      <button
        className={`music-button ${needsInteraction ? "attention" : ""} ${isPlaying ? "playing" : ""}`}
        type="button"
        onClick={isPlaying ? stop : start}
        aria-label={isPlaying ? "إيقاف الموسيقى" : "تشغيل الموسيقى"}
        title={hasError ? "تعذر تحميل ملف الموسيقى" : isPlaying ? "إيقاف الموسيقى" : "تشغيل الموسيقى"}
      >
        {isPlaying ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>
    </div>
  );
}
