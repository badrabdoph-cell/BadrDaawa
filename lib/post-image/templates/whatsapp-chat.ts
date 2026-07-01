import type { PostImageTemplate } from "../types";

export const whatsappChatPostImageTemplate: PostImageTemplate = {
  id: "whatsapp-chat",
  name: "WhatsApp Chat",
  defaultSize: { id: "portrait-4x5", width: 1080, height: 1350 },
  supportedSizes: [
    { id: "portrait-4x5", width: 1080, height: 1350 },
    { id: "square", width: 1080, height: 1080 },
    { id: "open-graph", width: 1200, height: 630 },
  ],
};
