"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { inviteOpenedEventName } from "./InviteOpening";

const nonInvitationSegments = new Set(["", "admin", "api", "_next", "templates", "order", "pricing", "faq", "contact", "client", "client-invitations", "manage"]);
let activeInviteAudio: HTMLAudioElement | null = null;

function isTemplatePreviewPath(segments: string[]) {
  return segments.length === 3 && segments[0]?.toLowerCase() === "templates" && Boolean(segments[1]) && segments[2]?.toLowerCase() === "preview";
}

function isMusicEnabledPath(pathname: string | null) {
  const segments = (pathname || "").split("?")[0].split("#")[0].split("/").filter(Boolean);
  if (isTemplatePreviewPath(segments)) return true;
  if (segments.length !== 1) return false;
  return !nonInvitationSegments.has(segments[0].toLowerCase());
}

function stopAudio(audio: HTMLAudioElement | null) {
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
  if (activeInviteAudio === audio) activeInviteAudio = null;
}

export function InviteMusic({ musicUrl }: { musicUrl?: string | null }) {
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const userStoppedRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(false);
  const cleanMusicUrl = typeof musicUrl === "string" ? musicUrl.trim() : "";
  const enabledPath = isMusicEnabledPath(pathname);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return false;

    if (activeInviteAudio && activeInviteAudio !== audio) {
      stopAudio(activeInviteAudio);
    }

    activeInviteAudio = audio;
    audio.muted = false;
    audio.volume = 1;

    try {
      await audio.play();
      setNeedsGesture(false);
      setIsPlaying(true);
      return true;
    } catch {
      setNeedsGesture(true);
      setIsPlaying(false);
      return false;
    }
  }, []);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    if (!cleanMusicUrl || !enabledPath) {
      stopAudio(audioRef.current);
      setIsPlaying(false);
      setNeedsGesture(false);
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;
    audio.loop = true;
    audio.preload = "auto";
    audio.setAttribute("playsinline", "");
    audio.load();

    const onPlay = () => {
      setNeedsGesture(false);
      setIsPlaying(true);
    };
    const onPause = () => setIsPlaying(false);
    const onError = () => {
      setNeedsGesture(true);
      setIsPlaying(false);
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("error", onError);

    function playAfterOpening() {
      const currentAudio = audioRef.current;
      if (!currentAudio) return;
      if (currentAudio === audio && !currentAudio.paused) return;
      void play();
    }
    function playAfterGesture() {
      const currentAudio = audioRef.current;
      if (!currentAudio || currentAudio !== audio || !currentAudio.paused || userStoppedRef.current) return;
      void play();
    }
    function stopOnLeave() {
      stopAudio(audio);
      userStoppedRef.current = false;
    }
    function onVisibilityChange() {
      if (document.hidden) {
        const currentAudio = audioRef.current;
        if (currentAudio && !currentAudio.paused) {
          pause();
        }
      }
    }

    window.addEventListener(inviteOpenedEventName, playAfterOpening);
    window.addEventListener("pointerdown", playAfterGesture, { passive: true });
    window.addEventListener("keydown", playAfterGesture);
    window.addEventListener("pagehide", stopOnLeave);
    document.addEventListener("visibilitychange", onVisibilityChange);
    const isHomePreview = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("homePreview") === "1";
    if (!isHomePreview) void play();

    return () => {
      window.removeEventListener(inviteOpenedEventName, playAfterOpening);
      window.removeEventListener("pointerdown", playAfterGesture);
      window.removeEventListener("keydown", playAfterGesture);
      window.removeEventListener("pagehide", stopOnLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("error", onError);
      stopAudio(audio);
    };
  }, [cleanMusicUrl, enabledPath, pathname, play, pause]);

  if (!cleanMusicUrl || !enabledPath) return null;

  return (
    <div className="music-control" aria-live="polite">
      <audio ref={audioRef} src={cleanMusicUrl} loop preload="auto" playsInline />
      <button
        className={["music-button", needsGesture ? "attention" : "", isPlaying ? "playing" : ""].filter(Boolean).join(" ")}
        type="button"
        onClick={() => {
          const audio = audioRef.current;
          if (!audio || audio.paused || needsGesture) {
            userStoppedRef.current = false;
            void play();
            return;
          }
          userStoppedRef.current = true;
          pause();
        }}
        title={!isPlaying ? "تشغيل الموسيقى" : "إيقاف الموسيقى"}
        aria-label={!isPlaying ? "تشغيل الموسيقى" : "إيقاف الموسيقى"}
      >
        {!isPlaying ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
    </div>
  );
}
