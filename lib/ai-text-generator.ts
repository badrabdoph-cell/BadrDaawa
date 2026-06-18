const AI_API_KEY = process.env.OPENAI_API_KEY || "";
const AI_MODEL = process.env.AI_MODEL || "gpt-3.5-turbo";

interface InvitationDetails {
  groomName: string;
  brideName: string;
  weddingDate?: string;
  venue?: string;
  style?: string;
}

export async function generateInvitationText(details: InvitationDetails): Promise<{
  opening: string;
  mainText: string;
  closing: string;
} | null> {
  if (!AI_API_KEY) {
    console.warn("AI API key not configured");
    return null;
  }

  try {
    const prompt = `اكتب نص دعوة زفاف إسلامية باللغة العربية الفصحى. 
    اسم العريس: ${details.groomName}
    اسم العروس: ${details.brideName}
    ${details.weddingDate ? `التاريخ: ${details.weddingDate}` : ""}
    ${details.venue ? `المكان: ${details.venue}` : ""}
    ${details.style ? `النمط: ${details.style}` : ""}
    
    المطلوب:
    1. افتتاحية (سطر واحد): آية قرآنية أو دعاء قصير
    2. النص الرئيسي (2-3 جمل): دعوة لحضور حفل الزفاف مع ذكر الأسماء
    3. خاتمة (سطر واحد): دعاء للعروسين
    
    أعد النتيجة كـ JSON بالصيغة: {"opening": "...", "mainText": "...", "closing": "..."}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("AI API error:", error);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return null;
  } catch (err) {
    console.error("AI generation failed:", err);
    return null;
  }
}

export async function generateGalleryDescription(images: string[]): Promise<string | null> {
  if (!AI_API_KEY || images.length === 0) return null;
  
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [{
          role: "user",
          content: `اكتب وصفاً قصيراً لمعرض صور زفاف بالعربية (جملة واحدة): ${images.length} صور`
        }],
        temperature: 0.5,
        max_tokens: 100,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}
