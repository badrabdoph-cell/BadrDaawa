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
const heicExtensions = new Set(["heic", "heif"]);
const maxDisplayImageWidth = 1800;
const maxDisplayImageHeight = 2200;
const maxInputPixels = 60_000_000;

async function convertHeicToJpeg(bytes: Buffer, sourceLabel: string, reason: string): Promise<DisplayImageResult | null> {
  try {
    const module = (await import("heic-convert")) as { default?: typeof import("heic-convert") } & typeof import("heic-convert");
    const convert = module.default ?? module;
    const output = await convert({
      buffer: bytes,
      format: "JPEG",
      quality: 0.86,
    });
    const converted = Buffer.isBuffer(output)
      ? output
      : output instanceof ArrayBuffer
        ? Buffer.from(output)
        : Buffer.from(output.buffer, output.byteOffset, output.byteLength);
    if (!converted.length) throw new Error("HEIC conversion produced an empty file.");

    console.log(
      `[Image Conversion] ${sourceLabel}: converted HEIC/HEIF to jpg after sharp failure (${bytes.length} -> ${converted.length} bytes). Sharp reason: ${reason}`,
    );

    return {
      bytes: converted,
      extension: "jpg",
      converted: true,
      originalExtension: "heic",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message.split("\n")[0] : String(error);
    console.error(`[Image Conversion] ${sourceLabel}: HEIC/HEIF fallback conversion failed. Reason: ${message}`);
    return null;
  }
}

export async function normalizeImageForDisplay(bytes: Buffer, extension: string, sourceLabel: string): Promise<DisplayImageResult | null> {
  const originalExtension = cleanImageExtension(extension);
  if (!bytes.length || !originalExtension) {
    console.error(`[Image Conversion] ${sourceLabel}: rejected empty or unsupported image (${bytes.length} bytes, ${extension || "unknown"}).`);
    return null;
  }

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
    if (heicExtensions.has(originalExtension)) {
      return convertHeicToJpeg(bytes, sourceLabel, message);
    }

    if (isBrowserDisplayImageExtension(originalExtension)) {
      console.error(`[Image Conversion] ${sourceLabel}: sharp optimization failed for ${originalExtension}; saved original browser-displayable file. Reason: ${message}`);
      return {
        bytes,
        extension: originalExtension,
        converted: false,
        originalExtension,
      };
    }
    console.error(`[Image Conversion] ${sourceLabel}: sharp conversion failed for non-displayable ${originalExtension}. Reason: ${message}`);
    return null;
  }
}
