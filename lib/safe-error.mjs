const SENSITIVE_PATTERNS = [
  /\bBearer\s+[^\s,;]+/gi,
  /\b(token|api[ _-]?key|secret|authorization|password)\b\s*[:=]\s*[^\s,;]+/gi,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  /(?:postgres(?:ql)?|https?):\/\/[^\s"']+/gi,
];

function safeMessage(message) {
  if (typeof message !== "string" || !message.trim()) {
    return "No error message provided.";
  }
  return SENSITIVE_PATTERNS.reduce(
    (value, pattern) => value.replace(pattern, "[redacted]"),
    message,
  ).slice(0, 300);
}

function errorLayer(error) {
  const details = {
    name: typeof error?.name === "string" ? error.name.slice(0, 80) : "Error",
    message: safeMessage(error?.message),
  };
  const code = error?.code ?? error?.status ?? error?.response?.status;
  if (
    typeof code === "number" ||
    (typeof code === "string" && /^[A-Za-z0-9_.-]{1,80}$/.test(code))
  ) {
    details.code = code;
  }
  if (error?.meta && typeof error.meta === "object" && !Array.isArray(error.meta)) {
    const meta = {};
    for (const key of ["modelName", "target", "field_name", "column", "constraint", "relation_name"]) {
      const value = error.meta[key];
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        meta[key] = typeof value === "string" ? safeMessage(value) : value;
      } else if (Array.isArray(value)) {
        meta[key] = value
          .filter((item) => typeof item === "string")
          .slice(0, 10)
          .map(safeMessage);
      }
    }
    if (Object.keys(meta).length) details.meta = meta;
  }
  return details;
}

export function getSafeErrorDetails(error, maxCauseDepth = 2) {
  const details = errorLayer(error);
  let cause = error?.cause;
  let depth = 0;
  while (cause && depth < maxCauseDepth) {
    details.cause = errorLayer(cause);
    cause = cause?.cause;
    depth += 1;
  }
  if (cause) details.causeTruncated = true;
  return details;
}
