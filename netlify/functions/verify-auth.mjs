import { isAuthorized, unauthorizedResponse } from "./lib/auth.mjs";
import { jsonResponse } from "./lib/response.mjs";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { ok: false, error: "Méthode non autorisée." });
  }

  if (!isAuthorized(event)) {
    return unauthorizedResponse();
  }

  return jsonResponse(200, { ok: true });
}
