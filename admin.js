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
const addCategoryBtn = document.getElementById("add-category-btn");
const categoryModal = document.getElementById("category-modal");
const categoryModalOverlay = document.getElementById("category-modal-overlay");
const categoryModalClose = document.getElementById("category-modal-close");
const categoryModalCancel = document.getElementById("category-modal-cancel");
const categoryModalSubmit = document.getElementById("category-modal-submit");
const categoryModalInput = document.getElementById("category-modal-input");
const categoryModalError = document.getElementById("category-modal-error");
const manageCategoryBtn = document.getElementById("manage-category-btn");
const categoryManageModal = document.getElementById("category-manage-modal");
const categoryManageOverlay = document.getElementById("category-manage-overlay");
const categoryManageClose = document.getElementById("category-manage-close");
const categoryManageTitle = document.getElementById("category-manage-title");
const categoryManageIntro = document.getElementById("category-manage-intro");
const categoryManageIn = document.getElementById("category-manage-in");
const categoryManageOut = document.getElementById("category-manage-out");
const categoryManageInEmpty = document.getElementById("category-manage-in-empty");
const categoryManageOutEmpty = document.getElementById("category-manage-out-empty");
const categoryManagePicker = document.getElementById("category-manage-picker");
const categoryManageDeleteBtn = document.getElementById("category-manage-delete");

let managingCategoryId = null;
/** @type {Set<string>} */
let protectedCategoryIds = new Set();
const platFilter = document.getElementById("plat-filter");
const platCategoryFilter = document.getElementById("plat-category-filter");
const platFilterMenu = document.getElementById("plat-filter-menu");
const platFilterBtn = document.getElementById("plat-filter-btn");
const platFilterPanel = document.getElementById("plat-filter-panel");
const platFilterBadge = document.getElementById("plat-filter-badge");
const weekBadge = document.getElementById("week-badge");
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
  portions: document.getElementById("modal-portions"),
  description: document.getElementById("modal-description"),
  composition: document.getElementById("modal-composition"),
  allergenes: document.getElementById("modal-allergenes"),
  categorie: document.getElementById("modal-categorie"),
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

/** @type {{ meta: object, categories: object[], plats: object[] } | null} */
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
    portions: "",
    description: "",
    composition: "",
    allergenes: "",
    image: "",
    categorieId: "",
    actif: true,
  };
}

function ensureMenuShape() {
  if (!menuState) return;
  menuState.categories ??= [];
  menuState.plats ??= [];
  menuState.plats.forEach((plat) => {
    if (plat.categorieId == null) plat.categorieId = "";
    if (plat.portions == null) plat.portions = "";
  });
}

function parsePortions(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const portions = Number.parseInt(raw, 10);
  return Number.isFinite(portions) && portions > 0 ? portions : null;
}

function formatPortionsLabel(value) {
  const portions = parsePortions(value);
  if (!portions) return "";
  return portions === 1 ? "Pour 1 personne" : `Pour ${portions} personnes`;
}

function nextCategoryId() {
  const nums = menuState.categories
    .map((cat) => Number.parseInt(String(cat.id).replace(/^cat-/, ""), 10))
    .filter(Number.isFinite);
  return `cat-${(nums.length ? Math.max(...nums) : 0) + 1}`;
}

function getCategoryById(id) {
  return menuState.categories.find((cat) => cat.id === id);
}

function getCategoryLabel(id) {
  if (!id) return "";
  return getCategoryById(id)?.nom || "";
}

function isProtectedCategory(id) {
  return protectedCategoryIds.has(String(id));
}

function updateCategoryManageActions() {
  if (!categoryManageDeleteBtn) return;

  const deletable = Boolean(managingCategoryId && !isProtectedCategory(managingCategoryId));
  categoryManageDeleteBtn.hidden = !deletable;
}

function deleteCategory(categoryId) {
  const category = getCategoryById(categoryId);
  if (!category || isProtectedCategory(categoryId)) return;

  const label = category.nom;
  const assignedCount = menuState.plats.filter((plat) => plat.categorieId === categoryId).length;
  let message = `Supprimer la catégorie « ${label} » ?`;
  if (assignedCount) {
    message += `\n\n${assignedCount} plat(s) n'auront plus de catégorie.`;
  }
  if (!window.confirm(message)) return;

  menuState.categories = menuState.categories.filter((cat) => cat.id !== categoryId);
  menuState.plats.forEach((plat) => {
    if (plat.categorieId === categoryId) plat.categorieId = "";
  });

  if (platCategoryFilter?.value === categoryId) {
    platCategoryFilter.value = "all";
  }

  renderCategoryFilterSelect();
  renderModalCategorySelect(modalFields.categorie?.value || "");

  if (menuState.categories.length && categoryManageModal?.classList.contains("is-open")) {
    managingCategoryId = menuState.categories[0].id;
    renderCategoryManagePicker(managingCategoryId);
    if (categoryManageTitle) {
      categoryManageTitle.textContent = getCategoryLabel(managingCategoryId) || "Catégorie";
    }
    renderCategoryManageLists();
    updateCategoryManageActions();
  } else {
    closeCategoryManageModal();
  }

  renderPlats();
  saveDraft();
  setStatus(`Catégorie « ${label} » supprimée.`, "success");
}

function renderCategoryFilterSelect() {
  if (!platCategoryFilter) return;

  const current = platCategoryFilter.value || "all";
  platCategoryFilter.innerHTML = [
    `<option value="all">Toutes les catégories</option>`,
    `<option value="none">Sans catégorie</option>`,
    ...menuState.categories.map(
      (cat) => `<option value="${escapeHtml(cat.id)}">${escapeHtml(cat.nom)}</option>`
    ),
  ].join("");

  if ([...platCategoryFilter.options].some((option) => option.value === current)) {
    platCategoryFilter.value = current;
  } else {
    platCategoryFilter.value = "all";
  }

  updateManageCategoryButton();
  updateFilterButtonState();
}

function getActiveFilterCount() {
  const visibility = platFilter?.value || "all";
  const category = platCategoryFilter?.value || "all";
  return (visibility !== "all" ? 1 : 0) + (category !== "all" ? 1 : 0);
}

function updateFilterButtonState() {
  const activeCount = getActiveFilterCount();

  if (platFilterBadge) {
    platFilterBadge.hidden = activeCount === 0;
    platFilterBadge.textContent = activeCount > 0 ? String(activeCount) : "";
  }

  if (platFilterBtn) {
    platFilterBtn.classList.toggle("is-active", activeCount > 0);
    const parts = [];
    const visibility = platFilter?.value || "all";
    const category = platCategoryFilter?.value || "all";

    if (visibility === "active") parts.push("En ligne");
    else if (visibility === "inactive") parts.push("Masqués");

    if (category === "none") parts.push("Sans catégorie");
    else if (isRealCategoryFilter(category)) parts.push(getCategoryLabel(category));

    platFilterBtn.title = parts.length ? `Filtres : ${parts.join(" · ")}` : "Filtrer les plats";
    platFilterBtn.setAttribute(
      "aria-label",
      parts.length ? `Filtres actifs : ${parts.join(", ")}` : "Filtrer les plats"
    );
  }
}

function openPlatFilterPanel() {
  if (!platFilterMenu || !platFilterBtn || !platFilterPanel) return;

  platFilterMenu.classList.add("is-open");
  platFilterPanel.hidden = false;
  platFilterBtn.setAttribute("aria-expanded", "true");
}

function closePlatFilterPanel() {
  if (!platFilterMenu || !platFilterBtn || !platFilterPanel) return;

  platFilterMenu.classList.remove("is-open");
  platFilterPanel.hidden = true;
  platFilterBtn.setAttribute("aria-expanded", "false");
}

function togglePlatFilterPanel() {
  if (platFilterMenu?.classList.contains("is-open")) {
    closePlatFilterPanel();
  } else {
    openPlatFilterPanel();
  }
}

function renderCategoryOptionsHtml(selectedId = "") {
  return [
    `<option value=""${!selectedId ? " selected" : ""}>Sans catégorie</option>`,
    ...menuState.categories.map(
      (cat) =>
        `<option value="${escapeHtml(cat.id)}"${cat.id === selectedId ? " selected" : ""}>${escapeHtml(cat.nom)}</option>`
    ),
  ].join("");
}

function renderModalCategorySelect(selectedId = "") {
  if (!modalFields.categorie) return;
  modalFields.categorie.innerHTML = renderCategoryOptionsHtml(selectedId);
  modalFields.categorie.value = selectedId || "";
}

function renderPlatCategorySelect(plat, compactClass = "admin-plat-card__category-select") {
  return `
    <label class="admin-plat-card__category-field" data-stop-prop>
      <span class="admin-plat-card__category-label">Catégorie</span>
      <select class="${compactClass}" data-field="categorie" aria-label="Catégorie de ${escapeHtml(plat.nom || "ce plat")}">
        ${renderCategoryOptionsHtml(plat.categorieId || "")}
      </select>
    </label>
  `;
}

function setPlatCategory(platId, categorieId) {
  const plat = getPlatById(platId);
  if (!plat) return;

  plat.categorieId = categorieId || "";
  if (editingPlatId === platId && modalFields.categorie) {
    modalFields.categorie.value = plat.categorieId;
  }

  renderPlats();
  if (categoryManageModal?.classList.contains("is-open")) {
    renderCategoryManageLists();
  }
  saveDraft();
}

function isRealCategoryFilter(value) {
  return Boolean(value && value !== "all" && value !== "none");
}

function updateManageCategoryButton() {
  if (!manageCategoryBtn) return;

  const catId = platCategoryFilter?.value;
  if (isRealCategoryFilter(catId)) {
    const label = getCategoryLabel(catId) || "cette catégorie";
    manageCategoryBtn.title = `Gérer « ${label} »`;
    manageCategoryBtn.setAttribute("aria-label", `Gérer la catégorie ${label}`);
  } else {
    manageCategoryBtn.title = "Gérer les catégories";
    manageCategoryBtn.setAttribute("aria-label", "Gérer les catégories");
  }
}

function renderCategoryManagePicker(selectedId = "") {
  if (!categoryManagePicker) return;

  categoryManagePicker.innerHTML = menuState.categories
    .map(
      (cat) =>
        `<option value="${escapeHtml(cat.id)}"${cat.id === selectedId ? " selected" : ""}>${escapeHtml(cat.nom)}</option>`
    )
    .join("");
  categoryManagePicker.disabled = menuState.categories.length === 0;
}

function resolveCategoryManageId(preferredId = null) {
  if (isRealCategoryFilter(preferredId)) return preferredId;
  if (isRealCategoryFilter(platCategoryFilter?.value)) return platCategoryFilter.value;
  return menuState.categories[0]?.id || "";
}

function renderCategoryManageLists() {
  if (!managingCategoryId || !categoryManageIn || !categoryManageOut) return;

  const inCategory = menuState.plats.filter((plat) => plat.categorieId === managingCategoryId);
  const outCategory = menuState.plats.filter((plat) => plat.categorieId !== managingCategoryId);

  categoryManageIn.innerHTML = inCategory
    .map(
      (plat) => `
      <li class="category-manage-item">
        <span class="category-manage-item__name">${escapeHtml(plat.nom || "Plat sans nom")}</span>
        <button type="button" class="admin-btn admin-btn--soft" data-action="remove-from-category" data-plat-id="${escapeHtml(plat.id)}">Retirer</button>
      </li>
    `
    )
    .join("");

  categoryManageOut.innerHTML = outCategory
    .map((plat) => {
      const currentLabel = getCategoryLabel(plat.categorieId) || "Sans catégorie";
      return `
      <li class="category-manage-item">
        <span class="category-manage-item__name">
          ${escapeHtml(plat.nom || "Plat sans nom")}
          <span class="category-manage-item__meta">${escapeHtml(currentLabel)}</span>
        </span>
        <button type="button" class="admin-btn admin-btn--primary" data-action="add-to-category" data-plat-id="${escapeHtml(plat.id)}">Ajouter</button>
      </li>
    `;
    })
    .join("");

  if (categoryManageInEmpty) categoryManageInEmpty.hidden = inCategory.length > 0;
  if (categoryManageOutEmpty) categoryManageOutEmpty.hidden = outCategory.length > 0;
  if (categoryManageIntro) {
    categoryManageIntro.textContent = `${inCategory.length} plat(s) dans cette catégorie · ${outCategory.length} disponible(s) à ajouter.`;
  }

  updateCategoryManageActions();
}

function openCategoryManageModal(preferredCategoryId = null) {
  if (!categoryManageModal) return;

  const categoryId = resolveCategoryManageId(preferredCategoryId);
  if (!categoryId) {
    setStatus("Créez d'abord une catégorie avec le bouton +.", "error");
    return;
  }

  managingCategoryId = categoryId;
  renderCategoryManagePicker(categoryId);
  if (categoryManageTitle) {
    categoryManageTitle.textContent = getCategoryLabel(categoryId) || "Catégorie";
  }
  renderCategoryManageLists();
  updateCategoryManageActions();

  categoryManageModal.hidden = false;
  categoryManageModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("is-modal-open");
  requestAnimationFrame(() => categoryManageModal.classList.add("is-open"));
}

function closeCategoryManageModal() {
  if (!categoryManageModal) return;

  managingCategoryId = null;
  categoryManageModal.classList.remove("is-open");
  categoryManageModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("is-modal-open");
  setTimeout(() => {
    categoryManageModal.hidden = true;
  }, 350);
}

function getFilteredPlats() {
  const visibility = platFilter?.value || "all";
  const category = platCategoryFilter?.value || "all";

  return menuState.plats.filter((plat) => {
    if (visibility === "active" && plat.actif === false) return false;
    if (visibility === "inactive" && plat.actif !== false) return false;

    const categorieId = plat.categorieId || "";
    if (category === "none" && categorieId) return false;
    if (category !== "all" && category !== "none" && categorieId !== category) return false;

    return true;
  });
}

function showCategoryModalError(message) {
  if (!categoryModalError) return;
  if (!message) {
    categoryModalError.hidden = true;
    categoryModalError.textContent = "";
    return;
  }
  categoryModalError.hidden = false;
  categoryModalError.textContent = message;
}

function openCategoryModal() {
  if (!categoryModal) return;

  showCategoryModalError("");
  if (categoryModalInput) categoryModalInput.value = "";

  categoryModal.hidden = false;
  categoryModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("is-modal-open");
  requestAnimationFrame(() => categoryModal.classList.add("is-open"));
  categoryModalInput?.focus();
}

function closeCategoryModal() {
  if (!categoryModal) return;

  categoryModal.classList.remove("is-open");
  categoryModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("is-modal-open");
  showCategoryModalError("");
  setTimeout(() => {
    categoryModal.hidden = true;
  }, 350);
}

function submitCategoryModal() {
  const nom = categoryModalInput?.value.trim() || "";
  if (!nom) {
    showCategoryModalError("Indiquez un nom pour la catégorie.");
    categoryModalInput?.focus();
    return;
  }

  const exists = menuState.categories.some(
    (cat) => cat.nom.localeCompare(nom, "fr", { sensitivity: "accent" }) === 0
  );
  if (exists) {
    showCategoryModalError("Cette catégorie existe déjà.");
    categoryModalInput?.focus();
    return;
  }

  const id = nextCategoryId();
  menuState.categories.push({ id, nom });
  renderCategoryFilterSelect();
  renderModalCategorySelect(modalFields.categorie?.value || "");
  if (platCategoryFilter) platCategoryFilter.value = id;
  saveDraft();
  renderPlats();
  closeCategoryModal();
  setStatus(`Catégorie « ${nom} » ajoutée.`, "success");
}

function handleAddCategory() {
  openCategoryModal();
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
        ${renderPlatCategorySelect(plat)}
        <p class="admin-plat-card__price">${formatPrice(plat.prix)}</p>
        ${formatPortionsLabel(plat.portions) ? `<p class="admin-plat-card__portions">${escapeHtml(formatPortionsLabel(plat.portions))}</p>` : ""}
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
        <p class="admin-plat-row__meta">${formatPrice(plat.prix)}${formatPortionsLabel(plat.portions) ? ` · ${escapeHtml(formatPortionsLabel(plat.portions))}` : ""} · ${escapeHtml(plat.description || "—")}</p>
        <select class="admin-plat-row__category-select" data-field="categorie" data-stop-prop aria-label="Catégorie de ${escapeHtml(plat.nom || "ce plat")}">
          ${renderCategoryOptionsHtml(plat.categorieId || "")}
        </select>
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

  if (!menuState.plats.length) {
    platsList.innerHTML = `<p class="admin-empty">Aucun plat pour le moment. Ajoutez-en un avec le bouton ci-dessus.</p>`;
    return;
  }

  if (!plats.length) {
    platsList.innerHTML = `<p class="admin-empty">Aucun plat ne correspond à ces filtres. Modifiez la visibilité ou la catégorie.</p>`;
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
  renderCategoryFilterSelect();
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
  plat.portions = parsePortions(modalFields.portions?.value) ?? "";
  plat.description = modalFields.description.value.trim();
  plat.composition = modalFields.composition.value.trim();
  plat.allergenes = modalFields.allergenes.value.trim();
  plat.categorieId = modalFields.categorie?.value || "";
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
  modalFields.portions.value = parsePortions(plat.portions) ?? "";
  modalFields.description.value = plat.description || "";
  modalFields.composition.value = plat.composition || "";
  modalFields.allergenes.value = plat.allergenes || "";
  renderModalCategorySelect(plat.categorieId || "");
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
    if (
      !item ||
      event.target.closest(
        "[data-stop-prop], .ios-switch, button, input, select, label.admin-field, label.admin-plat-card__category-field"
      )
    ) {
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

const IMAGE_PATH =
  /^assets\/Plats\/[a-zA-Z0-9àâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ \-&_]+\.(jpg|jpeg|png|webp|gif)$/i;

function isValidImagePath(imagePath) {
  if (!imagePath) return false;
  const path = String(imagePath).trim();
  if (path.includes("..") || path.includes("\\") || path.includes("//")) return false;
  if (!path.startsWith("assets/Plats/")) return false;
  return IMAGE_PATH.test(path);
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
    if (String(plat.portions ?? "").trim() && !parsePortions(plat.portions)) {
      errors.push(`${label} : indiquez un nombre de personnes valide (1 minimum).`);
    }
    if (!plat.image?.trim() && !pendingFiles.has(plat.id)) {
      errors.push(`${label} : ajoutez une photo.`);
    } else if (
      plat.image?.trim() &&
      !pendingFiles.has(plat.id) &&
      !isValidImagePath(plat.image)
    ) {
      errors.push(`${label} : chemin d'image invalide.`);
    }
  });

  meta.commandes.retrait.creneaux.forEach((creneau, index) => {
    if (creneau.actif !== false && !creneau.label?.trim()) {
      errors.push(`Créneau ${index + 1} : le libellé est obligatoire.`);
    }
  });

  return errors;
}

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const MAX_IMAGE_WIDTH = 1200;
const IMAGE_QUALITY = 0.8;

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossible de lire la photo."));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Compression impossible."))),
      type,
      quality
    );
  });
}

async function compressImageFile(file) {
  const img = await loadImageFromFile(file);
  let { width, height } = img;

  if (width > MAX_IMAGE_WIDTH) {
    height = Math.round((height * MAX_IMAGE_WIDTH) / width);
    width = MAX_IMAGE_WIDTH;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Compression impossible.");

  ctx.drawImage(img, 0, 0, width, height);

  for (const type of ["image/webp", "image/jpeg"]) {
    try {
      const blob = await canvasToBlob(canvas, type, IMAGE_QUALITY);
      if (blob.size <= MAX_UPLOAD_BYTES) {
        const ext = type === "image/webp" ? "webp" : "jpg";
        return new File([blob], `photo.${ext}`, { type, lastModified: Date.now() });
      }
    } catch {
      /* format non supporté, essai suivant */
    }
  }

  const fallback = await canvasToBlob(canvas, "image/jpeg", 0.65);
  if (fallback.size > MAX_UPLOAD_BYTES) {
    throw new Error("La photo reste trop lourde après compression (maximum 2 Mo).");
  }
  return new File([fallback], "photo.jpg", {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
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
  protectedCategoryIds = new Set((data.categories || []).map((cat) => String(cat.id)));
  menuState = loadDraft() || deepClone(data);

  menuState.meta.commandes ??= { retrait: { creneaux: [] } };
  menuState.meta.commandes.retrait ??= { creneaux: [] };
  menuState.meta.commandes.retrait.creneaux ??= [];
  menuState.plats ??= [];
  ensureMenuShape();

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
    protectedCategoryIds = new Set(menuState.categories.map((cat) => String(cat.id)));
    renderAll();
    if (categoryManageModal?.classList.contains("is-open")) {
      updateCategoryManageActions();
    }
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

async function handlePlatFile(platId, file) {
  if (!file.type.startsWith("image/")) {
    window.alert("Choisissez une image (JPG, PNG, WEBP ou GIF).");
    return;
  }
  if (file.size > MAX_SOURCE_BYTES) {
    window.alert("La photo source est trop lourde (maximum 15 Mo).");
    return;
  }

  let compressed;
  try {
    compressed = await compressImageFile(file);
  } catch (error) {
    window.alert(error.message || "Impossible de préparer la photo.");
    return;
  }

  pendingFiles.set(platId, compressed);
  if (previewUrls.has(platId)) URL.revokeObjectURL(previewUrls.get(platId));
  previewUrls.set(platId, URL.createObjectURL(compressed));

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

platsList.addEventListener("change", (event) => {
  const select = event.target.closest('[data-field="categorie"]');
  const card = event.target.closest("[data-plat-id]");
  if (!select || !card) return;
  setPlatCategory(card.dataset.platId, select.value);
});

platsList.addEventListener("click", (event) => {
  if (event.target.closest("[data-stop-prop], .ios-switch, [data-field='categorie']")) {
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

platFilterBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  togglePlatFilterPanel();
});
platFilterPanel?.addEventListener("click", (event) => event.stopPropagation());
platFilter?.addEventListener("change", () => {
  renderPlats();
  updateFilterButtonState();
});
platCategoryFilter?.addEventListener("change", () => {
  renderPlats();
  updateManageCategoryButton();
  updateFilterButtonState();
});
document.addEventListener("click", () => {
  if (platFilterMenu?.classList.contains("is-open")) {
    closePlatFilterPanel();
  }
});
addCategoryBtn?.addEventListener("click", handleAddCategory);
manageCategoryBtn?.addEventListener("click", () => {
  openCategoryManageModal(platCategoryFilter?.value);
});
categoryManagePicker?.addEventListener("change", () => {
  managingCategoryId = categoryManagePicker.value;
  if (categoryManageTitle) {
    categoryManageTitle.textContent = getCategoryLabel(managingCategoryId) || "Catégorie";
  }
  renderCategoryManageLists();
});
categoryManageDeleteBtn?.addEventListener("click", () => {
  if (managingCategoryId) deleteCategory(managingCategoryId);
});
categoryManageClose?.addEventListener("click", closeCategoryManageModal);
categoryManageOverlay?.addEventListener("click", closeCategoryManageModal);
categoryManageModal?.addEventListener("click", (event) => {
  const addBtn = event.target.closest('[data-action="add-to-category"]');
  const removeBtn = event.target.closest('[data-action="remove-from-category"]');
  if (addBtn) {
    setPlatCategory(addBtn.dataset.platId, managingCategoryId);
    return;
  }
  if (removeBtn) {
    setPlatCategory(removeBtn.dataset.platId, "");
  }
});
categoryModalClose?.addEventListener("click", closeCategoryModal);
categoryModalCancel?.addEventListener("click", closeCategoryModal);
categoryModalOverlay?.addEventListener("click", closeCategoryModal);
categoryModalSubmit?.addEventListener("click", submitCategoryModal);
categoryModalInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    submitCategoryModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && platFilterMenu?.classList.contains("is-open")) {
    closePlatFilterPanel();
    platFilterBtn?.focus();
    return;
  }
  if (event.key === "Escape" && categoryManageModal?.classList.contains("is-open")) {
    closeCategoryManageModal();
    return;
  }
  if (event.key === "Escape" && categoryModal?.classList.contains("is-open")) {
    closeCategoryModal();
  }
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
