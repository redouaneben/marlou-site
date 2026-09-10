import { isAuthorized, unauthorizedResponse } from "./lib/auth.mjs";
import {
  AUTH_DELAY_MS,
  clearAttempts,
  delay,
  getClientIp,
  isRateLimited,
  recordFailedAttempt,
} from "./lib/rate-limit.mjs";
import { jsonResponse } from "./lib/response.mjs";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { ok: false, error: "Méthode non autorisée." });
  }

  const ip = getClientIp(event);

  if (isRateLimited(ip)) {
    await delay(AUTH_DELAY_MS);
    return jsonResponse(429, {
      ok: false,
      error: "Trop de tentatives. Réessayez plus tard.",
    });
  }

  await delay(AUTH_DELAY_MS);

  if (!isAuthorized(event)) {
    recordFailedAttempt(ip);
    return unauthorizedResponse();
  }

  clearAttempts(ip);
  return jsonResponse(200, { ok: true });
}
