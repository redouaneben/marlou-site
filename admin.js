/**
 * Administration Marlou — interface SaaS
 */

const API = {
  verify: "/.netlify/functions/verify-auth",
  save: "/.netlify/functions/save-menu",
  upload: "/.netlify/functions/upload-image",
};

const TOKEN_KEY = "marlou_admin_token";
const DRAFT_KEY = "marlou_admin_draft";
const VIEW_MODE_KEY = "marlou_admin_view_mode";

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
const weekBadge = document.getElementById("week-badge");
const platFilter = document.getElementById("plat-filter");
const viewPlats = document.getElementById("view-plats");
const viewSettings = document.getElementById("view-settings");
const platModal = document.getElementById("plat-modal");
const platModalOverlay = document.getElementById("plat-modal-overlay");
const platModalClose = document.getElementById("plat-modal-close");
const platModalTitle = document.getElementById("plat-modal-title");
const modalDeleteBtn = document.getElementById("modal-delete-btn");
const modalSaveBtn = document.getElementById("modal-save-btn");
const modalPhotoBtn = document.getElementById("modal-photo-btn");
const modalFile = document.getElementById("modal-file");

const modalFields = {
  nom: document.getElementById("modal-nom"),
  prix: document.getElementById("modal-prix"),
  description: document.getElementById("modal-description"),
  composition: document.getElementById("modal-composition"),
  allergenes: document.getElementById("modal-allergenes"),
  actif: document.getElementById("modal-actif"),
  preview: document.getElementById("modal-preview"),
  previewPlaceholder: document.getElementById("modal-preview-placeholder"),
  photoPath: document.getElementById("modal-photo-path"),
};

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

let platViewMode = localStorage.getItem(VIEW_MODE_KEY) || "grid";
let activeTab = "plats";
let editingPlatId = null;
let dragId = null;
let dragType = null;

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

function formatPrice(value) {
  const prix = Number.parseFloat(String(value).replace(",", "."));
  if (!Number.isFinite(prix)) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(prix);
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
    formErrors.innerHTML = "";
    return;
  }
  formErrors.hidden = false;
  formErrors.innerHTML = messages.map((msg) => `<p>${escapeHtml(msg)}</p>`).join("");
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function saveDraft() {
  if (!menuState) return;
  localStorage.setItem(DRAFT_KEY, JSON.stringify(menuState));
}

function loadDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
  } catch {
    return null;
  }
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

function nextPlatId() {
  const ids = menuState.plats
    .map((p) => Number.parseInt(p.id, 10))
    .filter((n) => Number.isFinite(n));
  return String((ids.length ? Math.max(...ids) : 0) + 1);
}

function nextCreneauId() {
  return `creneau-${menuState.meta.commandes.retrait.creneaux.length + 1}`;
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

function readMetaFromForm() {
  menuState.meta.semaine = metaFields.semaine.value.trim();
  menuState.meta.titre = metaFields.titre.value.trim();
  menuState.meta.intro = metaFields.intro.value.trim();
  menuState.meta.commandes.debut = metaFields.debut.value.trim();
  menuState.meta.commandes.fin = metaFields.fin.value.trim();
  menuState.meta.commandes.jours = metaFields.jours.value.trim();
  menuState.meta.commandes.retrait.periode = metaFields.periode.value.trim();
  menuState.meta.commandes.retrait.adresse = metaFields.adresse.value.trim();
  if (weekBadge) weekBadge.textContent = menuState.meta.semaine || "—";
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
  if (weekBadge) weekBadge.textContent = meta.semaine || "—";
}

function getPlatPreview(plat) {
  if (previewUrls.has(plat.id)) return previewUrls.get(plat.id);
  return plat.image || "";
}

function getFilteredPlats() {
  const filter = platFilter?.value || "all";
  return menuState.plats.filter((plat) => {
    if (filter === "active") return plat.actif !== false;
    if (filter === "inactive") return plat.actif === false;
    return true;
  });
}

function renderIosSwitch(checked, label = "", compact = false) {
  return `
    <label class="ios-switch${compact ? " ios-switch--compact" : ""}" data-stop-prop>
      <input type="checkbox" data-field="actif" ${checked ? "checked" : ""}>
      <span class="ios-switch__track" aria-hidden="true"><span class="ios-switch__thumb"></span></span>
      ${label ? `<span class="ios-switch__label">${escapeHtml(label)}</span>` : ""}
    </label>
  `;
}

function renderStatusPill(actif) {
  return actif !== false
    ? '<span class="status-pill status-pill--on">Actif</span>'
    : '<span class="status-pill status-pill--off">Masqué</span>';
}

function renderPlatCard(plat) {
  const preview = getPlatPreview(plat);
  const inactive = plat.actif === false ? " is-inactive" : "";
  return `
    <article class="admin-plat-card${inactive}" data-plat-id="${escapeHtml(plat.id)}" draggable="true">
      ${
        preview
          ? `<img class="admin-plat-card__thumb" src="${escapeHtml(preview)}" alt="">`
          : `<div class="admin-plat-card__thumb admin-plat-card__thumb--empty">Photo</div>`
      }
      <div class="admin-plat-card__body">
        <div class="admin-plat-card__top">
          <h3 class="admin-plat-card__name">${escapeHtml(plat.nom || "Nouveau plat")}</h3>
          ${renderIosSwitch(plat.actif !== false, "", true)}
        </div>
        <p class="admin-plat-card__price">${formatPrice(plat.prix)}</p>
        <p class="admin-plat-card__desc">${escapeHtml(plat.description || "Ajoutez une description…")}</p>
        ${renderStatusPill(plat.actif !== false)}
      </div>
    </article>
  `;
}

function renderPlatRow(plat) {
  const preview = getPlatPreview(plat);
  const inactive = plat.actif === false ? " is-inactive" : "";
  return `
    <article class="admin-plat-row${inactive}" data-plat-id="${escapeHtml(plat.id)}" draggable="true">
      <span class="admin-plat-row__drag" aria-hidden="true">⠿</span>
      ${
        preview
          ? `<img class="admin-plat-row__thumb" src="${escapeHtml(preview)}" alt="">`
          : `<div class="admin-plat-row__thumb admin-plat-row__thumb--empty">—</div>`
      }
      <div class="admin-plat-row__info">
        <p class="admin-plat-row__name">${escapeHtml(plat.nom || "Nouveau plat")}</p>
        <p class="admin-plat-row__meta">${formatPrice(plat.prix)} · ${escapeHtml(plat.description || "—")}</p>
      </div>
      ${renderStatusPill(plat.actif !== false)}
      ${renderIosSwitch(plat.actif !== false, "", true)}
      <button type="button" class="admin-plat-row__edit" data-action="edit-plat">Modifier</button>
    </article>
  `;
}

function renderPlats() {
  if (!platsList) return;

  platsList.className = `admin-plats admin-plats--${platViewMode}`;
  const plats = getFilteredPlats();

  if (!plats.length) {
    platsList.innerHTML = `<p class="admin-empty">Aucun plat dans cette vue. Ajoutez-en un ou changez le filtre.</p>`;
    return;
  }

  platsList.innerHTML =
    platViewMode === "list"
      ? plats.map(renderPlatRow).join("")
      : plats.map(renderPlatCard).join("");
}

function renderCreneaux() {
  if (!creneauxList) return;

  const creneaux = menuState.meta.commandes.retrait.creneaux;
  creneauxList.innerHTML = creneaux
    .map(
      (creneau, index) => `
      <div class="admin-creneau-row${creneau.actif === false ? " is-inactive" : ""}" data-creneau-index="${index}" draggable="true">
        <span class="admin-creneau-row__drag" aria-hidden="true">⠿</span>
        <label class="admin-field">
          <span class="admin-field__label">Code</span>
          <input class="admin-field__input" data-field="id" type="text" value="${escapeHtml(creneau.id)}">
        </label>
        <label class="admin-field">
          <span class="admin-field__label">Libellé affiché</span>
          <input class="admin-field__input" data-field="label" type="text" value="${escapeHtml(creneau.label)}" placeholder="Lundi — 17h à 18h">
        </label>
        ${renderIosSwitch(creneau.actif !== false, "Actif")}
        <button type="button" class="admin-icon-btn" data-action="remove-creneau" aria-label="Supprimer">×</button>
      </div>
    `
    )
    .join("");
}

function renderAll() {
  writeMetaToForm();
  renderPlats();
  renderCreneaux();
}

function syncCreneauxFromDom() {
  const items = [...creneauxList.querySelectorAll("[data-creneau-index]")];
  menuState.meta.commandes.retrait.creneaux = items.map((item, index) => ({
    id: item.querySelector('[data-field="id"]').value.trim() || `creneau-${index + 1}`,
    label: item.querySelector('[data-field="label"]').value.trim(),
    actif: item.querySelector('[data-field="actif"]')?.checked !== false,
  }));
}

function setPlatViewMode(mode) {
  platViewMode = mode;
  localStorage.setItem(VIEW_MODE_KEY, mode);
  document.querySelectorAll(".admin-view-toggle__btn").forEach((btn) => {
    const active = btn.dataset.view === mode;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
  renderPlats();
}

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll(".admin-segment__btn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.tab === tab);
  });
  viewPlats.hidden = tab !== "plats";
  viewSettings.hidden = tab !== "settings";
}

function getPlatById(id) {
  return menuState.plats.find((p) => p.id === id);
}

function syncModalToPlat() {
  if (!editingPlatId) return;
  const plat = getPlatById(editingPlatId);
  if (!plat) return;

  plat.nom = modalFields.nom.value.trim();
  plat.prix = modalFields.prix.value.trim();
  plat.description = modalFields.description.value.trim();
  plat.composition = modalFields.composition.value.trim();
  plat.allergenes = modalFields.allergenes.value.trim();
  plat.actif = modalFields.actif.checked;
}

function updateModalPreview(plat) {
  const preview = getPlatPreview(plat);
  if (preview) {
    modalFields.preview.src = preview;
    modalFields.preview.hidden = false;
    modalFields.previewPlaceholder.hidden = true;
  } else {
    modalFields.preview.hidden = true;
    modalFields.previewPlaceholder.hidden = false;
  }
  modalFields.photoPath.textContent = plat.image ? `Fichier : ${plat.image}` : "";
}

function openPlatModal(id) {
  const plat = getPlatById(id);
  if (!plat) return;

  editingPlatId = id;
  platModalTitle.textContent = plat.nom || "Nouveau plat";
  modalFields.nom.value = plat.nom || "";
  modalFields.prix.value = plat.prix ?? "";
  modalFields.description.value = plat.description || "";
  modalFields.composition.value = plat.composition || "";
  modalFields.allergenes.value = plat.allergenes || "";
  modalFields.actif.checked = plat.actif !== false;
  updateModalPreview(plat);

  platModal.hidden = false;
  platModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("is-modal-open");
  requestAnimationFrame(() => platModal.classList.add("is-open"));
  modalFields.nom.focus();
}

function closePlatModal() {
  syncModalToPlat();
  editingPlatId = null;
  platModal.classList.remove("is-open");
  platModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("is-modal-open");
  setTimeout(() => {
    platModal.hidden = true;
  }, 350);
  renderPlats();
  saveDraft();
}

function reorderItems(array, fromId, toId, getId) {
  const fromIndex = array.findIndex((item) => getId(item) === fromId);
  const toIndex = array.findIndex((item) => getId(item) === toId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

  const [moved] = array.splice(fromIndex, 1);
  array.splice(toIndex, 0, moved);
}

function setupDragDrop(container, type) {
  container.addEventListener("dragstart", (event) => {
    const item = event.target.closest(type === "plat" ? "[data-plat-id]" : "[data-creneau-index]");
    if (!item || event.target.closest("[data-stop-prop], .ios-switch, button, input, label.admin-field")) {
      event.preventDefault();
      return;
    }

    dragType = type;
    if (type === "plat") {
      dragId = item.dataset.platId;
    } else {
      dragId = item.dataset.creneauIndex;
    }
    item.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
  });

  container.addEventListener("dragend", (event) => {
    event.target.closest(".is-dragging")?.classList.remove("is-dragging");
    dragId = null;
    dragType = null;
  });

  container.addEventListener("dragover", (event) => {
    if (!dragId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  });

  container.addEventListener("drop", (event) => {
    event.preventDefault();
    const item = event.target.closest(type === "plat" ? "[data-plat-id]" : "[data-creneau-index]");
    if (!item || !dragId || dragType !== type) return;

    if (type === "plat") {
      reorderItems(menuState.plats, dragId, item.dataset.platId, (p) => p.id);
      renderPlats();
    } else {
      syncCreneauxFromDom();
      const from = Number.parseInt(dragId, 10);
      const to = Number.parseInt(item.dataset.creneauIndex, 10);
      const list = menuState.meta.commandes.retrait.creneaux;
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
      renderCreneaux();
    }
    saveDraft();
  });
}

function validateClientMenu() {
  if (editingPlatId) syncModalToPlat();
  readMetaFromForm();
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
    if (creneau.actif !== false && !creneau.label?.trim()) {
      errors.push(`Créneau ${index + 1} : le libellé est obligatoire.`);
    }
  });

  return errors;
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
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
  if (!response.ok) throw new Error("Impossible de charger la carte actuelle.");

  const data = await response.json();
  menuState = loadDraft() || deepClone(data);

  menuState.meta.commandes ??= { retrait: { creneaux: [] } };
  menuState.meta.commandes.retrait ??= { creneaux: [] };
  menuState.meta.commandes.retrait.creneaux ??= [];
  menuState.plats ??= [];

  menuState.meta.commandes.retrait.creneaux =
    menuState.meta.commandes.retrait.creneaux.map((c) => ({
      ...c,
      actif: c.actif !== false,
    }));

  setPlatViewMode(platViewMode);
  renderAll();
  setStatus("Carte chargée. N'oubliez pas d'enregistrer vos modifications.");
}

async function uploadPendingImages() {
  if (editingPlatId) syncModalToPlat();

  for (const plat of menuState.plats) {
    const file = pendingFiles.get(plat.id);
    if (!file) continue;

    const payload = await apiRequest(API.upload, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        platNom: plat.nom || `plat-${plat.id}`,
        contentType: file.type,
        dataBase64: await fileToBase64(file),
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
  closePlatModal();
  setToken("");
  menuState = null;
  pendingFiles.clear();
  previewUrls.forEach((url) => URL.revokeObjectURL(url));
  previewUrls.clear();
  loginPassword.value = "";
  showLogin();
}

function handlePlatFile(platId, file) {
  if (!file.type.startsWith("image/")) {
    window.alert("Choisissez une image (JPG, PNG, WEBP ou GIF).");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    window.alert("La photo est trop lourde (maximum 5 Mo).");
    return;
  }

  pendingFiles.set(platId, file);
  if (previewUrls.has(platId)) URL.revokeObjectURL(previewUrls.get(platId));
  previewUrls.set(platId, URL.createObjectURL(file));

  if (editingPlatId === platId) {
    updateModalPreview(getPlatById(platId));
  }
  renderPlats();
  saveDraft();
}

function togglePlatActif(platId, checked) {
  const plat = getPlatById(platId);
  if (!plat) return;
  plat.actif = checked;
  renderPlats();
  saveDraft();
}

platsList.addEventListener("click", (event) => {
  if (event.target.closest("[data-stop-prop], .ios-switch")) {
    const card = event.target.closest("[data-plat-id]");
    const checkbox = event.target.closest('[data-field="actif"]');
    if (checkbox && card) {
      togglePlatActif(card.dataset.platId, checkbox.checked);
    }
    return;
  }

  const editBtn = event.target.closest('[data-action="edit-plat"]');
  const card = event.target.closest("[data-plat-id]");
  if (!card) return;

  if (editBtn || platViewMode === "grid") {
    openPlatModal(card.dataset.platId);
  }
});

creneauxList.addEventListener("click", (event) => {
  const removeBtn = event.target.closest('[data-action="remove-creneau"]');
  if (removeBtn) {
    syncCreneauxFromDom();
    const row = removeBtn.closest("[data-creneau-index]");
    const index = Number.parseInt(row?.dataset.creneauIndex ?? "-1", 10);
    if (Number.isFinite(index) && index >= 0) {
      menuState.meta.commandes.retrait.creneaux.splice(index, 1);
      renderCreneaux();
      saveDraft();
    }
    return;
  }

  const checkbox = event.target.closest('[data-field="actif"]');
  if (checkbox) {
    syncCreneauxFromDom();
    saveDraft();
  }
});

creneauxList.addEventListener("input", (event) => {
  if (event.target.matches('[data-field="id"], [data-field="label"]')) {
    syncCreneauxFromDom();
    saveDraft();
  }
});

addPlatBtn.addEventListener("click", () => {
  const plat = createEmptyPlat();
  menuState.plats.push(plat);
  renderPlats();
  saveDraft();
  openPlatModal(plat.id);
});

addCreneauBtn.addEventListener("click", () => {
  syncCreneauxFromDom();
  menuState.meta.commandes.retrait.creneaux.push({
    id: nextCreneauId(),
    label: "",
    actif: true,
  });
  renderCreneaux();
  saveDraft();
});

document.querySelectorAll(".admin-segment__btn").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

document.querySelectorAll(".admin-view-toggle__btn").forEach((btn) => {
  btn.addEventListener("click", () => setPlatViewMode(btn.dataset.view));
});

platFilter?.addEventListener("change", renderPlats);

Object.values(metaFields).forEach((field) => {
  field?.addEventListener("input", () => {
    readMetaFromForm();
    saveDraft();
  });
});

Object.values(modalFields).forEach((field) => {
  if (!field || field.tagName === "IMG") return;
  field.addEventListener("input", () => {
    syncModalToPlat();
    if (field === modalFields.nom) {
      platModalTitle.textContent = modalFields.nom.value.trim() || "Nouveau plat";
    }
    saveDraft();
  });
  field.addEventListener("change", () => {
    syncModalToPlat();
    renderPlats();
    saveDraft();
  });
});

modalPhotoBtn?.addEventListener("click", () => modalFile?.click());
modalFile?.addEventListener("change", () => {
  if (modalFile.files?.[0] && editingPlatId) {
    handlePlatFile(editingPlatId, modalFile.files[0]);
    modalFile.value = "";
  }
});

modalSaveBtn?.addEventListener("click", closePlatModal);

modalDeleteBtn?.addEventListener("click", () => {
  if (!editingPlatId) return;
  const plat = getPlatById(editingPlatId);
  const label = plat?.nom || "ce plat";
  if (!window.confirm(`Supprimer ${label} ?`)) return;

  menuState.plats = menuState.plats.filter((p) => p.id !== editingPlatId);
  pendingFiles.delete(editingPlatId);
  if (previewUrls.has(editingPlatId)) {
    URL.revokeObjectURL(previewUrls.get(editingPlatId));
    previewUrls.delete(editingPlatId);
  }
  closePlatModal();
  renderPlats();
  saveDraft();
});

platModalClose?.addEventListener("click", closePlatModal);
platModalOverlay?.addEventListener("click", closePlatModal);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && platModal?.classList.contains("is-open")) {
    closePlatModal();
  }
});

saveBtn.addEventListener("click", saveMenu);
loginForm.addEventListener("submit", handleLogin);
logoutBtn.addEventListener("click", handleLogout);

setupDragDrop(platsList, "plat");
setupDragDrop(creneauxList, "creneau");

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
