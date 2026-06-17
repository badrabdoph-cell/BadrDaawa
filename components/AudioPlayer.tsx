"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function AudioPlayer({
  src,
  label = "موسيقى الدعوة",
  floating = false,
  loop = true,
}: {
  src?: string | null;
  label?: string;
  floating?: boolean;
  loop?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const cleanSrc = typeof src === "string" ? src.trim() : "";
  const progress = useMemo(() => (duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0), [currentTime, duration]);

  const loadAudio = useCallback(() => {
    if (!cleanSrc) return null;
    return audioRef.current;
  }, [cleanSrc]);

  const play = useCallback(async () => {
    const audio = loadAudio();
    if (!audio) return;
    try {
      audio.volume = volume;
      await audio.play();
    } catch {
      setIsPlaying(false);
    }
  }, [loadAudio, volume]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const restart = useCallback(() => {
    const audio = loadAudio();
    if (!audio) return;
    audio.currentTime = 0;
    void play();
  }, [loadAudio, play]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    setIsPlaying(false);
    setHasError(false);
    setDuration(0);
    setCurrentTime(0);
  }, [cleanSrc]);

  if (!cleanSrc) return null;

  return (
    <div className={floating ? "unified-audio-player floating" : "unified-audio-player"}>
      <audio
        ref={audioRef}
        src={cleanSrc}
        loop={loop}
        preload="auto"
        playsInline
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
        onPlay={() => {
          setHasError(false);
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setHasError(true);
          setIsPlaying(false);
        }}
      />

      <button className={isPlaying ? "audio-main-button playing" : "audio-main-button"} type="button" onClick={() => (isPlaying ? pause() : void play())} title={isPlaying ? "إيقاف" : "تشغيل"}>
        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
      </button>
      <div className="audio-player-body">
        <div className="audio-player-head">
          <strong>{label}</strong>
          <span>{hasError ? "تعذر تحميل الملف" : `${formatTime(currentTime)} / ${formatTime(duration)}`}</span>
        </div>
        <input
          className="audio-progress"
          type="range"
          min="0"
          max={Math.max(1, duration || 1)}
          step="0.1"
          value={currentTime}
          onChange={(event) => {
            const audio = loadAudio();
            const nextTime = Number(event.target.value);
            setCurrentTime(nextTime);
            if (audio) audio.currentTime = nextTime;
          }}
          style={{ "--audio-progress": `${progress}%` } as CSSProperties}
          aria-label="تقدم الموسيقى"
        />
      </div>
      <button className="audio-icon-button" type="button" onClick={restart} title="إعادة تشغيل">
        <RotateCcw size={16} />
      </button>
      <label className="audio-volume-control" title="مستوى الصوت">
        {volume > 0 ? <Volume2 size={16} /> : <VolumeX size={16} />}
        <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => setVolume(Number(event.target.value))} aria-label="مستوى الصوت" />
      </label>
    </div>
  );
}
