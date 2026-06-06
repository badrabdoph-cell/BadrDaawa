"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Volume2, VolumeX } from "lucide-react";

export const DEFAULT_INVITE_MUSIC_URL = "/assets/audio/badr-sara-wedding-3.mp3";

const nonInvitationSegments = new Set(["", "admin", "api", "_next", "templates", "order", "pricing", "faq", "contact", "client", "client-invitations"]);

function isInvitationPath(pathname: string | null) {
  const segments = (pathname || "").split("?")[0].split("#")[0].split("/").filter(Boolean);
  if (segments.length !== 1) return false;
  return !nonInvitationSegments.has(segments[0].toLowerCase());
}

export function InviteMusic({ musicUrl }: { musicUrl?: string | null }) {
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const retryTimersRef = useRef<number[]>([]);
  const hasErrorRef = useRef(false);
  const userPausedRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [needsInteraction, setNeedsInteraction] = useState(false);
  const [hasError, setHasError] = useState(false);
  const isEnabledInvitationPath = isInvitationPath(pathname);
  const isDisabled = musicUrl === null || !isEnabledInvitationPath;

  const audioSource = useMemo(() => {
    if (musicUrl === null) return "";
    const source = musicUrl?.trim();
    return source || DEFAULT_INVITE_MUSIC_URL;
  }, [musicUrl]);

  const clearRetryTimer = useCallback(() => {
    retryTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    retryTimersRef.current = [];
  }, []);

  const hardStop = useCallback(
    (resetTime = false) => {
      clearRetryTimer();
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        if (resetTime) audio.currentTime = 0;
      }
      setIsPlaying(false);
      setNeedsInteraction(false);
    },
    [clearRetryTimer],
  );

  const start = useCallback(
    async (forceByButton = false) => {
      const audio = audioRef.current;
      if (isDisabled || !audio || hasErrorRef.current || (!forceByButton && userPausedRef.current)) return false;

      try {
        userPausedRef.current = false;
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
    },
    [clearRetryTimer, isDisabled],
  );

  const stopByUser = useCallback(() => {
    userPausedRef.current = true;
    hardStop(false);
  }, [hardStop]);

  useEffect(() => {
    const audio = audioRef.current;
    if (isDisabled) {
      userPausedRef.current = false;
      hardStop(true);
      setHasError(false);
      return undefined;
    }

    hasErrorRef.current = false;
    userPausedRef.current = false;
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
      if (document.visibilityState === "visible" && audioRef.current?.paused && !userPausedRef.current) {
        void start();
      }
    };

    const stopWhenLeavingPage = () => {
      hardStop(true);
    };

    document.addEventListener("visibilitychange", restartWhenVisible);
    window.addEventListener("pagehide", stopWhenLeavingPage);
    window.addEventListener("beforeunload", stopWhenLeavingPage);
    window.addEventListener("popstate", stopWhenLeavingPage);

    return () => {
      hardStop(true);
      window.removeEventListener("pointerdown", startAfterInteraction);
      window.removeEventListener("touchstart", startAfterInteraction);
      window.removeEventListener("click", startAfterInteraction);
      window.removeEventListener("keydown", startAfterInteraction);
      window.removeEventListener("scroll", startAfterInteraction);
      window.removeEventListener("focus", startAfterInteraction);
      document.removeEventListener("visibilitychange", restartWhenVisible);
      window.removeEventListener("pagehide", stopWhenLeavingPage);
      window.removeEventListener("beforeunload", stopWhenLeavingPage);
      window.removeEventListener("popstate", stopWhenLeavingPage);
    };
  }, [audioSource, clearRetryTimer, hardStop, isDisabled, start]);

  if (isDisabled) return null;

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
          if (audioRef.current && !userPausedRef.current) {
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
        onClick={() => {
          if (isPlaying) {
            stopByUser();
          } else {
            void start(true);
          }
        }}
        aria-label={isPlaying ? "إيقاف الموسيقى" : "تشغيل الموسيقى"}
        title={hasError ? "تعذر تحميل ملف الموسيقى" : isPlaying ? "إيقاف الموسيقى" : "تشغيل الموسيقى"}
      >
        {isPlaying ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>
    </div>
  );
}
