/**
 * Administration Marlou — gestion carte de la semaine
 */

const API = {
  verify: "/.netlify/functions/verify-auth",
  save: "/.netlify/functions/save-menu",
  upload: "/.netlify/functions/upload-image",
};

const TOKEN_KEY = "marlou_admin_token";
const DRAFT_KEY = "marlou_admin_draft";

const loginScreen = document.getElementById("login-screen");
const adminApp = document.getElementById("admin-app");
const loginForm = document.getElementById("login-form");
const loginPassword = document.getElementById("login-password");
const loginError = document.getElementById("login-error");
const logoutBtn = document.getElementById("logout-btn");
const saveBtn = document.getElementById("save-btn");
const saveStatus = document.getElementById("save-status");
const formErrors = document.getElementById("form-errors");
const platsList = document.getElementById("plats-list");
const creneauxList = document.getElementById("creneaux-list");
const addPlatBtn = document.getElementById("add-plat-btn");
const addCreneauBtn = document.getElementById("add-creneau-btn");

const metaFields = {
  semaine: document.getElementById("meta-semaine"),
  titre: document.getElementById("meta-titre"),
  intro: document.getElementById("meta-intro"),
  debut: document.getElementById("meta-debut"),
  fin: document.getElementById("meta-fin"),
  jours: document.getElementById("meta-jours"),
  periode: document.getElementById("meta-periode"),
  adresse: document.getElementById("meta-adresse"),
};

/** @type {{ meta: object, plats: object[] } | null} */
let menuState = null;

/** @type {Map<string, File>} */
const pendingFiles = new Map();

/** @type {Map<string, string>} */
const previewUrls = new Map();

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || "";
}

function setToken(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

function authHeaders() {
  return {
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showLogin() {
  loginScreen.hidden = false;
  adminApp.hidden = true;
}

function showAdmin() {
  loginScreen.hidden = true;
  adminApp.hidden = false;
}

function setStatus(message, type = "") {
  saveStatus.textContent = message;
  saveStatus.className = `admin-status${type ? ` admin-status--${type}` : ""}`;
}

function showFormErrors(messages) {
  if (!messages.length) {
    formErrors.hidden = true;
    formErrors.textContent = "";
    return;
  }

  formErrors.hidden = false;
  formErrors.innerHTML = messages.map((msg) => `<p>${escapeHtml(msg)}</p>`).join("");
}

function nextPlatId() {
  const ids = menuState.plats
    .map((plat) => Number.parseInt(plat.id, 10))
    .filter((value) => Number.isFinite(value));
  const maxId = ids.length ? Math.max(...ids) : 0;
  return String(maxId + 1);
}

function nextCreneauId() {
  const count = menuState.meta.commandes.retrait.creneaux.length + 1;
  return `creneau-${count}`;
}

function createEmptyPlat() {
  return {
    id: nextPlatId(),
    nom: "",
    prix: "",
    description: "",
    composition: "",
    allergenes: "",
    image: "",
    actif: true,
  };
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function saveDraft() {
  if (!menuState) return;
  localStorage.setItem(DRAFT_KEY, JSON.stringify(menuState));
}

function loadDraft() {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

function readMetaFromForm() {
  menuState.meta.semaine = metaFields.semaine.value.trim();
  menuState.meta.titre = metaFields.titre.value.trim();
  menuState.meta.intro = metaFields.intro.value.trim();
  menuState.meta.commandes.debut = metaFields.debut.value.trim();
  menuState.meta.commandes.fin = metaFields.fin.value.trim();
  menuState.meta.commandes.jours = metaFields.jours.value.trim();
  menuState.meta.commandes.retrait.periode = metaFields.periode.value.trim();
  menuState.meta.commandes.retrait.adresse = metaFields.adresse.value.trim();
}

function writeMetaToForm() {
  const { meta } = menuState;
  metaFields.semaine.value = meta.semaine || "";
  metaFields.titre.value = meta.titre || "";
  metaFields.intro.value = meta.intro || "";
  metaFields.debut.value = meta.commandes.debut || "";
  metaFields.fin.value = meta.commandes.fin || "";
  metaFields.jours.value = meta.commandes.jours || "";
  metaFields.periode.value = meta.commandes.retrait.periode || "";
  metaFields.adresse.value = meta.commandes.retrait.adresse || "";
}

function validateClientMenu() {
  readMetaFromForm();
  syncPlatsFromDom();
  syncCreneauxFromDom();

  const errors = [];
  const { meta, plats } = menuState;

  if (!meta.semaine) errors.push("Indiquez le numéro de semaine.");
  if (!meta.titre) errors.push("Le titre de la carte est obligatoire.");
  if (!meta.intro) errors.push("Le message d'intro est obligatoire.");
  if (!meta.commandes.debut) errors.push("Indiquez la date de début des commandes.");
  if (!meta.commandes.fin) errors.push("Indiquez la date de fin des commandes.");

  plats.forEach((plat, index) => {
    const label = plat.nom?.trim() || `Plat ${index + 1}`;
    if (!plat.nom?.trim()) errors.push(`${label} : le nom est obligatoire.`);
    const prix = Number.parseFloat(String(plat.prix).replace(",", "."));
    if (!Number.isFinite(prix) || prix < 0) errors.push(`${label} : le prix est invalide.`);
    if (!plat.description?.trim()) errors.push(`${label} : la description est obligatoire.`);
    if (!plat.image?.trim() && !pendingFiles.has(plat.id)) {
      errors.push(`${label} : ajoutez une photo.`);
    }
  });

  meta.commandes.retrait.creneaux.forEach((creneau, index) => {
    if (!creneau.label?.trim()) {
      errors.push(`Créneau ${index + 1} : le libellé est obligatoire.`);
    }
  });

  return errors;
}

function syncPlatsFromDom() {
  menuState.plats.forEach((plat) => {
    const card = platsList.querySelector(`[data-plat-id="${plat.id}"]`);
    if (!card) return;

    plat.nom = card.querySelector('[data-field="nom"]').value.trim();
    plat.prix = card.querySelector('[data-field="prix"]').value.trim();
    plat.description = card.querySelector('[data-field="description"]').value.trim();
    plat.composition = card.querySelector('[data-field="composition"]').value.trim();
    plat.allergenes = card.querySelector('[data-field="allergenes"]').value.trim();
    plat.actif = card.querySelector('[data-field="actif"]').checked;
  });
}

function syncCreneauxFromDom() {
  const items = [...creneauxList.querySelectorAll("[data-creneau-index]")];
  menuState.meta.commandes.retrait.creneaux = items.map((item, index) => ({
    id: item.querySelector('[data-field="id"]').value.trim() || `creneau-${index + 1}`,
    label: item.querySelector('[data-field="label"]').value.trim(),
  }));
}

function renderCreneaux() {
  const creneaux = menuState.meta.commandes.retrait.creneaux;
  creneauxList.innerHTML = creneaux
    .map(
      (creneau, index) => `
      <div class="admin-creneau" data-creneau-index="${index}">
        <label class="admin-field">
          <span class="admin-field__label">Code interne</span>
          <input class="admin-field__input" data-field="id" type="text" value="${escapeHtml(creneau.id)}">
        </label>
        <label class="admin-field">
          <span class="admin-field__label">Libellé affiché</span>
          <input class="admin-field__input" data-field="label" type="text" value="${escapeHtml(creneau.label)}" placeholder="Lundi — 17h à 18h">
        </label>
        <button class="admin-btn admin-btn--danger admin-btn--small" type="button" data-action="remove-creneau">Supprimer</button>
      </div>
    `
    )
    .join("");
}

function getPlatPreview(plat) {
  if (previewUrls.has(plat.id)) return previewUrls.get(plat.id);
  if (plat.image) return plat.image;
  return "";
}

function renderPlats() {
  platsList.innerHTML = menuState.plats
    .map((plat) => {
      const preview = getPlatPreview(plat);
      return `
        <article class="admin-plat" data-plat-id="${escapeHtml(plat.id)}">
          <div class="admin-plat__head">
            <h3 class="admin-subsection__title">${escapeHtml(plat.nom || "Nouveau plat")}</h3>
            <label class="admin-switch">
              <input class="admin-switch__input" data-field="actif" type="checkbox" ${plat.actif !== false ? "checked" : ""}>
              <span>Visible sur le site</span>
            </label>
          </div>

          ${preview ? `<img class="admin-plat__preview" src="${escapeHtml(preview)}" alt="">` : ""}

          <div class="admin-grid admin-grid--2">
            <label class="admin-field">
              <span class="admin-field__label">Nom</span>
              <input class="admin-field__input" data-field="nom" type="text" value="${escapeHtml(plat.nom)}" required>
            </label>
            <label class="admin-field">
              <span class="admin-field__label">Prix (€)</span>
              <input class="admin-field__input" data-field="prix" type="text" inputmode="decimal" value="${escapeHtml(String(plat.prix ?? ""))}" required>
            </label>
          </div>

          <label class="admin-field">
            <span class="admin-field__label">Description courte</span>
            <textarea class="admin-field__textarea" data-field="description" rows="2" required>${escapeHtml(plat.description)}</textarea>
          </label>

          <label class="admin-field">
            <span class="admin-field__label">Composition</span>
            <textarea class="admin-field__textarea" data-field="composition" rows="3">${escapeHtml(plat.composition)}</textarea>
          </label>

          <label class="admin-field">
            <span class="admin-field__label">Allergènes</span>
            <textarea class="admin-field__textarea" data-field="allergenes" rows="2">${escapeHtml(plat.allergenes)}</textarea>
          </label>

          <div class="admin-file">
            <span class="admin-field__label">Photo du plat</span>
            <input class="admin-file__input" data-field="file" id="file-${escapeHtml(plat.id)}" type="file" accept="image/*">
            <label class="admin-file__label" for="file-${escapeHtml(plat.id)}">Parcourir / Choisir une photo</label>
            ${plat.image ? `<span class="admin-field__help">Photo actuelle : ${escapeHtml(plat.image)}</span>` : ""}
          </div>

          <button class="admin-btn admin-btn--danger admin-btn--small" type="button" data-action="remove-plat">Supprimer ce plat</button>
        </article>
      `;
    })
    .join("");
}

function renderAll() {
  writeMetaToForm();
  renderCreneaux();
  renderPlats();
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Impossible de lire la photo."));
    reader.readAsDataURL(file);
  });
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, options);
  let payload = {};

  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || "Une erreur est survenue.");
  }

  return payload;
}

async function verifySession() {
  return apiRequest(API.verify, {
    method: "POST",
    headers: authHeaders(),
    body: "{}",
  });
}

async function loadMenuData() {
  const response = await fetch("data/menu-semaine.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Impossible de charger la carte actuelle.");
  }

  const data = await response.json();
  const draft = loadDraft();

  menuState = draft || deepClone(data);

  if (!menuState.meta.commandes) {
    menuState.meta.commandes = { retrait: { creneaux: [] } };
  }
  if (!menuState.meta.commandes.retrait) {
    menuState.meta.commandes.retrait = { creneaux: [] };
  }
  if (!Array.isArray(menuState.meta.commandes.retrait.creneaux)) {
    menuState.meta.commandes.retrait.creneaux = [];
  }
  if (!Array.isArray(menuState.plats)) {
    menuState.plats = [];
  }

  renderAll();
  setStatus("Carte chargée. Pensez à enregistrer après vos modifications.");
}

async function uploadPendingImages() {
  syncPlatsFromDom();

  for (const plat of menuState.plats) {
    const file = pendingFiles.get(plat.id);
    if (!file) continue;

    const dataBase64 = await fileToBase64(file);
    const payload = await apiRequest(API.upload, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        platNom: plat.nom || `plat-${plat.id}`,
        contentType: file.type,
        dataBase64,
      }),
    });

    plat.image = payload.path;
    pendingFiles.delete(plat.id);

    if (previewUrls.has(plat.id)) {
      URL.revokeObjectURL(previewUrls.get(plat.id));
      previewUrls.delete(plat.id);
    }
  }
}

async function saveMenu() {
  showFormErrors([]);
  const errors = validateClientMenu();
  if (errors.length) {
    showFormErrors(errors);
    setStatus("Corrigez les champs indiqués avant d'enregistrer.", "error");
    return;
  }

  saveBtn.disabled = true;
  setStatus("Enregistrement en cours…");

  try {
    await uploadPendingImages();

    const payload = await apiRequest(API.save, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ menu: menuState }),
    });

    clearDraft();
    renderAll();
    setStatus(payload.message || "Carte enregistrée.", "success");
  } catch (error) {
    console.error(error);
    setStatus(error.message, "error");
  } finally {
    saveBtn.disabled = false;
  }
}

async function handleLogin(event) {
  event.preventDefault();
  loginError.hidden = true;

  const password = loginPassword.value.trim();
  if (!password) return;

  setToken(password);

  try {
    await verifySession();
    showAdmin();
    await loadMenuData();
  } catch {
    setToken("");
    loginError.textContent = "Mot de passe incorrect.";
    loginError.hidden = false;
  }
}

function handleLogout() {
  setToken("");
  menuState = null;
  pendingFiles.clear();
  previewUrls.forEach((url) => URL.revokeObjectURL(url));
  previewUrls.clear();
  loginPassword.value = "";
  showLogin();
}

platsList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action='remove-plat']");
  if (!button) return;

  const card = button.closest("[data-plat-id]");
  const platId = card?.dataset.platId;
  if (!platId) return;

  const plat = menuState.plats.find((item) => item.id === platId);
  const label = plat?.nom || "ce plat";
  if (!window.confirm(`Supprimer ${label} ?`)) return;

  syncPlatsFromDom();
  menuState.plats = menuState.plats.filter((item) => item.id !== platId);
  pendingFiles.delete(platId);
  if (previewUrls.has(platId)) {
    URL.revokeObjectURL(previewUrls.get(platId));
    previewUrls.delete(platId);
  }
  renderPlats();
  saveDraft();
});

platsList.addEventListener("change", (event) => {
  const input = event.target.closest('[data-field="file"]');
  if (!input?.files?.[0]) return;

  const card = input.closest("[data-plat-id]");
  const platId = card?.dataset.platId;
  if (!platId) return;

  const file = input.files[0];
  if (!file.type.startsWith("image/")) {
    window.alert("Choisissez une image (JPG, PNG, WEBP ou GIF).");
    input.value = "";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    window.alert("La photo est trop lourde (maximum 5 Mo).");
    input.value = "";
    return;
  }

  pendingFiles.set(platId, file);

  if (previewUrls.has(platId)) {
    URL.revokeObjectURL(previewUrls.get(platId));
  }

  const previewUrl = URL.createObjectURL(file);
  previewUrls.set(platId, previewUrl);

  const preview = card.querySelector(".admin-plat__preview");
  if (preview) {
    preview.src = previewUrl;
  } else {
    const img = document.createElement("img");
    img.className = "admin-plat__preview";
    img.src = previewUrl;
    img.alt = "";
    card.insertBefore(img, card.querySelector(".admin-grid"));
  }

  saveDraft();
});

creneauxList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action='remove-creneau']");
  if (!button) return;

  syncCreneauxFromDom();
  const item = button.closest("[data-creneau-index]");
  const index = Number.parseInt(item?.dataset.creneauIndex ?? "-1", 10);
  if (!Number.isFinite(index) || index < 0) return;

  menuState.meta.commandes.retrait.creneaux.splice(index, 1);
  renderCreneaux();
  saveDraft();
});

addPlatBtn.addEventListener("click", () => {
  syncPlatsFromDom();
  menuState.plats.push(createEmptyPlat());
  renderPlats();
  saveDraft();
});

addCreneauBtn.addEventListener("click", () => {
  syncCreneauxFromDom();
  menuState.meta.commandes.retrait.creneaux.push({
    id: nextCreneauId(),
    label: "",
  });
  renderCreneaux();
  saveDraft();
});

Object.values(metaFields).forEach((field) => {
  field.addEventListener("input", () => {
    readMetaFromForm();
    saveDraft();
  });
});

saveBtn.addEventListener("click", saveMenu);
loginForm.addEventListener("submit", handleLogin);
logoutBtn.addEventListener("click", handleLogout);

async function initAdmin() {
  const token = getToken();
  if (!token) {
    showLogin();
    return;
  }

  try {
    await verifySession();
    showAdmin();
    await loadMenuData();
  } catch {
    setToken("");
    showLogin();
  }
}

initAdmin();
