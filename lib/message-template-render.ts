import type { Invitation, MessageTemplate } from "./types";

export type MessageTemplateVariables = {
  groomName?: string;
  brideName?: string;
  date?: string;
  venue?: string;
  link?: string;
};

const supportedVariables = ["groomName", "brideName", "date", "venue", "link"] as const;

export function getMessageTemplateVariables() {
  return supportedVariables;
}

function formatTemplateDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function createMessageTemplateVariables(input: Partial<Invitation> & { link?: string }): Required<MessageTemplateVariables> {
  return {
    groomName: input.groomName || "",
    brideName: input.brideName || "",
    date: formatTemplateDate(input.weddingDate),
    venue: input.venue || "",
    link: input.link || "",
  };
}

export function renderMessageTemplateContent(content: string, variables: MessageTemplateVariables) {
  const values: Required<MessageTemplateVariables> = {
    groomName: variables.groomName || "",
    brideName: variables.brideName || "",
    date: variables.date || "",
    venue: variables.venue || "",
    link: variables.link || "",
  };

  return content.replace(/\{\{\s*(groomName|brideName|date|venue|link)\s*\}\}/g, (_match, key: keyof Required<MessageTemplateVariables>) => values[key]);
}

export function renderMessageTemplate(template: Pick<MessageTemplate, "content">, variables: MessageTemplateVariables) {
  return renderMessageTemplateContent(template.content, variables);
}
