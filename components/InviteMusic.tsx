"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

const DEFAULT_MUSIC_URL = "/assets/audio/badr-sarah-wedding-3.mp3";

function playGeneratedLoop() {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  const context = new AudioContextClass();
  const gain = context.createGain();
  gain.gain.value = 0.035;
  gain.connect(context.destination);

  let stopped = false;
  const notes = [392, 440, 523.25, 659.25, 523.25, 440];

  const schedule = () => {
    if (stopped) return;
    const start = context.currentTime + 0.05;
    notes.forEach((frequency, index) => {
      const osc = context.createOscillator();
      const noteGain = context.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      noteGain.gain.setValueAtTime(0.0001, start + index * 0.58);
      noteGain.gain.exponentialRampToValueAtTime(0.55, start + index * 0.58 + 0.08);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, start + index * 0.58 + 0.48);
      osc.connect(noteGain);
      noteGain.connect(gain);
      osc.start(start + index * 0.58);
      osc.stop(start + index * 0.58 + 0.5);
    });
  };

  schedule();
  const loop = window.setInterval(schedule, 3600);

  return {
    stop: () => {
      stopped = true;
      window.clearInterval(loop);
      void context.close();
    },
  };
}

export function InviteMusic({ musicUrl }: { musicUrl?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const generatedRef = useRef<{ stop: () => void } | null>(null);
  const hasAudioErrorRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const audioSource = musicUrl || DEFAULT_MUSIC_URL;

  const startGenerated = () => {
    try {
      generatedRef.current?.stop();
      generatedRef.current = playGeneratedLoop();
      setIsPlaying(Boolean(generatedRef.current));
      setNeedsTap(!generatedRef.current);
    } catch {
      setNeedsTap(true);
    }
  };

  const start = async () => {
    setNeedsTap(false);
    if (audioRef.current && !hasAudioErrorRef.current) {
      try {
        audioRef.current.currentTime = audioRef.current.currentTime || 0;
        await audioRef.current.play();
        setIsPlaying(true);
        return;
      } catch (error) {
        if (audioRef.current.error) {
          hasAudioErrorRef.current = true;
          startGenerated();
          return;
        }
        setNeedsTap(true);
        return;
      }
    }

    startGenerated();
  };

  const stop = () => {
    audioRef.current?.pause();
    generatedRef.current?.stop();
    generatedRef.current = null;
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
      generatedRef.current?.stop();
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
          void start();
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
