import { cleanImageExtension, isBrowserDisplayImageExtension } from "./image-formats";

type SharpFactory = typeof import("sharp");

export type DisplayImageResult = {
  bytes: Buffer;
  extension: string;
  converted: boolean;
  originalExtension: string;
};

async function loadSharp(): Promise<SharpFactory> {
  const module = (await import("sharp")) as unknown as { default?: SharpFactory } & SharpFactory;
  return module.default ?? module;
}

const passthroughExtensions = new Set(["svg", "gif"]);
const maxDisplayImageWidth = 1800;
const maxDisplayImageHeight = 2200;
const maxInputPixels = 60_000_000;

export async function normalizeImageForDisplay(bytes: Buffer, extension: string, sourceLabel: string): Promise<DisplayImageResult | null> {
  const originalExtension = cleanImageExtension(extension) || "jpg";
  if (isBrowserDisplayImageExtension(originalExtension) && passthroughExtensions.has(originalExtension)) {
    return {
      bytes,
      extension: originalExtension,
      converted: false,
      originalExtension,
    };
  }

  try {
    const sharp = await loadSharp();
    const converted = await sharp(bytes, { limitInputPixels: maxInputPixels })
      .rotate()
      .resize({
        width: maxDisplayImageWidth,
        height: maxDisplayImageHeight,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: 82,
        effort: 4,
      })
      .toBuffer();

    if (!converted.length) {
      throw new Error("Image conversion produced an empty file.");
    }

    console.log(
      `[Image Conversion] ${sourceLabel}: optimized ${originalExtension} to webp (${bytes.length} -> ${converted.length} bytes).`,
    );

    return {
      bytes: converted,
      extension: "webp",
      converted: originalExtension !== "webp" || converted.length !== bytes.length,
      originalExtension,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message.split("\n")[0] : String(error);
    if (isBrowserDisplayImageExtension(originalExtension)) {
      console.error(`[Image Conversion] Failed to optimize ${sourceLabel} (${originalExtension}); keeping original browser-displayable file. Reason: ${message}`);
      return {
        bytes,
        extension: originalExtension,
        converted: false,
        originalExtension,
      };
    }
    console.error(`[Image Conversion] Failed to convert ${sourceLabel} (${originalExtension}) to browser-safe image. Reason: ${message}`);
    return null;
  }
}
