"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

type CopySuccessButtonProps = {
  publicUrl: string;
  adminUrl: string;
};

function buildSuccessMessage(publicUrl: string, adminUrl: string) {
  return `✅ تم إنشاء دعوتك الإلكترونية بنجاح

📍 رابط الدعوة (شاركه مع الضيوف):
${publicUrl}

💌 عقبالكم ❤️
ادخلوا وسجلوا حضوركم من هنا:
${publicUrl}

• ثبّت الدعوة في منشور على فيسبوك 
• اطلب من المدعوين دخول الدعوه 
• استخدمها كدعوتك الرسمية بدل الدعوات الورقية
• أي تهنئة أو تعليق جديد لن يظهر للضيوف إلا بعد موافقتك عليها من الادمن
━━━━━━━━━━━━━━

🔐 رابط إدارة الدعوة (سري - احتفظ به لنفسك)
${adminUrl}
من خلال رابط الإدارة يمكنك:
• مراجعة التهاني والتعليقات والموافقة عليها قبل ظهورها فالدعوه للناس 
• معرفة من أكد الحضور ومن اعتذر مع أسمائهم وأرقام هواتفهم
• متابعة عدد زيارات الدعوة ولمزيد
• تعديل بيانات الدعوة عند الحاجة
• المزيد من الامكانيات المتطوره ❤️

️ ⚠️ مهم جداً: أي شخص يمتلك رابط الإدارة يستطيع إدارة الدعوة والاطلاع على بيانات الضيوف، لذلك لا تشاركه مع أي شخص`;
}

export function CopySuccessButton({ publicUrl, adminUrl }: CopySuccessButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildSuccessMessage(publicUrl, adminUrl));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button className="btn btn-gold btn-glow" type="button" onClick={handleCopy}>
      {copied ? <Check size={17} /> : <Copy size={17} />}
      {copied ? "تم النسخ" : "نسخ النجاح"}
    </button>
  );
}
