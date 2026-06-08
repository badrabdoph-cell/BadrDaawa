"use client";

import { Sparkles } from "lucide-react";
import type { ContentPreset, ContentPresetKind, InvitationTexts } from "@/lib/types";

const labels: Record<ContentPresetKind, string> = {
  opening: "افتتاحيات",
  welcome: "ترحيب",
  rsvp: "RSVP",
};

const kinds: ContentPresetKind[] = ["opening", "welcome", "rsvp"];

function presetPatch(preset: ContentPreset): Partial<InvitationTexts> {
  if (preset.kind === "welcome") {
    return { inviteMessageSecondary: preset.content };
  }
  if (preset.kind === "rsvp") {
    return {
      rsvpQuestion: preset.content,
      ...(preset.secondaryContent ? { rsvpDeclinedMessage: preset.secondaryContent } : {}),
    };
  }
  return { inviteMessage: preset.content };
}

export function ContentPresetPicker({
  presets,
  onApply,
  className = "",
}: {
  presets: ContentPreset[];
  onApply: (patch: Partial<InvitationTexts>, preset: ContentPreset) => void;
  className?: string;
}) {
  if (!presets.length) return null;

  return (
    <div className={`content-preset-picker ${className}`.trim()}>
      <div className="content-preset-picker-head">
        <Sparkles size={16} />
        <strong>نصوص جاهزة</strong>
        <span>تطبيق بضغطة واحدة</span>
      </div>
      <div className="content-preset-picker-groups">
        {kinds.map((kind) => {
          const group = presets.filter((preset) => preset.kind === kind);
          if (!group.length) return null;
          return (
            <div className="content-preset-picker-group" key={kind}>
              <span>{labels[kind]}</span>
              <div>
                {group.map((preset) => (
                  <button type="button" key={preset.id} onClick={() => onApply(presetPatch(preset), preset)} title={preset.content}>
                    {preset.title}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
