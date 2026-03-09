import { ValidationError } from "@/core/errors/app-error";

function maskMiddle(value: string, keepStart = 2, keepEnd = 2): string {
  if (!value) return value;
  if (value.length <= keepStart + keepEnd) return "*".repeat(value.length);
  const start = value.slice(0, keepStart);
  const end = value.slice(-keepEnd);
  return `${start}${"*".repeat(Math.max(4, value.length - keepStart - keepEnd))}${end}`;
}

export const securityService = {
  scrubSensitiveData(text: string): string {
    if (typeof text !== "string") {
      throw new ValidationError("Text input must be a string.");
    }

    let output = text;

    // Email
    output = output.replace(
      /\b([a-zA-Z0-9._%+-]{1,64})@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
      (_m, user: string, domain: string) => `${maskMiddle(user, 1, 1)}@${domain}`,
    );

    // Phone (VN + basic intl)
    output = output.replace(
      /(?<!\d)(?:\+?84|0)\s?(?:\d[\s.-]?){8,10}(?!\d)/g,
      (phone) => maskMiddle(phone.replace(/\s+/g, ""), 3, 2),
    );

    // CCCD/CMND-ish numeric blocks (9-12 digits)
    output = output.replace(/(?<!\d)\d{9,12}(?!\d)/g, (id) => maskMiddle(id, 2, 2));

    // Bank account-like long numeric blocks (13-19 digits)
    output = output.replace(/(?<!\d)\d{13,19}(?!\d)/g, (acc) => maskMiddle(acc, 3, 3));

    // Contextual personal names (simple heuristic)
    output = output.replace(
      /\b(Họ và tên|Họ tên|Tên khách hàng|Người đại diện|Ông|Bà|Mr|Ms)\s*[:\-]\s*([A-ZÀ-Ỹ][\p{L}\s'.-]{1,80})/giu,
      (_m, label: string, name: string) => `${label}: ${maskMiddle(name.trim(), 1, 0)}`,
    );

    return output;
  },
};

