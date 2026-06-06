"use client";

import { useEffect, useRef, useState } from "react";
import { Music, Pause, Play } from "lucide-react";

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);

  const start = async () => {
    setNeedsTap(false);
    if (musicUrl && audioRef.current) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
        return;
      } catch {
        setNeedsTap(true);
        return;
      }
    }

    try {
      generatedRef.current?.stop();
      generatedRef.current = playGeneratedLoop();
      setIsPlaying(Boolean(generatedRef.current));
      setNeedsTap(!generatedRef.current);
    } catch {
      setNeedsTap(true);
    }
  };

  const stop = () => {
    audioRef.current?.pause();
    generatedRef.current?.stop();
    generatedRef.current = null;
    setIsPlaying(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void start();
    }, 3100);
    return () => {
      window.clearTimeout(timer);
      generatedRef.current?.stop();
    };
  }, [musicUrl]);

  return (
    <div className="music-control">
      {musicUrl ? <audio ref={audioRef} src={musicUrl} loop preload="auto" /> : null}
      <button className={`music-button ${needsTap ? "attention" : ""}`} type="button" onClick={isPlaying ? stop : start}>
        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        <Music size={17} />
        <span>{isPlaying ? "الموسيقى شغالة" : needsTap ? "اضغط لتشغيل الموسيقى" : "تشغيل الموسيقى"}</span>
      </button>
    </div>
  );
}
