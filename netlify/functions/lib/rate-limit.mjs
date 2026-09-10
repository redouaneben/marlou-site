export const AUTH_DELAY_MS = 300;
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;

/** @type {Map<string, { count: number, firstFailureAt: number, blockedUntil: number }>} */
const attempts = new Map();

export function getClientIp(event) {
  const headers = event.headers || {};
  const netlifyIp =
    headers["x-nf-client-connection-ip"] || headers["X-Nf-Client-Connection-Ip"];
  if (netlifyIp) return netlifyIp;

  const forwarded = headers["x-forwarded-for"] || headers["X-Forwarded-For"];
  if (forwarded) return String(forwarded).split(",")[0].trim();

  return "unknown";
}

function getAttemptRecord(ip) {
  const now = Date.now();
  const record = attempts.get(ip);
  if (!record) return null;

  if (record.blockedUntil && now < record.blockedUntil) {
    return record;
  }

  if (record.firstFailureAt && now - record.firstFailureAt > WINDOW_MS) {
    attempts.delete(ip);
    return null;
  }

  return record;
}

export function isRateLimited(ip) {
  const record = getAttemptRecord(ip);
  if (!record) return false;

  const now = Date.now();
  if (record.blockedUntil && now < record.blockedUntil) {
    return true;
  }

  return record.count >= MAX_FAILURES;
}

export function recordFailedAttempt(ip) {
  const now = Date.now();
  let record = attempts.get(ip);

  if (!record || (record.firstFailureAt && now - record.firstFailureAt > WINDOW_MS)) {
    record = { count: 0, firstFailureAt: now, blockedUntil: 0 };
  }

  record.count += 1;
  if (record.count >= MAX_FAILURES) {
    record.blockedUntil = now + WINDOW_MS;
  }

  attempts.set(ip, record);
}

export function clearAttempts(ip) {
  attempts.delete(ip);
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
