import { z } from "zod";

const validDateString = (value: string) => !Number.isNaN(Date.parse(value));

const coupleStoryItemSchema = z.object({
  id: z.string().trim().max(80).optional(),
  date: z.string().trim().max(80).optional().default(""),
  title: z.string().trim().max(120).optional().default(""),
  description: z.string().trim().max(700).optional().default(""),
});

const invitationGiftSchema = z.object({
  vodafoneCash: z.string().trim().max(80).optional().default(""),
  instapay: z.string().trim().max(120).optional().default(""),
  bankAccount: z.string().trim().max(180).optional().default(""),
  customText: z.string().trim().max(500).optional().default(""),
});

export const orderRequestSchema = z.object({
  groomName: z.string().trim().min(2),
  brideName: z.string().trim().min(2),
  phone: z.string().trim().optional().default(""),
  weddingDate: z.string().trim().min(8).refine(validDateString, "اكتب تاريخ صحيح"),
  venue: z.string().trim().optional().default(""),
  mapUrl: z.string().trim().max(500).optional().default(""),
  notes: z.string().trim().max(1000).optional(),
  orderImages: z.array(z.string()).max(3).optional().default([]),
  photographerEnabled: z.boolean().optional().default(false),
  photographerName: z.string().trim().max(120).optional().default(""),
  photographerFacebookUrl: z.string().trim().max(500).optional().default(""),
  photographerInstagramUrl: z.string().trim().max(500).optional().default(""),
  openingText: z.string().trim().max(180).optional().default(""),
  story: z.array(coupleStoryItemSchema).optional().default([]),
  gift: invitationGiftSchema.optional().default({ vodafoneCash: "", instapay: "", bankAccount: "", customText: "" }),
  musicEnabled: z.boolean().optional().default(false),
  musicChoice: z.enum(["default", "library", "upload", "video", "url"]).optional().default("default"),
  musicUrl: z.string().trim().max(500).optional().default(""),
  orderMusic: z.string().max(48 * 1024 * 1024).optional().default(""),
  idempotencyKey: z.string().trim().max(120).optional().default(""),
  templateSlug: z.string().trim().min(2),
  language: z.enum(["ar", "en"]),
});

export const rsvpSchema = z.object({
  name: z.string().trim().min(2, "اكتب الاسم بالكامل"),
  phone: z.string().trim().min(8, "اكتب رقم هاتف صحيح"),
  attendees: z.coerce.number().int().min(1).max(20),
  status: z.enum(["confirmed", "declined"]),
  note: z.string().trim().max(500).optional(),
});
