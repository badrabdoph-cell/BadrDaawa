import type { Language } from "./types";

export type Locale = Language;

export const defaultLocale: Locale = "ar";
export const adminLocale: Locale = "ar";

export const localeMeta: Record<Locale, { dir: "rtl" | "ltr"; htmlLang: string; dateLocale: string }> = {
  ar: { dir: "rtl", htmlLang: "ar", dateLocale: "ar-EG-u-nu-latn" },
  en: { dir: "ltr", htmlLang: "en", dateLocale: "en-US" },
};

export const dictionaries = {
  ar: {
    common: {
      loading: "جاري التحميل",
      error: "حصلت مشكلة. حاول تاني.",
      connectionError: "تعذر الاتصال بالخادم. حاول مرة أخرى.",
    },
    invitation: {
      openingLabel: "فتح ظرف الدعوة",
      openingTitle: "دعوة فرح",
      galleryLabel: "صور الدعوة",
      gallery: {
        openImage: "فتح الصورة {number}",
        previous: "الصورة السابقة",
        next: "الصورة التالية",
        fullscreen: "ملء الشاشة",
        imageCount: "عدد الصور {count}",
        goTo: "الانتقال إلى الصورة {number}",
        imageCounter: "صورة {current} من {count}",
        zoomIn: "تكبير الصورة",
        zoomOut: "تصغير الصورة",
        close: "إغلاق المعرض",
      },
      socialLinks: "روابط السوشيال",
      photographerLinks: "روابط المصور",
      photographerMoments: "لقطات فرحتنا بعدسة خاصة",
      shareInvitation: "شارك الدعوة مع من تحب",
      shareCard: "بطاقة الدخول والمشاركة",
      qrAlt: "QR Code للدعوة",
      qrText: "امسح الكود وافتح الدعوة",
      countdownLabel: "العد التنازلي",
      countdownComplete: "لقد بدأ حفل الزفاف 🎉",
      countdown: {
        day: "يوم",
        hour: "ساعة",
        minute: "دقيقة",
        second: "ثانية",
      },
      rsvp: {
        kicker: "RSVP",
        defaultQuestion: "ناوي تحضر وتشاركنا فرحه عمرنا؟",
        declinedMessage: "حزين إنك مش معايا في يومي المفضل 🥹",
        confirmedSuccessMessage: "شكراً لتأكيد حضورك. وجودك يفرحنا ويكمل ليلتنا.",
        declinedSuccessMessage: "شكراً لردك. نتمنى لك كل الخير ونقدر مشاركتك لنا الفرحة.",
        successTitle: "تم إرسال ردك بنجاح",
        guestName: "اسم الضيف",
        responseStatus: "حالة الرد",
        confirmed: "حضور مؤكد",
        declined: "اعتذار عن الحضور",
        sendAnother: "إرسال رد آخر",
        attending: "هحضر",
        notAttending: "للأسف مش هقدر",
        namePlaceholder: "الاسم",
        phonePlaceholder: "رقم الفون",
        submitAttendance: "سجل حضوري",
        submitDecline: "إرسال الاعتذار",
        noteConfirmed: "اختار هحضر من الدعوة",
        noteDeclined: "اختار الاعتذار من الدعوة",
      },
      map: {
        iframeTitle: "خريطة مكان الفرح",
        preview: "معاينة الموقع",
        ready: "موقعك متزامن مع الخريطة",
        locating: "بنحدد موقعك الآن",
        actionsLabel: "خيارات فتح خريطة مكان الحفل",
        openGoogle: "فتح Google Maps",
        share: "مشاركة الموقع",
        copied: "تم نسخ الموقع",
        shareTitle: "موقع حفل الزفاف",
        distanceAway: "يبعد عنك تقريباً {distance}",
        recommended: "مناسب لجهازك",
      },
      calendar: {
        kicker: "Add To Calendar",
        title: "أضف الموعد للتقويم",
        previewNote: "روابط التقويم تعمل تلقائيًا داخل الدعوة المنشورة.",
      },
      checkIn: {
        kicker: "Check-In",
        title: "تسجيل الوصول",
        description: "عند وصولك لمكان الحفل اضغط الزر لتسجيل الحضور الفعلي.",
        previewMessage: "زر تجريبي يظهر مكان تسجيل الوصول داخل القالب.",
        error: "تعذر تسجيل وصولك. حاول مرة أخرى.",
        duplicate: "تم تسجيل وصولك مسبقًا. نورت الحفل.",
        success: "تم تسجيل وصولك للحفل. نورتونا.",
        done: "تم تسجيل وصولك",
        button: "وصلت إلى الحفل",
      },
      coupleStory: {
        label: "قصة العروسين",
        title: "رحلتنا قبل يوم الفرح",
        itemAlt: "محطة {number} من قصة العروسين",
      },
      gift: {
        label: "هدية العروسين",
        title: "هدية محبة للعروسين",
        vodafoneCash: "فودافون كاش",
        instapay: "إنستا باي",
        bankAccount: "حساب بنكي",
        customText: "تفاصيل إضافية",
        copy: "نسخ",
        copied: "تم النسخ",
      },
      coupleMessages: {
        kicker: "Couple Messages",
        title: "رسائل للعروسين",
        description: "اتركوا كلمة تبقى ذكرى جميلة للعروسين بعد يوم الفرح.",
        previewName: "ضيف عزيز",
        previewMessage: "ربنا يجعل بدايتكم كلها خير، وتعيشوا أجمل أيام العمر سوا. 🌹",
        largeImage: "حجم الصورة كبير. اختار صورة أقل من 8MB.",
        required: "اكتب الاسم ورسالة واضحة قبل الإرسال.",
        sendError: "تعذر إرسال الرسالة. حاول مرة أخرى.",
        published: "تم نشر رسالتك داخل الدعوة. شكراً لك.",
        pending: "وصلت رسالتك، وستظهر داخل الدعوة بعد موافقة الإدارة.",
        namePlaceholder: "اكتب اسمك",
        messagePlaceholder: "اكتب رسالتك للعروسين",
        imagePicker: "إضافة صورة اختيارية",
        imagePreviewAlt: "معاينة الصورة المرفقة",
        removeImage: "إزالة الصورة",
        submit: "إرسال الرسالة",
        previewNote: "هذا نموذج يظهر شكل رسائل العروسين داخل القالب.",
        imageAlt: "صورة من {name}",
        empty: "لا توجد رسائل منشورة بعد. كن أول من يترك ذكرى للعروسين.",
      },
    },
    admin: {
      localeName: "العربية",
    },
  },
  en: {
    common: {
      loading: "Loading",
      error: "Something went wrong. Please try again.",
      connectionError: "Could not connect to the server. Please try again.",
    },
    invitation: {
      openingLabel: "Open invitation envelope",
      openingTitle: "Wedding Invitation",
      galleryLabel: "Invitation photos",
      gallery: {
        openImage: "Open image {number}",
        previous: "Previous image",
        next: "Next image",
        fullscreen: "Fullscreen",
        imageCount: "{count} images",
        goTo: "Go to image {number}",
        imageCounter: "Image {current} of {count}",
        zoomIn: "Zoom image",
        zoomOut: "Zoom out",
        close: "Close gallery",
      },
      socialLinks: "Social links",
      photographerLinks: "Photographer links",
      photographerMoments: "Our favorite moments through a special lens",
      shareInvitation: "Share the invitation with loved ones",
      shareCard: "Entry and sharing card",
      qrAlt: "Invitation QR Code",
      qrText: "Scan the code to open the invitation",
      countdownLabel: "Countdown",
      countdownComplete: "The wedding celebration has started 🎉",
      countdown: {
        day: "Days",
        hour: "Hours",
        minute: "Minutes",
        second: "Seconds",
      },
      rsvp: {
        kicker: "RSVP",
        defaultQuestion: "Will you join us and celebrate our big day?",
        declinedMessage: "We will miss you on our special day.",
        confirmedSuccessMessage: "Thank you for confirming. Your presence will make our night complete.",
        declinedSuccessMessage: "Thank you for letting us know. We appreciate you sharing our joy.",
        successTitle: "Your response was sent",
        guestName: "Guest name",
        responseStatus: "Response status",
        confirmed: "Confirmed attendance",
        declined: "Unable to attend",
        sendAnother: "Send another response",
        attending: "I will attend",
        notAttending: "I cannot attend",
        namePlaceholder: "Name",
        phonePlaceholder: "Phone number",
        submitAttendance: "Confirm attendance",
        submitDecline: "Send apology",
        noteConfirmed: "Selected attending from the invitation",
        noteDeclined: "Selected unable to attend from the invitation",
      },
      map: {
        iframeTitle: "Wedding venue map",
        preview: "Location preview",
        ready: "Your location is synced with the map",
        locating: "Detecting your location",
        actionsLabel: "Map navigation options",
        openGoogle: "Open Google Maps",
        share: "Share location",
        copied: "Location copied",
        shareTitle: "Wedding venue location",
        distanceAway: "About {distance} away",
        recommended: "Best for your device",
      },
      calendar: {
        kicker: "Add To Calendar",
        title: "Add the date to your calendar",
        previewNote: "Calendar links work automatically in the published invitation.",
      },
      checkIn: {
        kicker: "Check-In",
        title: "Check-In",
        description: "When you arrive at the venue, tap the button to record your actual attendance.",
        previewMessage: "Preview button showing where guest check-in appears in the template.",
        error: "Could not record your check-in. Please try again.",
        duplicate: "Your check-in was already recorded. Welcome.",
        success: "Your check-in was recorded. Welcome.",
        done: "Checked in",
        button: "I arrived",
      },
      coupleStory: {
        label: "Couple Story",
        title: "Our journey before the wedding day",
        itemAlt: "Story moment {number}",
      },
      gift: {
        label: "Couple Gift",
        title: "A gift for the couple",
        vodafoneCash: "Vodafone Cash",
        instapay: "Instapay",
        bankAccount: "Bank account",
        customText: "Additional details",
        copy: "Copy",
        copied: "Copied",
      },
      coupleMessages: {
        kicker: "Couple Messages",
        title: "Messages for the Couple",
        description: "Leave a sweet note that remains part of the couple's memories after the wedding.",
        previewName: "Dear guest",
        previewMessage: "May your beginning be full of goodness, and may you live the most beautiful days together. 🌹",
        largeImage: "The image is too large. Choose an image under 8MB.",
        required: "Please enter your name and a clear message before sending.",
        sendError: "Could not send the message. Please try again.",
        published: "Your message has been published in the invitation. Thank you.",
        pending: "Your message was received and will appear after review.",
        namePlaceholder: "Your name",
        messagePlaceholder: "Write your message for the couple",
        imagePicker: "Add an optional photo",
        imagePreviewAlt: "Attached image preview",
        removeImage: "Remove image",
        submit: "Send message",
        previewNote: "This preview shows how couple messages appear inside the template.",
        imageAlt: "Photo from {name}",
        empty: "No published messages yet. Be the first to leave a memory for the couple.",
      },
    },
    admin: {
      localeName: "English",
    },
  },
} as const;

type Dictionary = typeof dictionaries.ar;

export function resolveLocale(value?: string | null): Locale {
  return value === "en" ? "en" : defaultLocale;
}

export function getLocaleMeta(locale?: string | null) {
  return localeMeta[resolveLocale(locale)];
}

function readPath(source: unknown, path: string) {
  return path.split(".").reduce<unknown>((current, part) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[part];
  }, source);
}

export function createTranslator(locale?: string | null, fallbackLocale: Locale = defaultLocale) {
  const resolved = resolveLocale(locale);
  const dictionary = dictionaries[resolved] as Dictionary;
  const fallback = dictionaries[fallbackLocale] as Dictionary;

  return (key: string, replacements?: Record<string, string | number>) => {
    const value = readPath(dictionary, key) ?? readPath(fallback, key) ?? key;
    const text = typeof value === "string" ? value : key;
    if (!replacements) return text;
    return Object.entries(replacements).reduce((current, [name, replacement]) => current.replaceAll(`{${name}}`, String(replacement)), text);
  };
}

export function getInvitationTranslator(locale?: string | null) {
  return createTranslator(locale);
}
