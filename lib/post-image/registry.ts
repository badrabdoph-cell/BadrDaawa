import { newsCardPostImageTemplate } from "./templates/news-card";
import { whatsappChatPostImageTemplate } from "./templates/whatsapp-chat";
import { DEFAULT_POST_IMAGE_SIZE_ID, DEFAULT_POST_IMAGE_TEMPLATE_ID, type PostImageSize, type PostImageSizeId, type PostImageTemplate, type PostImageTemplateId } from "./types";

const templates = [newsCardPostImageTemplate, whatsappChatPostImageTemplate] satisfies PostImageTemplate[];

export function getPostImageTemplates() {
  return templates;
}

export function getPostImageTemplateManifests() {
  return templates.map((template) => template.manifest);
}

export function getDefaultPostImageTemplate() {
  return getPostImageTemplate(DEFAULT_POST_IMAGE_TEMPLATE_ID);
}

export function getPostImageTemplate(templateId?: string | null): PostImageTemplate {
  return templates.find((template) => template.id === templateId) || templates[0];
}

export function getPostImageSize(templateId?: PostImageTemplateId | null, sizeId: PostImageSizeId = DEFAULT_POST_IMAGE_SIZE_ID): PostImageSize {
  const template = getPostImageTemplate(templateId);
  return template.supportedSizes.find((size) => size.id === sizeId) || template.defaultSize;
}
