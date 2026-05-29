import "dotenv/config";

/**
 * Shared config. JWT_SECRET MUST match social-platform-be — the socket
 * server only verifies tokens that BE signed; it never issues them.
 */
function required(name: string, fallback: string): string {
  const value = process.env[name];
  if (value && value.length > 0) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return fallback;
}

export const env = {
  port: parseInt(process.env.PORT || "3002", 10),
  // Must equal social-platform-be JWT_SECRET (default keeps dev working).
  jwtSecret: required("JWT_SECRET", "change-me-in-production"),
  // Exact browser origin of the Next client. Wildcard is invalid once
  // credentials (cookies) are in play, so this must be explicit.
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:3000",
};
