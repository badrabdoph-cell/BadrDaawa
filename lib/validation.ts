import { z } from "zod";

const validDateString = (value: string) => !Number.isNaN(Date.parse(value));

const coupleStoryItemSchema = z.object({
  id: z.string().trim().max(80).optional(),
  date: z.string().trim().max(80).optional().default(""),
  title: z.string().trim().max(120).optional().default(""),
  description: z.string().trim().max(700).optional().default(""),
});

export const orderRequestSchema = z.object({
  groomName: z.string().trim().min(2),
  brideName: z.string().trim().min(2),
  phone: z.string().trim().regex(/^01\d{9}$/, "رقم الهاتف غير صحيح"),
  weddingDate: z.string().trim().min(8).refine(validDateString, "اكتب تاريخ صحيح"),
  weddingTime: z.string().trim().optional().default("07:00 مساءً"),
  venue: z.string().trim().optional().default(""),
  mapUrl: z.string().trim().max(500).optional().default(""),
  notes: z.string().trim().max(1000).optional(),
  orderImages: z.array(z.string()).max(3).optional().default([]),
  photographerEnabled: z.boolean().optional().default(false),
  photographerName: z.string().trim().max(120).optional().default(""),
  photographerDescription: z.string().trim().max(500).optional().default(""),
  photographerLogoUrl: z.string().trim().max(500).optional().default(""),
  photographerFacebookUrl: z.string().trim().max(500).optional().default(""),
  photographerInstagramUrl: z.string().trim().max(500).optional().default(""),
  openingText: z.string().trim().max(180).optional().default(""),
  story: z.array(coupleStoryItemSchema).optional().default([]),
  musicEnabled: z.boolean().optional().default(false),
  musicChoice: z.enum(["default", "library", "upload", "video", "url"]).optional().default("default"),
  musicUrl: z.string().trim().max(500).optional().default(""),
  orderMusic: z.string().max(48 * 1024 * 1024).optional().default(""),
  idempotencyKey: z.string().trim().max(120).optional().default(""),
  selectedShareTemplate: z.enum(["classic", "simple", "news"]).optional().default("classic"),
  templateSlug: z.string().trim().min(2),
  language: z.enum(["ar", "en"]).optional().default("ar"),
});

export const rsvpSchema = z.object({
  name: z.string().trim().min(2, "اكتب الاسم بالكامل"),
  phone: z
    .string()
    .trim()
    .regex(/^01\d{9}$/, "رقم الهاتف يجب أن يبدأ بـ 01 ويتكون من 11 رقمًا"),
  attendees: z.coerce.number().int().min(1).max(20),
  status: z.enum(["confirmed", "declined"]),
  note: z.string().trim().max(500).optional(),
});
