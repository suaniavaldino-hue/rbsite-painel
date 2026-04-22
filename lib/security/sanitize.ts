import "server-only";

export function sanitizePlainText(value: string, maxLength = 500) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeEmail(value: string) {
  return sanitizePlainText(value, 160).toLowerCase();
}

export function sanitizeOptionalText(value: unknown, maxLength = 500) {
  if (typeof value !== "string") {
    return undefined;
  }

  const sanitizedValue = sanitizePlainText(value, maxLength);
  return sanitizedValue.length > 0 ? sanitizedValue : undefined;
}
