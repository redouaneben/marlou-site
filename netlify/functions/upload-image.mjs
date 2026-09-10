import { isAuthorized, unauthorizedResponse } from "./lib/auth.mjs";
import { writeFile } from "./lib/github.mjs";
import { jsonResponse } from "./lib/response.mjs";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function slugify(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function extensionFromType(contentType) {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
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

  const { platNom, contentType, dataBase64 } = payload;

  if (!platNom || !contentType || !dataBase64) {
    return jsonResponse(400, { ok: false, error: "Photo ou nom de plat manquant." });
  }

  if (!ALLOWED_TYPES.has(contentType)) {
    return jsonResponse(400, {
      ok: false,
      error: "Format non supporté. Utilisez JPG, PNG, WEBP ou GIF.",
    });
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
      error: "La photo est trop lourde (maximum 5 Mo).",
    });
  }

  const slug = slugify(platNom) || "plat";
  const extension = extensionFromType(contentType);
  const path = `assets/Plats/${slug}.${extension}`;

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
      error: error.message || "Erreur lors de l'envoi de la photo.",
    });
  }
}
