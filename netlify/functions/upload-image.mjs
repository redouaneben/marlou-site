import { isAuthorized, unauthorizedResponse } from "./lib/auth.mjs";
import { writeFile } from "./lib/github.mjs";
import { detectImageType, extensionFromImageType } from "./lib/image-bytes.mjs";
import { jsonResponse } from "./lib/response.mjs";

const MAX_BYTES = 2 * 1024 * 1024;

function slugify(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { ok: false, error: "Méthode non autorisée." });
  }

  if (!isAuthorized(event)) {
    return unauthorizedResponse();
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { ok: false, error: "Données invalides." });
  }

  const { platNom, dataBase64 } = payload;

  if (!platNom || !dataBase64) {
    return jsonResponse(400, { ok: false, error: "Photo ou nom de plat manquant." });
  }

  let buffer;
  try {
    buffer = Buffer.from(dataBase64, "base64");
  } catch {
    return jsonResponse(400, { ok: false, error: "Impossible de lire la photo." });
  }

  if (!buffer.length || buffer.length > MAX_BYTES) {
    return jsonResponse(400, {
      ok: false,
      error: "La photo est trop lourde (maximum 2 Mo).",
    });
  }

  const detectedType = detectImageType(buffer);
  if (!detectedType) {
    return jsonResponse(400, {
      ok: false,
      error: "Format non supporté. Utilisez JPG, PNG, WEBP ou GIF.",
    });
  }

  const extension = extensionFromImageType(detectedType);
  if (!extension) {
    return jsonResponse(400, {
      ok: false,
      error: "Format non supporté. Utilisez JPG, PNG, WEBP ou GIF.",
    });
  }

  const slug = slugify(platNom) || "plat";
  const path = `assets/Plats/${slug}-${Date.now()}.${extension}`;

  try {
    await writeFile(path, buffer, `Ajout photo plat ${platNom} (admin Marlou)`);
    return jsonResponse(200, {
      ok: true,
      path,
      message: "Photo enregistrée.",
    });
  } catch (error) {
    console.error(error);
    return jsonResponse(500, {
      ok: false,
      error: "Une erreur interne est survenue.",
    });
  }
}
