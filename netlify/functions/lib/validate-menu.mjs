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

function parsePortions(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const portions = Number.parseInt(raw, 10);
  return Number.isFinite(portions) && portions > 0 ? portions : "";
}

export function sanitizeMenu(menu) {
  const meta = menu?.meta || {};
  const commandes = meta.commandes || {};
  const retrait = commandes.retrait || {};

  const categories = Array.isArray(menu?.categories)
    ? menu.categories
        .map((cat, index) => ({
          id: String(cat?.id ?? `cat-${index + 1}`).trim(),
          nom: String(cat?.nom ?? "").trim(),
        }))
        .filter((cat) => cat.id && cat.nom)
    : [];

  const plats = Array.isArray(menu?.plats)
    ? menu.plats.map((plat, index) => ({
        id: String(plat?.id ?? index + 1),
        nom: String(plat?.nom ?? "").trim(),
        prix: parsePrix(plat?.prix),
        portions: parsePortions(plat?.portions),
        description: String(plat?.description ?? "").trim(),
        composition: String(plat?.composition ?? "").trim(),
        allergenes: String(plat?.allergenes ?? "").trim(),
        image: String(plat?.image ?? "").trim(),
        actif: plat?.actif !== false,
        categorieId: String(plat?.categorieId ?? "").trim(),
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
    categories,
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

  const categoryIds = new Set(data.categories.map((cat) => cat.id));

  data.plats.forEach((plat, index) => {
    const label = plat.nom || `Plat ${index + 1}`;
    if (!plat.nom) errors.push(`${label} : le nom est obligatoire.`);
    if (plat.categorieId && !categoryIds.has(plat.categorieId)) {
      errors.push(`${label} : catégorie invalide.`);
    }
    if (!Number.isFinite(plat.prix) || plat.prix < 0) {
      errors.push(`${label} : le prix est invalide.`);
    }
    if (String(plat.portions ?? "").trim() && !parsePortions(plat.portions)) {
      errors.push(`${label} : le nombre de personnes est invalide.`);
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
