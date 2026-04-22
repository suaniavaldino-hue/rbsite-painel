export function maskSecret(
  value: string | undefined,
  visibleTail = 4,
  minMaskedLength = 8,
) {
  if (!value) {
    return "Nao configurado";
  }

  const normalized = value.trim();

  if (normalized.length <= visibleTail) {
    return "•".repeat(Math.max(minMaskedLength, normalized.length));
  }

  const visible = normalized.slice(-visibleTail);
  const masked = "•".repeat(Math.max(minMaskedLength, normalized.length - visibleTail));

  return `${masked}${visible}`;
}
