import { z } from "zod";

// Validation schemas for admin operations
export const orderUpdateSchema = z.object({
  groomName: z.string().min(1, "اسم العريس مطلوب").max(100, "اسم العريس طويل جداً"),
  brideName: z.string().min(1, "اسم العروسة مطلوب").max(100, "اسم العروسة طويل جداً"),
  phone: z.string().optional().default(""),
  weddingDate: z.string().refine((date) => !Number.isNaN(new Date(date).getTime()), "تاريخ الفرح غير صحيح"),
  venue: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  templateSlug: z.string().optional().default("royal-envelope"),
});

export const invitationUpdateSchema = z.object({
  groomName: z.string().min(1, "اسم العريس مطلوب").max(100, "اسم العريس طويل جداً"),
  brideName: z.string().min(1, "اسم العروسة مطلوب").max(100, "اسم العروسة طويل جداً"),
  weddingDate: z.string().refine((date) => !Number.isNaN(new Date(date).getTime()), "تاريخ الفرح غير صحيح"),
  weddingTime: z.string().optional().default("07:00 مساءً"),
  venue: z.string().optional().default(""),
  city: z.string().optional().default(""),
  mapUrl: z.string().url("رابط الخريطة غير صحيح").optional().or(z.literal("")),
  musicUrl: z.string().url("رابط الموسيقى غير صحيح").optional().or(z.literal("")),
  templateSlug: z.string().optional().default("royal-envelope"),
});

export const musicSlotSchema = z.object({
  url: z.string().url("رابط الموسيقى غير صحيح").optional().or(z.literal("")),
  enabled: z.boolean().default(false),
  applyToAll: z.boolean().default(false),
  templateSlugs: z.array(z.string()).default([]),
});

export const broadcastSchema = z.object({
  title: z.string().min(1, "العنوان مطلوب").max(200, "العنوان طويل جداً"),
  message: z.string().min(1, "الرسالة مطلوبة").max(5000, "الرسالة طويلة جداً"),
  imageUrl: z.string().url("رابط الصورة غير صحيح").optional().or(z.literal("")),
  actionUrl: z.string().url("رابط الإجراء غير صحيح").optional().or(z.literal("")),
});

export type OrderUpdateInput = z.infer<typeof orderUpdateSchema>;
export type InvitationUpdateInput = z.infer<typeof invitationUpdateSchema>;
export type MusicSlotInput = z.infer<typeof musicSlotSchema>;
export type BroadcastInput = z.infer<typeof broadcastSchema>;

export function validateOrderUpdate(data: unknown) {
  try {
    return { success: true, data: orderUpdateSchema.parse(data) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || "بيانات غير صحيحة" };
    }
    return { success: false, error: "خطأ في التحقق من البيانات" };
  }
}

export function validateInvitationUpdate(data: unknown) {
  try {
    return { success: true, data: invitationUpdateSchema.parse(data) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || "بيانات غير صحيحة" };
    }
    return { success: false, error: "خطأ في التحقق من البيانات" };
  }
}

export function validateMusicSlot(data: unknown) {
  try {
    return { success: true, data: musicSlotSchema.parse(data) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || "بيانات غير صحيحة" };
    }
    return { success: false, error: "خطأ في التحقق من البيانات" };
  }
}

export function validateBroadcast(data: unknown) {
  try {
    return { success: true, data: broadcastSchema.parse(data) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || "بيانات غير صحيحة" };
    }
    return { success: false, error: "خطأ في التحقق من البيانات" };
  }
}
