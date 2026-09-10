import { timingSafeEqual, createHash } from "node:crypto";
import { jsonResponse } from "./response.mjs";

function hashSecret(value) {
  return createHash("sha256").update(String(value)).digest();
}

export function getBearerToken(request) {
  const headers = request.headers;
  let authHeader = "";

  if (typeof headers.get === "function") {
    authHeader = headers.get("authorization") || headers.get("Authorization") || "";
  } else if (headers) {
    authHeader = headers["authorization"] || headers["Authorization"] || "";
  }

  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}

export function isAuthorized(request) {
  const token = getBearerToken(request);
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!token || !adminPassword) {
    return false;
  }

  const tokenHash = hashSecret(token);
  const expectedHash = hashSecret(adminPassword);

  if (tokenHash.length !== expectedHash.length) {
    return false;
  }

  return timingSafeEqual(tokenHash, expectedHash);
}

export function unauthorizedResponse() {
  return jsonResponse(401, { error: "Unauthorized" });
}
