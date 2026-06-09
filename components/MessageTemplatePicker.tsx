"use client";

import { MessageSquareText } from "lucide-react";
import { renderMessageTemplate } from "@/lib/message-template-render";
import type { MessageTemplate, MessageTemplateKind } from "@/lib/types";
import type { MessageTemplateVariables } from "@/lib/message-template-render";

const labels: Record<MessageTemplateKind, string> = {
  whatsapp: "واتساب",
  welcome: "ترحيب",
  reminder: "تذكير",
};

const kinds: MessageTemplateKind[] = ["whatsapp", "welcome", "reminder"];

export function MessageTemplatePicker({
  templates,
  variables,
  onApply,
  className = "",
  allowedKinds,
}: {
  templates: MessageTemplate[];
  variables: MessageTemplateVariables;
  onApply: (content: string, template: MessageTemplate) => void;
  className?: string;
  allowedKinds?: MessageTemplateKind[];
}) {
  const activeKinds = allowedKinds?.length ? allowedKinds : kinds;
  const visibleTemplates = templates.filter((template) => activeKinds.includes(template.kind));
  if (!visibleTemplates.length) return null;

  return (
    <div className={`message-template-picker ${className}`.trim()}>
      <div className="message-template-picker-head">
        <MessageSquareText size={16} />
        <strong>قوالب الرسائل</strong>
        <span>تطبيق المتغيرات تلقائياً</span>
      </div>
      <div className="message-template-picker-groups">
        {activeKinds.map((kind) => {
          const group = visibleTemplates.filter((template) => template.kind === kind);
          if (!group.length) return null;
          return (
            <div className="message-template-picker-group" key={kind}>
              <span>{labels[kind]}</span>
              <div>
                {group.map((template) => (
                  <button type="button" key={template.id} onClick={() => onApply(renderMessageTemplate(template, variables), template)} title={template.content}>
                    {template.title}
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
