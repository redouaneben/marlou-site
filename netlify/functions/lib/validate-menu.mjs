const IMAGE_PATH =
  /^assets\/Plats\/[a-zA-Z0-9àâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ \-&_]+\.(jpg|jpeg|png|webp|gif)$/i;

function isValidImagePath(imagePath) {
  if (!imagePath) return false;
  const path = String(imagePath).trim();
  if (path.includes("..") || path.includes("\\") || path.includes("//")) return false;
  if (!path.startsWith("assets/Plats/")) return false;
  return IMAGE_PATH.test(path);
}

function parsePrix(value) {
  const prix = Number.parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(prix) ? prix : NaN;
}

export function sanitizeMenu(menu) {
  const meta = menu?.meta || {};
  const commandes = meta.commandes || {};
  const retrait = commandes.retrait || {};

  const plats = Array.isArray(menu?.plats)
    ? menu.plats.map((plat, index) => ({
        id: String(plat?.id ?? index + 1),
        nom: String(plat?.nom ?? "").trim(),
        prix: parsePrix(plat?.prix),
        description: String(plat?.description ?? "").trim(),
        composition: String(plat?.composition ?? "").trim(),
        allergenes: String(plat?.allergenes ?? "").trim(),
        image: String(plat?.image ?? "").trim(),
        actif: plat?.actif !== false,
      }))
    : [];

  const creneaux = Array.isArray(retrait.creneaux)
    ? retrait.creneaux
        .map((creneau, index) => ({
          id: String(creneau?.id ?? `creneau-${index + 1}`).trim(),
          label: String(creneau?.label ?? "").trim(),
          actif: creneau?.actif !== false,
        }))
        .filter((creneau) => creneau.id && creneau.label)
    : [];

  return {
    meta: {
      semaine: String(meta.semaine ?? "").trim(),
      titre: String(meta.titre ?? "La Carte de la Semaine").trim(),
      intro: String(meta.intro ?? "").trim(),
      commandes: {
        debut: String(commandes.debut ?? "").trim(),
        fin: String(commandes.fin ?? "").trim(),
        jours: String(commandes.jours ?? "lundi au jeudi").trim(),
        retrait: {
          adresse: String(retrait.adresse ?? "49 Route de Chandieu, Toussieu").trim(),
          periode: String(retrait.periode ?? "début de semaine suivante").trim(),
          creneaux,
        },
      },
    },
    plats,
  };
}

export function validateMenu(menu) {
  const errors = [];
  const data = sanitizeMenu(menu);

  if (!data.meta.semaine) {
    errors.push("Indiquez le numéro de semaine (ex. 2026-W38).");
  }
  if (!data.meta.titre) {
    errors.push("Le titre de la carte est obligatoire.");
  }
  if (!data.meta.intro) {
    errors.push("Le message d'intro est obligatoire.");
  }
  if (!data.meta.commandes.debut) {
    errors.push("Indiquez la date de début des commandes.");
  }
  if (!data.meta.commandes.fin) {
    errors.push("Indiquez la date de fin des commandes.");
  }
  if (!data.plats.length) {
    errors.push("Ajoutez au moins un plat.");
  }

  data.plats.forEach((plat, index) => {
    const label = plat.nom || `Plat ${index + 1}`;
    if (!plat.nom) errors.push(`${label} : le nom est obligatoire.`);
    if (!Number.isFinite(plat.prix) || plat.prix < 0) {
      errors.push(`${label} : le prix est invalide.`);
    }
    if (!plat.description) errors.push(`${label} : la description est obligatoire.`);
    if (!plat.image) {
      errors.push(`${label} : ajoutez une photo.`);
    } else if (!isValidImagePath(plat.image)) {
      errors.push(`${label} : chemin d'image invalide.`);
    }
  });

  data.meta.commandes.retrait.creneaux.forEach((creneau, index) => {
    if (!creneau.label) {
      errors.push(`Créneau ${index + 1} : le libellé est obligatoire.`);
    }
  });

  return { errors, data };
}
