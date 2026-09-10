import { isAuthorized, unauthorizedResponse } from "./lib/auth.mjs";
import { writeFile } from "./lib/github.mjs";
import { validateMenu } from "./lib/validate-menu.mjs";
import { jsonResponse } from "./lib/response.mjs";

const MAX_BODY_BYTES = 500 * 1024;

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { ok: false, error: "Méthode non autorisée." });
  }

  if (!isAuthorized(event)) {
    return unauthorizedResponse();
  }

  if ((event.body?.length ?? 0) > MAX_BODY_BYTES) {
    return jsonResponse(413, { ok: false, error: "Données trop volumineuses." });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { ok: false, error: "Données invalides." });
  }

  const { errors, data } = validateMenu(payload.menu);
  if (errors.length > 0) {
    return jsonResponse(400, { ok: false, error: errors.join(" "), errors });
  }

  try {
    const content = `${JSON.stringify(data, null, 2)}\n`;
    await writeFile(
      "data/menu-semaine.json",
      content,
      `Mise à jour carte semaine ${data.meta.semaine} (admin Marlou)`
    );

    return jsonResponse(200, {
      ok: true,
      message:
        "Carte enregistrée. Le site public se met à jour automatiquement dans 1 à 2 minutes.",
    });
  } catch (error) {
    console.error(error);
    return jsonResponse(500, {
      ok: false,
      error: "Une erreur interne est survenue.",
    });
  }
}
