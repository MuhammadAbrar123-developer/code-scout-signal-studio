// Only allow same-site paths after sign-in, so links can't bounce users to other sites.
export function safeRedirect(value: unknown, fallback = "/analyze") {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.startsWith("/auth")) return fallback;
  return value;
}
