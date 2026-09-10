/**
 * Les Bons Plats de Marlou
 */

const WHATSAPP_NUMBER = "33611772019";

/* --- Données dynamiques -------------------------------------------------- */

let menuData = null;
let boutiqueData = null;
let productCatalog = {};
let dishes = [];

const quantities = {};
const selectedVariants = {};

/* --- Header slider (images uniquement) ----------------------------------- */

const HEADER_IMAGES = [
  "assets/Header/hearder 1.png",
  "assets/Header/hearder 2.png",
  "assets/Header/hearder 3.png",
  "assets/Header/hearder 4.png",
  "assets/Header/hearder 5.png",
  "assets/Header/hearder 6.png",
  "assets/Header/hearder 7.png",
  "assets/Header/hearder 8.png",
  "assets/Header/hearder 9.png",
];

const headerImgA = document.getElementById("header-img-a");
const headerImgB = document.getElementById("header-img-b");

let currentHeaderIndex = 0;
let showingImgA = true;

function pickRandomIndex() {
  if (HEADER_IMAGES.length <= 1) return 0;
  let next;
  do {
    next = Math.floor(Math.random() * HEADER_IMAGES.length);
  } while (next === currentHeaderIndex);
  return next;
}

function showHeaderSlide(index) {
  const src = HEADER_IMAGES[index];
  const visibleImg = showingImgA ? headerImgA : headerImgB;
  const hiddenImg = showingImgA ? headerImgB : headerImgA;

  hiddenImg.src = src;
  hiddenImg.classList.add("is-visible");
  visibleImg.classList.remove("is-visible");
  showingImgA = !showingImgA;
  currentHeaderIndex = index;
}

if (headerImgA && headerImgB) {
  headerImgA.src = HEADER_IMAGES[0];
  currentHeaderIndex = 0;

  setInterval(() => {
    showHeaderSlide(pickRandomIndex());
  }, 9000);
}

/* --- Navbar sticky au scroll vers le haut -------------------------------- */

const stickyNav = document.getElementById("sticky-nav");
const headerEl = document.querySelector(".header");

let lastScrollY = window.scrollY;
let stickyTicking = false;
const STICKY_SCROLL_DELTA = 6;

function setStickyNavVisible(visible) {
  stickyNav.classList.toggle("is-visible", visible);
  stickyNav.setAttribute("aria-hidden", visible ? "false" : "true");
}

function updateStickyNav() {
  if (!stickyNav || !headerEl) return;

  const currentScrollY = window.scrollY;
  const headerHeight = headerEl.offsetHeight;
  const scrolledPastHeader = currentScrollY > headerHeight * 0.55;
  const scrollDelta = currentScrollY - lastScrollY;

  if (!scrolledPastHeader) {
    setStickyNavVisible(false);
  } else if (scrollDelta < -STICKY_SCROLL_DELTA) {
    setStickyNavVisible(true);
  } else if (scrollDelta > STICKY_SCROLL_DELTA) {
    setStickyNavVisible(false);
  }

  lastScrollY = currentScrollY;
  stickyTicking = false;
}

window.addEventListener(
  "scroll",
  () => {
    if (!stickyTicking) {
      requestAnimationFrame(updateStickyNav);
      stickyTicking = true;
    }
  },
  { passive: true }
);

/* --- Menu mobile (burger) ------------------------------------------------ */

function initMobileNav() {
  const mobileNav = document.getElementById("mobile-nav");
  const toggles = document.querySelectorAll(".nav-toggle");
  if (!mobileNav || !toggles.length) return;

  const closeTargets = mobileNav.querySelectorAll("[data-nav-close]");
  const links = mobileNav.querySelectorAll(".mobile-nav__link");

  function setNavOpen(open) {
    mobileNav.classList.toggle("is-open", open);
    mobileNav.setAttribute("aria-hidden", open ? "false" : "true");
    document.body.classList.toggle("is-nav-open", open);
    toggles.forEach((btn) => {
      btn.setAttribute("aria-expanded", String(open));
      btn.classList.toggle("is-active", open);
    });
  }

  toggles.forEach((btn) => {
    btn.addEventListener("click", () => {
      setNavOpen(!mobileNav.classList.contains("is-open"));
    });
  });

  closeTargets.forEach((el) => {
    el.addEventListener("click", () => setNavOpen(false));
  });

  links.forEach((link) => {
    link.addEventListener("click", () => setNavOpen(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && mobileNav.classList.contains("is-open")) {
      setNavOpen(false);
    }
  });
}
updateStickyNav();

/* --- Chargement & rendu des données -------------------------------------- */

async function loadData() {
  const [menuResponse, boutiqueResponse] = await Promise.all([
    fetch("data/menu-semaine.json"),
    fetch("data/boutique.json"),
  ]);

  if (!menuResponse.ok) {
    throw new Error(`Impossible de charger menu-semaine.json (${menuResponse.status})`);
  }
  if (!boutiqueResponse.ok) {
    throw new Error(`Impossible de charger boutique.json (${boutiqueResponse.status})`);
  }

  menuData = await menuResponse.json();
  boutiqueData = await boutiqueResponse.json();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPrice(amount) {
  return amount.toFixed(2).replace(".", ",") + "\u00a0€";
}

const CHECKOUT_LIMITS = {
  nameMax: 80,
  phoneMax: 20,
  commentMax: 500,
  creneauLabelMax: 120,
};

function stripControlChars(value) {
  return String(value).replace(/[\u0000-\u001F\u007F]/g, "");
}

function sanitizeCustomerName(value) {
  return stripControlChars(value)
    .replace(/[^\p{L}\p{N}\s'.-]/gu, "")
    .trim()
    .slice(0, CHECKOUT_LIMITS.nameMax);
}

function sanitizePhoneDisplay(value) {
  return stripControlChars(value)
    .replace(/[^\d\s+().-]/g, "")
    .trim()
    .slice(0, CHECKOUT_LIMITS.phoneMax);
}

function sanitizeComment(value) {
  return stripControlChars(value)
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, CHECKOUT_LIMITS.commentMax);
}

function sanitizeCreneauLabel(value) {
  return stripControlChars(value).trim().slice(0, CHECKOUT_LIMITS.creneauLabelMax);
}

function getCatalogEntry(id) {
  return productCatalog[id] || null;
}

function getCatalogPrice(id) {
  const prix = getCatalogEntry(id)?.prix;
  if (typeof prix !== "number" || !Number.isFinite(prix) || prix < 0) {
    return null;
  }
  return prix;
}

function getCatalogName(id) {
  return getCatalogEntry(id)?.nom || "";
}

function getCreneauFromSource(creneauId) {
  const creneaux = menuData?.meta?.commandes?.retrait?.creneaux || [];
  return creneaux.find((creneau) => creneau.id === creneauId) || null;
}

function buildProductCatalog() {
  productCatalog = {};

  (menuData?.plats || [])
    .filter((plat) => plat.actif !== false)
    .forEach((plat) => {
      productCatalog[plat.id] = {
        type: "plat",
        tag: "Plat du jour",
        nom: plat.nom,
        description: plat.description,
        prix: plat.prix,
        images: plat.images?.length
          ? plat.images
          : [{ src: plat.image, label: "Vue principale" }],
        composition: plat.composition,
        allergens: plat.allergenes,
        portions: plat.portions,
      };
    });

  (boutiqueData?.articles || [])
    .filter((article) => article.actif !== false)
    .forEach((article) => {
      productCatalog[article.id] = {
        type: "boutique",
        tag: "La boutique",
        nom: article.nom,
        description: article.description,
        prix: article.prix,
        variantPreviews: article.variantPreviews,
        images: article.images || [],
        composition: article.composition,
        care: article.care,
      };
    });
}

function formatDateFr(isoDate) {
  const value = String(isoDate ?? "").trim();
  if (!value) return "";

  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function applySectionMeta() {
  const menuTitle = document.getElementById("menu-title");
  const menuIntro = document.querySelector("#carte-de-la-semaine .section__intro");
  const merchTitle = document.getElementById("merch-title");
  const merchIntro = document.querySelector("#la-boutique .section__intro");
  const headerPitch = document.getElementById("header-pitch");
  const stepCommandeText = document.getElementById("step-commande-text");
  const stepRetraitText = document.getElementById("step-retrait-text");
  const faqCommandes = document.getElementById("faq-commandes");
  const faqRetraitPeriode = document.getElementById("faq-retrait-periode");
  const faqRetraitAdresse = document.getElementById("faq-retrait-adresse");

  const commandes = menuData?.meta?.commandes;
  const jours = commandes?.jours || "lundi au jeudi";
  const periode = commandes?.retrait?.periode || "début de semaine suivante";
  const adresse = commandes?.retrait?.adresse || "49 Route de Chandieu, Toussieu";
  const debut = formatDateFr(commandes?.debut);
  const fin = formatDateFr(commandes?.fin);
  const periodeDates =
    debut && fin ? ` du ${debut} au ${fin}` : debut ? ` à partir du ${debut}` : fin ? ` jusqu'au ${fin}` : "";

  if (menuTitle && menuData?.meta?.titre) {
    menuTitle.textContent = menuData.meta.titre;
  }
  if (menuIntro && menuData?.meta?.intro) {
    menuIntro.textContent = menuData.meta.intro;
  }
  if (merchTitle && boutiqueData?.meta?.titre) {
    merchTitle.textContent = boutiqueData.meta.titre;
  }
  if (merchIntro && boutiqueData?.meta?.intro) {
    merchIntro.textContent = boutiqueData.meta.intro;
  }
  if (headerPitch) {
    headerPitch.textContent = `Choisissez vos plats, validez ${jours}${periodeDates}, récupérez ${periode}.`;
  }
  if (stepCommandeText) {
    stepCommandeText.textContent = `Je valide ma sélection ${jours}${periodeDates}, pour anticiper la cuisine de Marlou.`;
  }
  if (stepRetraitText) {
    stepRetraitText.textContent = `Je viens chercher mes bons petits plats au point de retrait ${periode}.`;
  }
  if (faqCommandes) {
    const joursLabel = /^du\b/i.test(jours) ? jours : `du ${jours}`;
    faqCommandes.innerHTML = `Les commandes sont ouvertes <strong>${escapeHtml(joursLabel)}</strong>${escapeHtml(periodeDates)}, pour la semaine suivante. Cela laisse le temps à Marlou de préparer vos plats avec soin.`;
  }
  if (faqRetraitPeriode) {
    faqRetraitPeriode.innerHTML = `Le retrait se fait <strong>${escapeHtml(periode)}</strong>, au point de retrait indiqué par Marlou lors de la confirmation.`;
  }
  if (faqRetraitAdresse) {
    faqRetraitAdresse.innerHTML = `Le retrait s'effectue au <strong>${escapeHtml(adresse)}</strong>, comme indiqué dans le mémo des commandes.`;
  }
}

function formatPortionsLabel(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const portions = Number.parseInt(raw, 10);
  if (!Number.isFinite(portions) || portions < 1) return "";
  return portions === 1 ? "Pour 1 personne" : `Pour ${portions} personnes`;
}

function createDishCard(item, { isBoutique = false } = {}) {
  const imageSrc = isBoutique
    ? item.variantPreviews?.clair || item.images?.[0]?.src || ""
    : item.image;

  const article = document.createElement("article");
  article.className = "dish";
  article.dataset.id = item.id;

  const portionsLabel = !isBoutique ? formatPortionsLabel(item.portions) : "";

  article.innerHTML = `
    <img class="dish__image" src="${escapeHtml(imageSrc)}" alt="${escapeHtml(item.nom)}" width="400" height="300" loading="lazy">
    <div class="dish__body">
      <h3 class="dish__title">${escapeHtml(item.nom)}</h3>
      <p class="dish__description">${escapeHtml(item.description)}</p>
      ${portionsLabel ? `<p class="dish__portions">${escapeHtml(portionsLabel)}</p>` : ""}
      <div class="dish__footer">
        <span class="dish__price">${formatPrice(item.prix)}</span>
        <div class="dish__qty" role="group" aria-label="Quantité ${escapeHtml(item.nom)}">
          <button type="button" class="qty-btn qty-btn--minus" aria-label="Diminuer la quantité">−</button>
          <span class="qty-value" aria-live="polite">0</span>
          <button type="button" class="qty-btn qty-btn--plus" aria-label="Augmenter la quantité">+</button>
        </div>
      </div>
    </div>
  `;

  return article;
}

function renderMenuGrid() {
  const grid = document.getElementById("menu-grid");
  if (!grid) return;

  grid.innerHTML = "";

  (menuData?.plats || [])
    .filter((plat) => plat.actif !== false)
    .forEach((plat) => {
      grid.appendChild(createDishCard(plat));
    });
}

function renderBoutiqueGrid() {
  const grid = document.getElementById("boutique-grid");
  if (!grid) return;

  grid.innerHTML = "";

  (boutiqueData?.articles || [])
    .filter((article) => article.actif !== false)
    .forEach((article) => {
      grid.appendChild(createDishCard(article, { isBoutique: true }));
    });
}

/* --- Fiches détaillées (popup) ------------------------------------------- */

const itemModal = document.getElementById("item-modal");
const itemModalImage = document.getElementById("item-modal-image");
const itemModalThumbs = document.getElementById("item-modal-thumbs");
const itemModalTag = document.getElementById("item-modal-tag");
const itemModalTitle = document.getElementById("item-modal-title");
const itemModalPrice = document.getElementById("item-modal-price");
const itemModalPortions = document.getElementById("item-modal-portions");
const itemModalDesc = document.getElementById("item-modal-desc");
const itemModalLabelComposition = document.getElementById("item-modal-label-composition");
const itemModalComposition = document.getElementById("item-modal-composition");
const itemModalBlockAllergens = document.getElementById("item-modal-block-allergens");
const itemModalAllergens = document.getElementById("item-modal-allergens");
const itemModalBlockCare = document.getElementById("item-modal-block-care");
const itemModalCare = document.getElementById("item-modal-care");
const itemModalQtyValue = document.getElementById("item-modal-qty-value");
const itemModalMinus = document.getElementById("item-modal-minus");
const itemModalPlus = document.getElementById("item-modal-plus");
const itemModalVariants = document.getElementById("item-modal-variants");
const itemModalVariantBtns = itemModalVariants?.querySelectorAll(".variant-btn");
const itemModalCloseBtns = itemModal?.querySelectorAll("[data-modal-close]");

let activeModalId = null;
let lastFocusedElement = null;
let activeModalImages = [];

const VARIANT_LABELS = {
  clair: "Clair",
  sombre: "Sombre",
};

function isBoutiqueItem(id) {
  return productCatalog[id]?.type === "boutique";
}

function detectVariantFromImage(src) {
  if (/_sombre(\.|_|$)/.test(src)) return "sombre";
  if (/_clair(\.|_|$)/.test(src)) return "clair";
  return null;
}

function getModalImageIndexForVariant(id, variant) {
  const images = productCatalog[id]?.images || [];
  const matchIndex = images.findIndex((image) => detectVariantFromImage(image.src) === variant);
  return matchIndex >= 0 ? matchIndex : 0;
}

function setModalImage(index, images = activeModalImages) {
  const image = images[index];
  if (!image || !itemModalImage) return;

  activeModalImages = images;

  const detectedVariant = detectVariantFromImage(image.src);
  if (detectedVariant && activeModalId && isBoutiqueItem(activeModalId)) {
    setVariant(activeModalId, detectedVariant, { updateModalImage: false });
  }

  itemModalImage.classList.add("is-fading");
  window.setTimeout(() => {
    itemModalImage.src = image.src;
    itemModalImage.alt = image.label
      ? `${itemModalTitle.textContent} — ${image.label}`
      : itemModalTitle.textContent;
    itemModalImage.classList.remove("is-fading");
  }, 180);

  itemModalThumbs.querySelectorAll(".item-modal__thumb").forEach((thumb, thumbIndex) => {
    thumb.classList.toggle("is-active", thumbIndex === index);
    thumb.setAttribute("aria-selected", String(thumbIndex === index));
  });
}

function renderModalThumbs(images) {
  itemModalThumbs.innerHTML = "";
  activeModalImages = images;

  if (images.length <= 1) return;

  images.forEach((image, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `item-modal__thumb${index === 0 ? " is-active" : ""}`;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(index === 0));
    button.setAttribute("aria-label", image.label || `Photo ${index + 1}`);

    const thumbImg = document.createElement("img");
    thumbImg.src = image.src;
    thumbImg.alt = "";
    button.appendChild(thumbImg);

    button.addEventListener("click", () => setModalImage(index, images));
    itemModalThumbs.appendChild(button);
  });
}

function syncVariantButtons(id) {
  if (!isBoutiqueItem(id)) return;

  const variant = selectedVariants[id] || "clair";

  document.querySelectorAll(`.dish[data-id="${id}"] .variant-btn`).forEach((button) => {
    button.classList.toggle("is-active", button.dataset.variant === variant);
    button.setAttribute("aria-pressed", String(button.dataset.variant === variant));
  });

  itemModalVariantBtns?.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.variant === variant);
    button.setAttribute("aria-pressed", String(button.dataset.variant === variant));
  });
}

function setVariant(id, variant, options = {}) {
  const { updateModalImage = true } = options;
  const details = productCatalog[id];
  const dish = document.querySelector(`.dish[data-id="${id}"]`);

  if (!details || !dish || !isBoutiqueItem(id)) return;
  if (!details.variantPreviews?.[variant]) return;

  selectedVariants[id] = variant;

  const previewImage = dish.querySelector(".dish__image");
  if (previewImage) {
    previewImage.src = details.variantPreviews[variant];
    previewImage.alt = `${getCatalogName(id)} — ${VARIANT_LABELS[variant]}`;
  }

  syncVariantButtons(id);

  if (updateModalImage && activeModalId === id) {
    setModalImage(getModalImageIndexForVariant(id, variant), details.images);
  }
}

function getItemDisplayName(id) {
  const baseName = getCatalogName(id);
  if (!isBoutiqueItem(id)) return baseName;

  const variant = selectedVariants[id] || "clair";
  return `${baseName} — ${VARIANT_LABELS[variant]}`;
}

function syncModalQuantity() {
  if (!activeModalId) return;

  const qty = quantities[activeModalId] || 0;
  itemModalQtyValue.textContent = qty;
  itemModalMinus.disabled = qty === 0;
}

function openItemModal(id) {
  const dish = document.querySelector(`.dish[data-id="${id}"]`);
  const details = productCatalog[id];

  if (!dish || !details || !itemModal) return;

  activeModalId = id;
  lastFocusedElement = document.activeElement;

  itemModalTag.textContent = details.tag;
  itemModalTitle.textContent = getCatalogName(id);
  itemModalPrice.textContent = formatPrice(getCatalogPrice(id) ?? 0);
  const portionsLabel = details.type === "boutique" ? "" : formatPortionsLabel(details.portions);
  if (itemModalPortions) {
    itemModalPortions.textContent = portionsLabel;
    itemModalPortions.hidden = !portionsLabel;
  }
  itemModalDesc.textContent = details.description || "";
  itemModalComposition.textContent = details.composition;

  if (details.type === "boutique") {
    itemModalLabelComposition.textContent = "Détails";
    itemModalBlockAllergens.classList.add("item-modal__block--hidden");
    itemModalBlockCare.classList.remove("item-modal__block--hidden");
    itemModalCare.textContent = details.care || "";
    itemModalVariants?.classList.remove("item-modal__block--hidden");
    syncVariantButtons(id);
    renderModalThumbs(details.images);
    setModalImage(getModalImageIndexForVariant(id, selectedVariants[id] || "clair"), details.images);
  } else {
    itemModalVariants?.classList.add("item-modal__block--hidden");
    itemModalLabelComposition.textContent = "Composition";
    itemModalBlockAllergens.classList.remove("item-modal__block--hidden");
    itemModalBlockCare.classList.add("item-modal__block--hidden");
    itemModalAllergens.textContent = details.allergens || "Non renseigné.";
    itemModalImage.classList.remove("is-fading");
    itemModalImage.src = details.images[0].src;
    itemModalImage.alt = details.images[0].label
      ? `${getCatalogName(id)} — ${details.images[0].label}`
      : getCatalogName(id);
    renderModalThumbs(details.images);
  }

  syncModalQuantity();

  itemModal.classList.add("is-open");
  itemModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  itemModal.querySelector(".item-modal__close")?.focus();
}

function closeItemModal() {
  if (!itemModal) return;

  activeModalId = null;
  itemModal.classList.remove("is-open");
  itemModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  itemModalThumbs.innerHTML = "";

  if (lastFocusedElement instanceof HTMLElement) {
    lastFocusedElement.focus();
  }
}

itemModalCloseBtns?.forEach((btn) => {
  btn.addEventListener("click", closeItemModal);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && itemModal?.classList.contains("is-open")) {
    closeItemModal();
  }
});

itemModalMinus?.addEventListener("click", () => {
  if (!activeModalId) return;
  changeQuantity(activeModalId, -1);
});

itemModalPlus?.addEventListener("click", () => {
  if (!activeModalId) return;
  changeQuantity(activeModalId, 1);
});

itemModalVariantBtns?.forEach((button) => {
  button.addEventListener("click", () => {
    if (!activeModalId) return;
    setVariant(activeModalId, button.dataset.variant);
  });
});

/* --- Panier & WhatsApp --------------------------------------------------- */

const cartBar = document.getElementById("cart-bar");
const cartCountEl = document.getElementById("cart-count");
const cartTotalEl = document.getElementById("cart-total");
const whatsappBtn = document.getElementById("cart-whatsapp");
const cartForm = document.getElementById("cart-form");
const cartCustomerName = document.getElementById("cart-customer-name");
const cartCustomerPhone = document.getElementById("cart-customer-phone");
const cartCreneau = document.getElementById("cart-creneau");
const cartComment = document.getElementById("cart-comment");
const cartFormHint = document.getElementById("cart-form-hint");
const cartFormToggle = document.getElementById("cart-form-toggle");
const cartItemsList = document.getElementById("cart-items-list");
let isCartFormOpen = false;
let showCheckoutError = false;

function setCartFormOpen(open) {
  isCartFormOpen = Boolean(open);

  cartBar?.classList.toggle("is-form-open", isCartFormOpen);
  document.body.classList.toggle("is-cart-expanded", isCartFormOpen);

  if (cartFormToggle) {
    cartFormToggle.setAttribute("aria-expanded", String(isCartFormOpen));
    cartFormToggle.setAttribute(
      "aria-label",
      isCartFormOpen ? "Masquer le panier et mes informations" : "Afficher le panier et mes informations"
    );
  }
}

function showCheckoutMessage(message) {
  if (!cartFormHint) return;

  cartFormHint.textContent = message;
  cartFormHint.hidden = false;
  cartFormHint.classList.remove("is-visible");
  void cartFormHint.offsetWidth;
  cartFormHint.classList.add("is-visible");
}

function clearCheckoutMessage() {
  if (!cartFormHint) return;

  cartFormHint.textContent = "";
  cartFormHint.hidden = true;
  cartFormHint.classList.remove("is-visible");
}

function initCartState() {
  dishes = document.querySelectorAll(".dish");

  Object.keys(quantities).forEach((key) => delete quantities[key]);
  Object.keys(selectedVariants).forEach((key) => delete selectedVariants[key]);

  dishes.forEach((dish) => {
    const id = dish.dataset.id;
    quantities[id] = 0;
    if (isBoutiqueItem(id)) {
      selectedVariants[id] = "clair";
    }
  });
}

function initBoutiqueVariants() {
  dishes.forEach((dish) => {
    const id = dish.dataset.id;
    if (!isBoutiqueItem(id)) return;

    const variantsEl = document.createElement("div");
    variantsEl.className = "dish__variants";
    variantsEl.setAttribute("role", "group");
    variantsEl.setAttribute("aria-label", `Couleur ${getCatalogName(id)}`);
    variantsEl.innerHTML = `
      <span class="dish__variants-label">Couleur</span>
      <div class="variant-picker">
        <button type="button" class="variant-btn is-active" data-variant="clair" aria-pressed="true">Clair</button>
        <button type="button" class="variant-btn" data-variant="sombre" aria-pressed="false">Sombre</button>
      </div>
    `;

    dish.querySelector(".dish__footer")?.before(variantsEl);

    variantsEl.querySelectorAll(".variant-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        setVariant(id, button.dataset.variant);
      });
    });
  });
}

function bindDishInteractions() {
  dishes.forEach((dish) => {
    const id = dish.dataset.id;
    const image = dish.querySelector(".dish__image");
    const title = dish.querySelector(".dish__title");

    image?.setAttribute("tabindex", "0");
    title?.setAttribute("tabindex", "0");

    dish.querySelector(".qty-btn--plus").addEventListener("click", (event) => {
      event.stopPropagation();
      changeQuantity(id, 1);
    });

    dish.querySelector(".qty-btn--minus").addEventListener("click", (event) => {
      event.stopPropagation();
      changeQuantity(id, -1);
    });

    dish.addEventListener("click", (event) => {
      if (event.target.closest(".dish__footer, .dish__variants")) return;
      openItemModal(id);
    });

    title?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openItemModal(id);
      }
    });

    image?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openItemModal(id);
      }
    });
  });
}

function getItemImageSrc(id) {
  const entry = getCatalogEntry(id);
  if (!entry) return "";

  if (isBoutiqueItem(id)) {
    const variant = selectedVariants[id] || "clair";
    return entry.variantPreviews?.[variant] || entry.images?.[0]?.src || "";
  }

  return entry.images?.[0]?.src || "";
}

function getCartSummary() {
  let totalItems = 0;
  let totalPrix = 0;
  const lines = [];

  dishes.forEach((dish) => {
    const id = dish.dataset.id;
    const qty = quantities[id];

    if (qty > 0) {
      const price = getCatalogPrice(id);
      if (price === null) return;

      const name = getItemDisplayName(id);
      const subtotal = price * qty;

      totalItems += qty;
      totalPrix += subtotal;
      lines.push({
        id,
        name,
        qty,
        price,
        subtotal,
        image: getItemImageSrc(id),
      });
    }
  });

  return { totalItems, totalPrix, lines };
}

function renderCartItems() {
  if (!cartItemsList) return;

  const { lines, totalItems } = getCartSummary();

  if (totalItems === 0) {
    cartItemsList.innerHTML = "";
    return;
  }

  cartItemsList.innerHTML = lines
    .map(
      (line) => `
        <li class="cart-item" data-id="${escapeHtml(line.id)}">
          ${
            line.image
              ? `<img class="cart-item__image" src="${escapeHtml(line.image)}" alt="" width="56" height="56" loading="lazy">`
              : `<span class="cart-item__image cart-item__image--placeholder" aria-hidden="true"></span>`
          }
          <div class="cart-item__info">
            <p class="cart-item__name">${escapeHtml(line.name)}</p>
            <p class="cart-item__meta">${formatPrice(line.price)} / unité · ${formatPrice(line.subtotal)}</p>
          </div>
          <div class="cart-item__qty dish__qty" role="group" aria-label="Quantité ${escapeHtml(line.name)}">
            <button type="button" class="qty-btn qty-btn--minus" data-cart-qty="${escapeHtml(line.id)}" aria-label="Diminuer la quantité">−</button>
            <span class="qty-value" aria-live="polite">${line.qty}</span>
            <button type="button" class="qty-btn qty-btn--plus" data-cart-qty="${escapeHtml(line.id)}" aria-label="Augmenter la quantité">+</button>
          </div>
        </li>
      `
    )
    .join("");
}

function updateUI() {
  const { totalItems, totalPrix } = getCartSummary();

  cartCountEl.textContent = totalItems;
  cartTotalEl.textContent = formatPrice(totalPrix);

  const hasItems = totalItems > 0;

  cartBar.classList.toggle("is-visible", hasItems);
  cartBar.setAttribute("aria-hidden", String(!hasItems));
  document.body.classList.toggle("has-cart", hasItems);

  if (!hasItems) {
    setCartFormOpen(false);
    showCheckoutError = false;
    clearCheckoutMessage();
  }

  dishes.forEach((dish) => {
    const id = dish.dataset.id;
    const minusBtn = dish.querySelector(".qty-btn--minus");
    dish.querySelector(".qty-value").textContent = quantities[id];
    minusBtn.disabled = quantities[id] === 0;
  });

  syncModalQuantity();
  renderCartItems();
  updateCheckoutState();
}

function normalizePhone(value) {
  return String(value).replace(/\D/g, "");
}

function getSemaineLabel() {
  const semaine = menuData?.meta?.semaine;
  if (!semaine) return "Semaine en cours";

  const weekMatch = String(semaine).match(/W(\d+)/i);
  if (weekMatch) return `Semaine ${weekMatch[1]}`;

  return sanitizeCreneauLabel(String(semaine));
}

function getRetraitAdresse() {
  return menuData?.meta?.commandes?.retrait?.adresse || "49 Route de Chandieu, Toussieu";
}

function populateCreneauxSelect() {
  if (!cartCreneau) return;

  const creneaux = menuData?.meta?.commandes?.retrait?.creneaux || [];
  cartCreneau.innerHTML = '<option value="">Choisir un créneau…</option>';

  creneaux
    .filter((creneau) => creneau.actif !== false)
    .forEach((creneau) => {
      const option = document.createElement("option");
      option.value = creneau.id;
      option.textContent = creneau.label;
      cartCreneau.appendChild(option);
    });
}

function getCheckoutFormData() {
  const rawCreneauId = cartCreneau?.value || "";
  const creneau = getCreneauFromSource(rawCreneauId);
  const name = sanitizeCustomerName(cartCustomerName?.value || "");
  const phone = sanitizePhoneDisplay(cartCustomerPhone?.value || "");

  return {
    name,
    phone,
    phoneNormalized: normalizePhone(phone),
    creneauId: creneau?.id || "",
    creneauLabel: creneau ? sanitizeCreneauLabel(creneau.label) : "",
    comment: sanitizeComment(cartComment?.value || ""),
  };
}

function isCheckoutValid() {
  const { totalItems } = getCartSummary();
  const { name, phoneNormalized, creneauId } = getCheckoutFormData();

  return (
    totalItems > 0 &&
    name.length >= 2 &&
    phoneNormalized.length >= 10 &&
    creneauId !== "" &&
    getCreneauFromSource(creneauId) != null
  );
}

function getCheckoutErrorMessage() {
  const { totalItems } = getCartSummary();
  const { name, phoneNormalized, creneauId } = getCheckoutFormData();

  if (totalItems === 0) {
    return "Votre panier est vide — ajoutez un plat, on s'occupe du reste ! 🍽️";
  }
  if (name.length < 2) {
    return "Hop hop ! Dites-nous comment vous appeler — Marlou a hâte de préparer vos bons plats ! 😊";
  }
  if (phoneNormalized.length < 10) {
    return "Il nous manque juste votre numéro — comme ça, Marlou pourra vous confirmer la commande ! 📱";
  }
  if (!creneauId) {
    return "Choisissez votre créneau de retrait, on vous garde une place bien au chaud ! ✨";
  }
  return "";
}

function updateCheckoutState() {
  if (!whatsappBtn) return;

  const { totalItems } = getCartSummary();
  whatsappBtn.disabled = totalItems === 0;

  if (isCheckoutValid()) {
    showCheckoutError = false;
    clearCheckoutMessage();
    return;
  }

  if (showCheckoutError) {
    showCheckoutMessage(getCheckoutErrorMessage());
  }
}

function initCheckoutForm() {
  populateCreneauxSelect();
  setCartFormOpen(false);

  cartFormToggle?.addEventListener("click", () => {
    setCartFormOpen(!isCartFormOpen);
  });

  cartItemsList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-cart-qty]");
    if (!button) return;

    const id = button.dataset.cartQty;
    changeQuantity(id, button.classList.contains("qty-btn--plus") ? 1 : -1);
  });

  const fields = [cartCustomerName, cartCustomerPhone, cartCreneau, cartComment];
  fields.forEach((field) => {
    field?.addEventListener("input", updateCheckoutState);
    field?.addEventListener("change", updateCheckoutState);
  });

  cartForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    whatsappBtn?.click();
  });

  updateCheckoutState();
}

function changeQuantity(id, delta) {
  quantities[id] = Math.max(0, quantities[id] + delta);
  updateUI();
}

function buildWhatsAppMessage() {
  const { totalItems, totalPrix, lines } = getCartSummary();
  const { name, phone, phoneNormalized, creneauLabel, comment } = getCheckoutFormData();
  const phoneForMessage = phone || phoneNormalized;

  let message = "Bonjour Marlou ! 👋\n\n";
  message += `Commande — ${getSemaineLabel()}\n\n`;
  message += `👤 ${name} — ${phoneForMessage}\n`;
  message += `📅 Retrait : ${creneauLabel}\n`;
  message += `📍 ${sanitizeCreneauLabel(getRetraitAdresse())}\n\n`;

  lines.forEach(({ name: itemName, qty, price, subtotal }) => {
    message += `• ${itemName} × ${qty} — ${formatPrice(subtotal)}\n`;
    message += `  (${formatPrice(price)} / unité)\n`;
  });

  message += `\nTotal : ${totalItems} article(s) — ${formatPrice(totalPrix)}`;

  if (comment) {
    message += `\n\nCommentaire : ${comment}`;
  }

  return message;
}

whatsappBtn.addEventListener("click", () => {
  if (!WHATSAPP_NUMBER) {
    alert("Numéro WhatsApp non configuré. Renseignez WHATSAPP_NUMBER dans script.js.");
    return;
  }

  if (!isCheckoutValid()) {
    showCheckoutError = true;
    setCartFormOpen(true);
    showCheckoutMessage(getCheckoutErrorMessage());
    cartForm?.reportValidity?.();

    if (cartCustomerName && !cartCustomerName.value.trim()) {
      cartCustomerName.focus();
    } else if (cartCustomerPhone && normalizePhone(cartCustomerPhone.value).length < 10) {
      cartCustomerPhone.focus();
    } else if (cartCreneau && !cartCreneau.value) {
      cartCreneau.focus();
    }

    return;
  }

  const message = encodeURIComponent(buildWhatsAppMessage());
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
  window.open(url, "_blank", "noopener,noreferrer");
});

function showLoadError(message) {
  const menuGrid = document.getElementById("menu-grid");
  const boutiqueGrid = document.getElementById("boutique-grid");
  const errorHtml = `<p class="section__intro" role="alert">${escapeHtml(message)}</p>`;

  if (menuGrid) menuGrid.innerHTML = errorHtml;
  if (boutiqueGrid) boutiqueGrid.innerHTML = errorHtml;
}

async function initApp() {
  initMobileNav();

  try {
    await loadData();
    buildProductCatalog();
    applySectionMeta();
    renderMenuGrid();
    renderBoutiqueGrid();
    initCartState();
    initBoutiqueVariants();
    bindDishInteractions();
    initCheckoutForm();
    updateUI();
  } catch (error) {
    console.error(error);
    showLoadError(
      "Impossible de charger la carte. Vérifiez que le site est bien servi via un serveur local."
    );
  }
}

initApp();
