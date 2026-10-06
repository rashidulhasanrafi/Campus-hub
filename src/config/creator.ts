/**
 * Campus Hub - Developer & Feedback Configuration
 * Created by Rashidul Hasan Rafi, Department of CSE, UIU Student
 */

export const CREATOR_INFO = {
  name: "Rashidul Hasan Rafi",
  department: "Department of CSE",
  institution: "United International University (UIU)",
  role: "UIU Student & Lead Developer",
  whatsappNumber: process.env.NEXT_PUBLIC_CREATOR_WHATSAPP || "8801570222989",
  whatsappDisplayNumber: "01570222989",
  whatsappInternational: "+880 1570-222989",
  email: "rashidulhasanrafi@gmail.com",
};

/**
 * Builds a direct WhatsApp chat URL with context-aware message pre-filled
 */
export function getWhatsAppFeedbackUrl(
  type: "general" | "bug" | "login" = "general",
  customMessage?: string
): string {
  // Strip non-digit characters for standard wa.me format
  let rawNumber = (CREATOR_INFO.whatsappNumber || "8801570222989").replace(/[^0-9]/g, "");
  if (rawNumber.startsWith("0")) {
    rawNumber = "88" + rawNumber;
  }
  
  let text = `Hello Rafi! I am using UIU Campus Hub and wanted to share some feedback: `;

  if (type === "bug") {
    text = `Hello Rafi! I found an issue/bug on UIU Campus Hub. Here are the details: `;
  } else if (type === "login") {
    text = `Hello Rafi! I am facing an issue logging into UIU Campus Hub. Could you please help me? `;
  }

  if (customMessage) {
    text += `\n${customMessage}`;
  }

  return `https://wa.me/${rawNumber}?text=${encodeURIComponent(text)}`;
}
