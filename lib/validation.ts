import { z } from "zod";

export const orderRequestSchema = z.object({
  groomName: z.string().min(2),
  brideName: z.string().min(2),
  phone: z.string().min(8),
  weddingDate: z.string().min(8),
  venue: z.string().min(2),
  notes: z.string().optional(),
  templateSlug: z.string().min(2),
  language: z.enum(["ar", "en"]),
});

export const rsvpSchema = z.object({
  name: z.string().min(2, "اكتب الاسم بالكامل"),
  phone: z.string().min(8, "اكتب رقم هاتف صحيح"),
  attendees: z.coerce.number().int().min(1).max(20),
  status: z.enum(["confirmed", "declined"]),
  note: z.string().max(500).optional(),
});
