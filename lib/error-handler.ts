import { NextResponse } from "next/server";

export interface ApiError {
  message: string;
  code: string;
  status: number;
  details?: unknown;
}

export class AppError extends Error {
  constructor(
    public message: string,
    public code: string = "INTERNAL_ERROR",
    public status: number = 500,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const ErrorCodes = {
  // Validation errors
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_FIELD: "MISSING_FIELD",
  INVALID_EMAIL: "INVALID_EMAIL",
  INVALID_PHONE: "INVALID_PHONE",
  INVALID_URL: "INVALID_URL",
  INVALID_DATE: "INVALID_DATE",

  // Authentication errors
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  INVALID_SESSION: "INVALID_SESSION",
  SESSION_EXPIRED: "SESSION_EXPIRED",

  // Resource errors
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  CONFLICT: "CONFLICT",

  // Rate limiting
  RATE_LIMITED: "RATE_LIMITED",
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",

  // Server errors
  DATABASE_ERROR: "DATABASE_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
};

export const ErrorMessages: Record<string, string> = {
  [ErrorCodes.INVALID_INPUT]: "البيانات المدخلة غير صحيحة",
  [ErrorCodes.MISSING_FIELD]: "حقل مطلوب مفقود",
  [ErrorCodes.INVALID_EMAIL]: "عنوان البريد الإلكتروني غير صحيح",
  [ErrorCodes.INVALID_PHONE]: "رقم الهاتف غير صحيح",
  [ErrorCodes.INVALID_URL]: "الرابط غير صحيح",
  [ErrorCodes.INVALID_DATE]: "التاريخ غير صحيح",
  [ErrorCodes.UNAUTHORIZED]: "غير مصرح لك بالوصول",
  [ErrorCodes.FORBIDDEN]: "لا توجد صلاحيات كافية",
  [ErrorCodes.INVALID_SESSION]: "جلسة غير صحيحة",
  [ErrorCodes.SESSION_EXPIRED]: "انتهت صلاحية الجلسة",
  [ErrorCodes.NOT_FOUND]: "العنصر المطلوب غير موجود",
  [ErrorCodes.ALREADY_EXISTS]: "العنصر موجود بالفعل",
  [ErrorCodes.CONFLICT]: "تعارض في البيانات",
  [ErrorCodes.RATE_LIMITED]: "تم تجاوز حد الطلبات المسموح",
  [ErrorCodes.TOO_MANY_REQUESTS]: "عدد كبير جداً من الطلبات",
  [ErrorCodes.DATABASE_ERROR]: "خطأ في قاعدة البيانات",
  [ErrorCodes.INTERNAL_ERROR]: "خطأ داخلي في الخادم",
  [ErrorCodes.SERVICE_UNAVAILABLE]: "الخدمة غير متاحة حالياً",
};

export function getErrorMessage(code: string): string {
  return ErrorMessages[code] || "حدث خطأ غير متوقع";
}

export function createApiError(
  message: string,
  code: string = ErrorCodes.INTERNAL_ERROR,
  status: number = 500,
  details?: unknown,
): ApiError {
  return {
    message: message || getErrorMessage(code),
    code,
    status,
    details,
  };
}

export function handleApiError(error: unknown): ApiError {
  console.error("API Error:", error);

  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      status: error.status,
      details: error.details,
    };
  }

  if (error instanceof Error) {
    // Handle specific error types
    if (error.message.includes("UNIQUE constraint failed")) {
      return createApiError(
        getErrorMessage(ErrorCodes.ALREADY_EXISTS),
        ErrorCodes.ALREADY_EXISTS,
        409,
      );
    }

    if (error.message.includes("not found")) {
      return createApiError(
        getErrorMessage(ErrorCodes.NOT_FOUND),
        ErrorCodes.NOT_FOUND,
        404,
      );
    }

    return createApiError(error.message, ErrorCodes.INTERNAL_ERROR, 500);
  }

  return createApiError(
    getErrorMessage(ErrorCodes.INTERNAL_ERROR),
    ErrorCodes.INTERNAL_ERROR,
    500,
  );
}

export function sendApiError(error: ApiError) {
  return NextResponse.json(error, { status: error.status });
}

export function sendApiSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Async error wrapper for API routes
 */
export function asyncHandler(
  handler: (req: unknown, ctx: unknown) => Promise<Response>,
) {
  return async (req: unknown, ctx: unknown) => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      const apiError = handleApiError(error);
      return sendApiError(apiError);
    }
  };
}
