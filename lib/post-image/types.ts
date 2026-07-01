export const DEFAULT_POST_IMAGE_TEMPLATE_ID = "breaking-news-v1" as const;
export const DEFAULT_POST_IMAGE_SIZE_ID = "portrait-4x5" as const;

export type PostImageTemplateId = typeof DEFAULT_POST_IMAGE_TEMPLATE_ID | (string & {});

export type PostImageStatus = "NEEDS_REGENERATION" | "GENERATING" | "GENERATED" | "FAILED" | "DISABLED";

export type PostImageDisplayStatus = "Needs Regeneration" | "Generating" | "Generated" | "Failed" | "Disabled";

export type PostImageSizeId = typeof DEFAULT_POST_IMAGE_SIZE_ID | "square" | "open-graph" | (string & {});

export type PostImageSize = {
  id: PostImageSizeId;
  width: number;
  height: number;
};

export type PostImageSignatureInput = {
  templateId: PostImageTemplateId;
  size: PostImageSize;
  groomName: string;
  brideName: string;
  weddingDate: string | Date | null | undefined;
  coverImageUrl: string | null | undefined;
  invitationUrl: string;
};

export type PostImageRenderPayload = PostImageSignatureInput & {
  title: "خبر عاجل!!";
  coupleLine: string;
  curiosityDate: string;
  qrCodeDataUrl: string;
  coverImageDataUrl: string | null;
  mastheadLeft?: string;
  mastheadRight?: string;
  footerLabel?: string;
};

export type PostImageGeneratedAsset = {
  bytes: Buffer;
  contentType: "image/png";
  width: number;
  height: number;
  signature: string;
  qrCodeDataUrl: string;
};

export type PostImageTemplate = {
  id: PostImageTemplateId;
  name: string;
  defaultSize: PostImageSize;
  supportedSizes: PostImageSize[];
  renderSvg: (payload: PostImageRenderPayload) => string;
};
