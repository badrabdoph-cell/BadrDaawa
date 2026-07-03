import QRCode from "qrcode";
import sharp from "sharp";

import { readPublicMediaFile } from "../storage-provider";
import { formatPostImageCuriosityDate } from "./date";
import { embedPostImageFonts } from "./font";
import { getPostImageSize, getPostImageTemplate } from "./registry";
import { renderPostImageSvg } from "./render-svg";
import { createPostImageSignature } from "./signature";
import { DEFAULT_POST_IMAGE_SIZE_ID, DEFAULT_POST_IMAGE_TEMPLATE_ID, type PostImageGeneratedAsset, type PostImageGeneratedSet, type PostImageSignatureInput, type PostImageVariantAsset } from "./types";

export type GeneratePostImageInput = Omit<PostImageSignatureInput, "templateId" | "size"> & {
  templateId?: string | null;
  sizeId?: string | null;
};

async function imageToDataUrl(url: string | null | undefined, width: number, height: number) {
  if (!url) return null;

  try {
    const file = await readPublicMediaFile(url);
    if (!file) return null;
    const normalized = await sharp(file)
      .rotate()
      .resize(width, height, { fit: "cover", position: "top" })
      .jpeg({ quality: 86, mozjpeg: true })
      .toBuffer();

    return `data:image/jpeg;base64,${normalized.toString("base64")}`;
  } catch (error) {
    console.error("[post-image] Failed to read cover image", error);
    return null;
  }
}

export async function generatePostImage(input: GeneratePostImageInput): Promise<PostImageGeneratedAsset> {
  const template = getPostImageTemplate(input.templateId || DEFAULT_POST_IMAGE_TEMPLATE_ID);
  const size = getPostImageSize(template.id, (input.sizeId || DEFAULT_POST_IMAGE_SIZE_ID) as never);
  const signatureInput: PostImageSignatureInput = {
    templateId: template.id,
    size,
    groomName: input.groomName,
    brideName: input.brideName,
    weddingDate: input.weddingDate,
    coverImageUrl: input.coverImageUrl,
    invitationUrl: input.invitationUrl,
  };
  const signature = createPostImageSignature(signatureInput);
  const qrCodeDataUrl = await QRCode.toDataURL(input.invitationUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
    color: {
      dark: "#211b1c",
      light: "#ffffff",
    },
  });
  const coverImageDataUrl = await imageToDataUrl(input.coverImageUrl, size.width, Math.round(size.height * 0.38));
  const svg = renderPostImageSvg({
    ...signatureInput,
    title: "خبر عاجل!!",
    coupleLine: `${input.groomName.trim()} هيتجوز ${input.brideName.trim()}`,
    curiosityDate: formatPostImageCuriosityDate(input.weddingDate),
    qrCodeDataUrl,
    coverImageDataUrl,
    fontCss: embedPostImageFonts(),
  });
  const bytes = await sharp(Buffer.from(svg)).png({ compressionLevel: 8, quality: 92 }).toBuffer();

  return {
    bytes,
    contentType: "image/png",
    size,
    width: size.width,
    height: size.height,
    signature,
    qrCodeDataUrl,
  };
}

export async function generatePostImageSet(input: GeneratePostImageInput): Promise<PostImageGeneratedSet> {
  const portrait = await generatePostImage({ ...input, sizeId: "portrait-4x5" });
  const openGraph = await generatePostImage({ ...input, sizeId: "open-graph" });
  return {
    portrait: { ...portrait, variant: "portrait" } satisfies PostImageVariantAsset,
    openGraph: { ...openGraph, variant: "openGraph" } satisfies PostImageVariantAsset,
  };
}
