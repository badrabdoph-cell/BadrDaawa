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

export async function normalizeImageForDisplay(bytes: Buffer, extension: string, sourceLabel: string): Promise<DisplayImageResult | null> {
  const originalExtension = cleanImageExtension(extension) || "jpg";
  if (isBrowserDisplayImageExtension(originalExtension)) {
    return {
      bytes,
      extension: originalExtension,
      converted: false,
      originalExtension,
    };
  }

  try {
    const sharp = await loadSharp();
    const converted = await sharp(bytes, { limitInputPixels: false })
      .rotate()
      .jpeg({
        quality: 88,
        mozjpeg: true,
      })
      .toBuffer();

    if (!converted.length) {
      throw new Error("Image conversion produced an empty file.");
    }

    console.log(
      `[Image Conversion] ${sourceLabel}: converted ${originalExtension} to jpg (${bytes.length} -> ${converted.length} bytes).`,
    );

    return {
      bytes: converted,
      extension: "jpg",
      converted: true,
      originalExtension,
    };
  } catch (error) {
    console.error(`[Image Conversion] Failed to convert ${sourceLabel} (${originalExtension}) to browser-safe jpg.`, error);
    return null;
  }
}
