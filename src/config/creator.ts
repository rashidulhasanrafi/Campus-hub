/**
 * Campus Hub - Developer & Feedback Configuration
 * Created by Rashidul Hasan Rafi, Department of CSE, UIU Student
 */

export const CREATOR_INFO = {
  name: "Rashidul Hasan Rafi",
  department: "Department of CSE",
  institution: "United International University (UIU)",
  role: "UIU Student & Lead Developer",
  // Default WhatsApp contact number (can be overridden via NEXT_PUBLIC_CREATOR_WHATSAPP in .env)
  whatsappNumber: process.env.NEXT_PUBLIC_CREATOR_WHATSAPP || "8801700000000",
  whatsappDisplayNumber: "+880 1700-000000",
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
  const rawNumber = CREATOR_INFO.whatsappNumber.replace(/[^0-9]/g, "");
  
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
