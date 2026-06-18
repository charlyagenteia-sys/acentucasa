const loginLayoutEl = document.getElementById("login-layout");
const appLayoutEl = document.getElementById("app-layout");
const loginFormEl = document.getElementById("login-form");
const loginStatusEl = document.getElementById("login-status");
const authBarEl = document.getElementById("auth-bar");
const currentUserLabelEl = document.getElementById("current-user-label");
const logoutBtnEl = document.getElementById("logout-btn");

const form = document.getElementById("reservation-form");
const formStatus = document.getElementById("form-status");
const reservationsEl = document.getElementById("reservations");
const itemRowsEl = document.getElementById("item-rows");
const categoryGridEl = document.getElementById("category-grid");
const categoryProductsViewEl = document.getElementById("category-products-view");
const categoryProductsTitleEl = document.getElementById("category-products-title");
const categoryProductsEl = document.getElementById("category-products");
const catalogStandaloneNavEl = document.getElementById("catalog-standalone-nav");
const catalogCurrentCategoryEl = document.getElementById("catalog-current-category");
const catalogSectionTitleEl = document.getElementById("catalog-section-title");
const catalogSectionSubtitleEl = document.getElementById("catalog-section-subtitle");
const backToCategoriesBtnEl = document.getElementById("back-to-categories-btn");
const catalogSaveBtnEl = document.getElementById("catalog-save-btn");
const productDetailEl = document.getElementById("product-detail");
const closeProductDetailBtnEl = document.getElementById("close-product-detail-btn");
const calendarGridEl = document.getElementById("calendar-grid");
const calendarWeekdaysEl = document.getElementById("calendar-weekdays");
const monthLabelEl = document.getElementById("month-label");
const prevMonthBtn = document.getElementById("prev-month");
const nextMonthBtn = document.getElementById("next-month");
const reservationDetailEl = document.getElementById("reservation-detail");
const formTitleEl = document.getElementById("reservation-form-title");
const formSubmitBtn = document.getElementById("reservation-submit-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const addInventoryBtnEl = document.getElementById("add-inventory-btn");
const inventoryModalEl = document.getElementById("inventory-modal");
const inventoryModalTitleEl = document.getElementById("inventory-modal-title");
const inventoryModalSubtitleEl = document.getElementById("inventory-modal-subtitle");
const inventoryModalCloseEl = document.getElementById("inventory-modal-close");
const inventoryForm = document.getElementById("inventory-form");
const inventorySaveBtn = document.getElementById("inventory-save-btn");
const inventoryFormStatus = document.getElementById("inventory-form-status");
const inventoryCancelBtn = document.getElementById("inventory-cancel-btn");
const inventoryWarehouseSelectEl = document.getElementById("inventory-warehouse-select");
const inventoryCategorySelectEl = document.getElementById("inventory-category-select");
const inventoryAuthorizationOwnerSelectEl = document.getElementById("inventory-authorization-owner-select");
const inventoryCushionFieldsetEl = document.getElementById("inventory-cushion-fieldset");
const inventoryImageDropzoneEl = document.getElementById("inventory-image-dropzone");
const inventoryImagePreviewEl = document.getElementById("inventory-image-preview");
const inventoryImageInputEl = document.getElementById("inventory-image-input");
const inventoryImageBrowseEl = document.getElementById("inventory-image-browse");
const inventoryImageClearEl = document.getElementById("inventory-image-clear");
const printOrderSheetEl = document.getElementById("print-order-sheet");
const eventDateInputEl = document.getElementById("event-date-input");
const eventLocationSelectEl = document.getElementById("event-location-select");
const banqueteroSelectEl = document.getElementById("banquetero-select");

const todayISO = new Date().toISOString().slice(0, 10);

let currentUser = null;
let items = [];
let reservations = [];
let warehouses = [];
let currentMonth = todayISO.slice(0, 7);
let selectedReservationId = null;
let editingReservationId = null;
let editingInventoryId = null;
let inventoryMode = "edit";
let inventoryPendingImageFile = null;
let editingInventoryImageUrl = "";
let activeCategory = "";
let activeProductId = "";
let activeProductStockDate = todayISO;
const catalogStandaloneMode = new URLSearchParams(window.location.search).get("standalone") === "1";
const CATALOG_DRAFT_STORAGE_KEY = "catalog_quantity_draft_v1";
const catalogQuantityByItemId = new Map();
const catalogAvailabilityByItemId = new Map();
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const ACTIVE_STOCK_STATUSES = new Set(["pending", "confirmed", "delivered"]);
const INVENTORY_CATEGORIES = ["Sillas", "Platos", "Lounge", "Manteleria", "Bares", "Plaqué", "Carpa India"];
const INVENTORY_CATEGORY_LABELS = new Map(INVENTORY_CATEGORIES.map((category) => [category.toLowerCase(), category]));
const INVENTORY_CATEGORY_ALIASES = new Map([
  ["fuentes", "Plaqué"],
  ["bandejas", "Plaqué"],
  ["plaque", "Plaqué"],
  ["carpa india", "Carpa India"],
  ["carpa-india", "Carpa India"]
]);
const AUTHORIZATION_OWNER_OPTIONS = [
  { value: "", label: "Sin usuario" },
  { value: "jpi", label: "Juan Pablo" },
  { value: "amelita", label: "Amelita" },
  { value: "sraame", label: "Señora Amelia" },
  { value: "nancy", label: "Nancy" },
  { value: "kathy", label: "Kathy" },
  { value: "lula", label: "Lula" },
  { value: "jeisson", label: "Jeisson" }
];
const AUTHORIZATION_OWNER_LABELS = new Map(AUTHORIZATION_OWNER_OPTIONS.map((option) => [option.value, option.label]));
const WAREHOUSE_AUTHORIZATION_RULES = new Map([
  ["jp", { required: true, ownerUsername: "jpi" }],
  ["amelita", { required: true, ownerUsername: "amelita" }],
  ["mama", { required: true, ownerUsername: "sraame" }]
]);
const CUSHION_OPTIONS = new Map([
  ["none", "No usa"],
  ["white", "Blanco"],
  ["black", "Negro"]
]);
const AUTHORIZATION_STATUS_LABELS = new Map([
  ["not_required", "No requiere"],
  ["pending", "Pendiente"],
  ["confirmed", "Confirmado"]
]);
const EVENT_LOCATION_OPTIONS = new Map([
  ["noviciado", "Noviciado"],
  ["casa-amelia", "Casa Amelia"],
  ["alto-san-fco", "Alto San Fco"],
  ["entremuros", "Entremuros"],
  ["vina-santa-rita", "Viña Santa Rita"],
  ["reina-sur", "Reina Sur"],
  ["hacienda-porvenir", "Hacienda Porvenir"],
  ["otro", "Otro"]
]);
const BANQUETERO_OPTIONS = new Map([
  ["juan-pablo", "Juan Pablo"],
  ["amelita", "Amelita"],
  ["senora-amelia", "Señora Amelia"]
]);

function fmtCLP(value) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isActiveForStock(status) {
  return ACTIVE_STOCK_STATUSES.has(status);
}

function getWarehouseById(warehouseId) {
  return warehouses.find((warehouse) => warehouse.id === warehouseId) || null;
}

function getWarehouseLabel(warehouseId) {
  const warehouse = getWarehouseById(warehouseId);
  return warehouse ? `${warehouse.name} · ${warehouse.location}` : "Sin bodega";
}

function normalizeInventoryCategory(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  const normalized = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return INVENTORY_CATEGORY_LABELS.get(normalized) || INVENTORY_CATEGORY_ALIASES.get(normalized) || "";
}

function getEventLocationLabel(eventLocation) {
  return EVENT_LOCATION_OPTIONS.get(String(eventLocation || "")) || "Sin definir";
}

function getBanqueteroLabel(banquetero) {
  return BANQUETERO_OPTIONS.get(String(banquetero || "")) || "Sin definir";
}

function canEditReservation(reservation) {
  if (!currentUser || !reservation) {
    return false;
  }
  if (currentUser.role === "admin") {
    return true;
  }
  return reservation.createdBy === currentUser.username;
}

function getCatalogQuantityInput(itemId) {
  if (itemRowsEl) {
    const legacyInput = itemRowsEl.querySelector(`input[name="qty_${CSS.escape(itemId)}"]`);
    if (legacyInput) {
      return legacyInput;
    }
  }
  return categoryProductsEl ? categoryProductsEl.querySelector(`input[name="qty_${CSS.escape(itemId)}"]`) : null;
}

function setCatalogQuantity(itemId, quantity) {
  const parsed = Number.parseInt(String(quantity || "0"), 10);
  const finalQuantity = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  if (finalQuantity > 0) {
    catalogQuantityByItemId.set(itemId, finalQuantity);
  } else {
    catalogQuantityByItemId.delete(itemId);
  }
  persistCatalogDraft();
}

function clearCatalogQuantities() {
  catalogQuantityByItemId.clear();
  persistCatalogDraft();
}

function hydrateCatalogQuantitiesFromReservation(reservationItems = []) {
  clearCatalogQuantities();
  for (const entry of reservationItems) {
    const quantity = Number(entry.quantity) || 0;
    if (quantity > 0) {
      catalogQuantityByItemId.set(entry.itemId, quantity);
    }
  }
  persistCatalogDraft();
}

function loadCatalogDraft() {
  if (typeof window.localStorage === "undefined") {
    return;
  }

  try {
    const raw = window.localStorage.getItem(CATALOG_DRAFT_STORAGE_KEY);
    if (!raw) {
      return;
    }
    const payload = JSON.parse(raw);
    clearCatalogQuantities();
    if (!payload || typeof payload !== "object") {
      return;
    }
    for (const [itemId, quantity] of Object.entries(payload)) {
      const parsed = Number.parseInt(String(quantity || "0"), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        catalogQuantityByItemId.set(itemId, parsed);
      }
    }
    persistCatalogDraft();
  } catch (_error) {
    // Ignore malformed drafts.
  }
}

function persistCatalogDraft() {
  if (typeof window.localStorage === "undefined") {
    return;
  }

  try {
    const payload = Object.fromEntries(catalogQuantityByItemId.entries());
    if (Object.keys(payload).length === 0) {
      window.localStorage.removeItem(CATALOG_DRAFT_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(CATALOG_DRAFT_STORAGE_KEY, JSON.stringify(payload));
  } catch (_error) {
    // Ignore storage failures.
  }
}

function getCatalogAvailabilityDate() {
  const value = eventDateInputEl ? String(eventDateInputEl.value || "").trim() : "";
  return value || todayISO;
}

async function loadCatalogAvailability(dateISO = getCatalogAvailabilityDate()) {
  if (!items.length) {
    catalogAvailabilityByItemId.clear();
    return;
  }

  try {
    const payload = await api(`/api/items?startDate=${encodeURIComponent(dateISO)}&endDate=${encodeURIComponent(dateISO)}`, {
      allowUnauthorizedResponse: true
    });
    if (!Array.isArray(payload)) {
      return;
    }
    catalogAvailabilityByItemId.clear();
    for (const item of payload) {
      catalogAvailabilityByItemId.set(item.id, {
        reservedInRange: Number(item.reservedInRange || 0),
        availableInRange: Number(item.availableInRange ?? item.stockTotal ?? 0)
      });
    }
  } catch (_error) {
    // If the refresh fails, keep the last visible stock instead of dropping to zero or forcing a logout.
  }
}

function refreshCatalogAvailabilityView() {
  void loadCatalogAvailability().then(() => {
    if (activeCategory) {
      renderCategoryProducts();
    }
  });
}

function saveCatalogDraftAndClose() {
  persistCatalogDraft();
  returnToCatalogHome();
}

function returnToCatalogHome() {
  const homeUrl = window.location.pathname;

  if (catalogStandaloneMode && window.opener && !window.opener.closed) {
    try {
      window.opener.focus();
    } catch (_error) {
      // No-op.
    }
    try {
      window.close();
    } catch (_error) {
      // No-op.
    }
    if (!window.closed) {
      window.location.assign(homeUrl);
    }
    return;
  }

  try {
    window.history.pushState({}, "", homeUrl);
  } catch (_error) {
    // No-op.
  }
  void applyCatalogRouteFromLocation();
}

function getApprovalLabel(approvalStatus) {
  if (approvalStatus === "approved") return "Aprobada";
  if (approvalStatus === "rejected") return "Rechazada";
  if (approvalStatus === "pending") return "Pendiente";
  return "No requiere";
}

function updateWarehouseAlert() {
  return;
}

function renderInventoryWarehouseSelect() {
  const selectedValue = inventoryWarehouseSelectEl.value || "";
  inventoryWarehouseSelectEl.innerHTML = [
    '<option value="" disabled>Selecciona una bodega</option>',
    ...warehouses.map(
      (warehouse) =>
        `<option value="${warehouse.id}">${warehouse.name} · ${warehouse.location}</option>`
    )
  ].join("");
  inventoryWarehouseSelectEl.value = warehouses.some((warehouse) => warehouse.id === selectedValue) ? selectedValue : "";
}

function setInventoryPreview(imageUrl, label = "") {
  editingInventoryImageUrl = imageUrl || "";
  if (!imageUrl) {
    inventoryImagePreviewEl.classList.add("empty");
    inventoryImagePreviewEl.innerHTML = "<span>Sin foto cargada</span>";
    return;
  }

  inventoryImagePreviewEl.classList.remove("empty");
  inventoryImagePreviewEl.innerHTML = `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(label || "Imagen de producto")}" />`;
}

function setInventoryCushionOption(value = "none") {
  const normalizedValue = CUSHION_OPTIONS.has(value) ? value : "none";
  inventoryForm.querySelectorAll('input[name="cushionOption"]').forEach((input) => {
    input.checked = input.value === normalizedValue;
  });
}

function syncInventoryCushionState() {
  if (!inventoryCushionFieldsetEl) {
    return;
  }
  const category = normalizeInventoryCategory(inventoryCategorySelectEl ? inventoryCategorySelectEl.value : "");
  const showCushion = category === "Sillas";
  inventoryCushionFieldsetEl.classList.toggle("hidden", !showCushion);
  inventoryCushionFieldsetEl.disabled = !showCushion;
  if (!showCushion) {
    setInventoryCushionOption("none");
  }
}

function setInventoryAuthorizationRequired(required) {
  const checkbox = inventoryForm.elements.authorizationRequired;
  if (checkbox) {
    checkbox.checked = Boolean(required);
  }
}

function setInventoryAuthorizationStatus(value = "pending") {
  if (inventoryForm.elements.authorizationStatus) {
    inventoryForm.elements.authorizationStatus.value = ["pending", "confirmed", "not_required"].includes(value)
      ? value
      : "pending";
  }
}

function getInventoryCushionOption() {
  if (normalizeInventoryCategory(inventoryCategorySelectEl ? inventoryCategorySelectEl.value : "") !== "Sillas") {
    return "none";
  }
  const selected = inventoryForm.querySelector('input[name="cushionOption"]:checked');
  return selected ? selected.value : "none";
}

function getCushionLabel(value) {
  return CUSHION_OPTIONS.get(value) || "No usa";
}

function getCategoryLabel(value) {
  return normalizeInventoryCategory(value) || value || "Sin categoría";
}

function getAuthorizationStatusLabel(value) {
  return AUTHORIZATION_STATUS_LABELS.get(String(value || "").trim()) || "No requiere";
}

function getAuthorizationOwnerLabel(username) {
  return AUTHORIZATION_OWNER_LABELS.get(String(username || "").trim().toLowerCase()) || "Sin usuario";
}

function getWarehouseAuthorizationState(warehouseId, currentStatus = "pending") {
  const normalizedWarehouseId = String(warehouseId || "").trim().toLowerCase();
  const rule = WAREHOUSE_AUTHORIZATION_RULES.get(normalizedWarehouseId) || null;
  if (!rule) {
    return {
      authorizationRequired: false,
      authorizationOwnerUsername: "",
      authorizationStatus: "not_required"
    };
  }

  const normalizedStatus = String(currentStatus || "").trim().toLowerCase();
  return {
    authorizationRequired: true,
    authorizationOwnerUsername: rule.ownerUsername,
    authorizationStatus: ["pending", "confirmed"].includes(normalizedStatus) ? normalizedStatus : "pending"
  };
}

function canAuthorizeItem(item) {
  if (!currentUser || !item || !item.authorizationRequired) {
    return false;
  }
  if (currentUser.role === "admin") {
    return true;
  }
  const ownerUsername = String(item.authorizationOwnerUsername || "").trim().toLowerCase();
  return ownerUsername && currentUser.username === ownerUsername;
}

function renderInventoryCategorySelect(selectedValue = "") {
  if (!inventoryCategorySelectEl) {
    return;
  }

  const normalizedSelected = normalizeInventoryCategory(selectedValue);
  inventoryCategorySelectEl.innerHTML = [
    '<option value="" disabled>Selecciona una categoría</option>',
    ...INVENTORY_CATEGORIES.map((category) => `<option value="${category}">${category}</option>`)
  ].join("");
  inventoryCategorySelectEl.value = normalizedSelected && INVENTORY_CATEGORIES.includes(normalizedSelected)
    ? normalizedSelected
    : "";
  syncInventoryCushionState();
}

function renderAuthorizationOwnerSelect(selectedValue = "") {
  if (!inventoryAuthorizationOwnerSelectEl) {
    return;
  }

  const normalizedSelected = String(selectedValue || "").trim().toLowerCase();
  inventoryAuthorizationOwnerSelectEl.innerHTML = AUTHORIZATION_OWNER_OPTIONS.map(
    (option) => `<option value="${option.value}">${option.label}</option>`
  ).join("");
  inventoryAuthorizationOwnerSelectEl.value = AUTHORIZATION_OWNER_OPTIONS.some((option) => option.value === normalizedSelected)
    ? normalizedSelected
    : "";
}

function syncInventoryAuthorizationState({ warehouseId = inventoryWarehouseSelectEl ? inventoryWarehouseSelectEl.value : "", authorizationStatus = null } = {}) {
  const state = getWarehouseAuthorizationState(
    warehouseId,
    authorizationStatus !== null
      ? authorizationStatus
      : (inventoryForm.elements.authorizationStatus ? inventoryForm.elements.authorizationStatus.value : "pending")
  );

  setInventoryAuthorizationRequired(state.authorizationRequired);
  if (inventoryAuthorizationOwnerSelectEl) {
    inventoryAuthorizationOwnerSelectEl.value = state.authorizationOwnerUsername;
  }
  if (inventoryForm.elements.authorizationOwnerUsername) {
    inventoryForm.elements.authorizationOwnerUsername.value = state.authorizationOwnerUsername;
  }
  setInventoryAuthorizationStatus(state.authorizationStatus);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });
}

function clearInventoryDraftImage() {
  inventoryPendingImageFile = null;
  inventoryImageInputEl.value = "";
}

function openImagePicker() {
  inventoryImageInputEl.value = "";
  inventoryImageInputEl.click();
}

async function uploadInventoryImage(file, { reload = true } = {}) {
  if (!editingInventoryId) {
    return;
  }
  if (!file) {
    return;
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecciona una imagen válida");
  }

  inventoryFormStatus.textContent = "Subiendo foto...";
  inventoryFormStatus.classList.remove("error");
  const dataUrl = await fileToDataUrl(file);
  const payload = await api(`/api/items/${editingInventoryId}/image`, {
    method: "POST",
    body: JSON.stringify({
      dataUrl,
      filename: file.name
    })
  });

  setInventoryPreview(payload.imageUrl, file.name);
  inventoryForm.elements.imageRef.value = payload.imageRef || "";
  inventoryFormStatus.textContent = "Foto cargada.";
  if (reload) {
    await loadInitialData();
  }
  return payload;
}

async function handleInventoryImageFile(file) {
  if (!file) {
    return;
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecciona una imagen válida");
  }

  if (inventoryMode === "create" && !editingInventoryId) {
    inventoryPendingImageFile = file;
    const preview = await fileToDataUrl(file);
    setInventoryPreview(preview, file.name);
    inventoryForm.elements.imageRef.value = "";
    inventoryFormStatus.textContent = "Foto lista para guardar.";
    inventoryFormStatus.classList.remove("error");
    return;
  }

  await uploadInventoryImage(file);
}

function overlapsDate(reservation, dateISO) {
  return reservation.startDate <= dateISO && reservation.endDate >= dateISO;
}

function setEditMode(reservation) {
  if (!reservation) {
    editingReservationId = null;
    formTitleEl.textContent = "Nueva reserva";
    formSubmitBtn.textContent = "Guardar reserva";
    cancelEditBtn.classList.add("hidden");
    return;
  }

  editingReservationId = reservation.id;
  formTitleEl.textContent = "Editar reserva";
  formSubmitBtn.textContent = "Guardar cambios";
  cancelEditBtn.classList.remove("hidden");
}

function setInventoryModalOpen(isOpen) {
  inventoryModalEl.classList.toggle("hidden", !isOpen);
  inventoryModalEl.setAttribute("aria-hidden", isOpen ? "false" : "true");
  document.body.classList.toggle("modal-open", isOpen);
}

function resetInventoryForm() {
  editingInventoryId = null;
  inventoryMode = "edit";
  clearInventoryDraftImage();
  editingInventoryImageUrl = "";
  inventoryForm.reset();
  inventoryFormStatus.textContent = "";
  inventoryFormStatus.classList.remove("error");
  inventoryModalTitleEl.textContent = "Editar inventario";
  inventoryModalSubtitleEl.textContent = "";
  inventorySaveBtn.textContent = "Guardar cambios";
  setInventoryCushionOption("none");
  inventoryImageDropzoneEl.classList.remove("drag-over");
  setInventoryPreview("", "");
  renderInventoryWarehouseSelect();
  renderInventoryCategorySelect();
  renderAuthorizationOwnerSelect();
  syncInventoryCushionState();
  syncInventoryAuthorizationState({ warehouseId: "", authorizationStatus: "pending" });
  setInventoryModalOpen(false);
}

function fillInventoryForm(item) {
  inventoryMode = "edit";
  clearInventoryDraftImage();
  editingInventoryId = item.id;
  inventoryModalTitleEl.textContent = "Editar inventario";
  inventoryModalSubtitleEl.textContent = `${item.name} ${item.size} · La autorización se define por la bodega.`;
  inventorySaveBtn.textContent = "Guardar cambios";
  inventoryForm.elements.id.value = item.id;
  inventoryForm.elements.name.value = item.name || "";
  renderInventoryCategorySelect(item.category || "");
  if (inventoryCategorySelectEl) {
    inventoryCategorySelectEl.value = normalizeInventoryCategory(item.category || "");
  }
  syncInventoryCushionState();
  inventoryForm.elements.size.value = item.size || "";
  inventoryForm.elements.stockTotal.value = String(item.stockTotal ?? 0);
  inventoryForm.elements.unitPriceCLP.value = String(item.unitPriceCLP ?? 0);
  inventoryForm.elements.warehouseId.value = item.warehouseId || "";
  inventoryForm.elements.properties.value = Array.isArray(item.properties) ? item.properties.join("\n") : "";
  inventoryForm.elements.imageRef.value = item.imageRef || "";
  setInventoryCushionOption(item.cushionOption || "none");
  renderAuthorizationOwnerSelect(item.authorizationOwnerUsername || "");
  inventoryFormStatus.textContent = "";
  inventoryFormStatus.classList.remove("error");
  setInventoryPreview(item.imageUrl || item.imageRef || "", `${item.name} ${item.size}`);
  syncInventoryAuthorizationState({
    warehouseId: item.warehouseId || "",
    authorizationStatus: item.authorizationStatus || "pending"
  });
  setInventoryModalOpen(true);
}

function openNewInventoryEditor() {
  if (!currentUser || currentUser.role !== "admin") {
    return;
  }

  inventoryMode = "create";
  clearInventoryDraftImage();
  editingInventoryId = null;
  inventoryForm.reset();
  inventoryModalTitleEl.textContent = "Agregar producto";
  inventoryModalSubtitleEl.textContent = "Completa los datos del nuevo producto. La autorización se calcula sola según la bodega.";
  inventorySaveBtn.textContent = "Crear producto";
  inventoryForm.elements.id.value = "";
  inventoryForm.elements.name.value = "";
  renderInventoryCategorySelect("");
  syncInventoryCushionState();
  inventoryForm.elements.size.value = "";
  inventoryForm.elements.stockTotal.value = "0";
  inventoryForm.elements.unitPriceCLP.value = "0";
  inventoryForm.elements.warehouseId.value = "";
  inventoryForm.elements.properties.value = "";
  inventoryForm.elements.imageRef.value = "";
  setInventoryCushionOption("none");
  renderAuthorizationOwnerSelect("");
  inventoryFormStatus.textContent = "";
  inventoryFormStatus.classList.remove("error");
  renderInventoryWarehouseSelect();
  setInventoryPreview("", "");
  syncInventoryAuthorizationState({ warehouseId: "", authorizationStatus: "pending" });
  setInventoryModalOpen(true);
}

function openInventoryEditor(itemId) {
  if (!currentUser || currentUser.role !== "admin") {
    return;
  }
  const item = items.find((entry) => entry.id === itemId);
  if (!item) {
    return;
  }
  fillInventoryForm(item);
}

function closeInventoryEditor(message = "") {
  resetInventoryForm();
  if (message) {
    inventoryFormStatus.textContent = message;
    inventoryFormStatus.classList.remove("error");
  }
}

function fillFormFromReservation(reservation) {
  form.elements.customerName.value = reservation.customerName || "";
  form.elements.startDate.value = reservation.startDate || "";
  form.elements.endDate.value = reservation.endDate || reservation.startDate || "";
  form.elements.status.value = reservation.status || "confirmed";
  form.elements.warehouseId.value = reservation.warehouseId || "";
  if (eventDateInputEl) {
    eventDateInputEl.value = reservation.startDate || "";
  }
  if (eventLocationSelectEl) {
    eventLocationSelectEl.value = reservation.eventLocation || "";
  }
  if (banqueteroSelectEl) {
    banqueteroSelectEl.value = reservation.banquetero || "";
  }
  form.elements.notes.value = reservation.notes || "";
  hydrateCatalogQuantitiesFromReservation(reservation.items || []);
  refreshCatalogAvailabilityView();
}

function resetFormForCreateMode(options = {}) {
  const { clearCatalog = false } = options;
  form.reset();
  form.elements.startDate.value = "";
  form.elements.endDate.value = "";
  form.elements.status.value = "confirmed";
  form.elements.warehouseId.value = "";
  if (eventDateInputEl) {
    eventDateInputEl.value = todayISO;
  }
  if (eventLocationSelectEl) {
    eventLocationSelectEl.value = "";
  }
  if (banqueteroSelectEl) {
    banqueteroSelectEl.value = "";
  }
  if (clearCatalog) {
    clearCatalogQuantities();
  }
  renderItemRows();
  setEditMode(null);
  updateWarehouseAlert();
  if (activeCategory) {
    refreshCatalogAvailabilityView();
  }
}

function clearAppData() {
  items = [];
  reservations = [];
  warehouses = [];
  clearCatalogQuantities();
  activeCategory = "";
  activeProductId = "";
  activeProductStockDate = todayISO;
  selectedReservationId = null;
  editingReservationId = null;
  reservationsEl.innerHTML = "";
  calendarGridEl.innerHTML = "";
  calendarWeekdaysEl.innerHTML = "";
  reservationDetailEl.innerHTML = "<p>Toca una reserva para abrir su detalle.</p>";
  if (itemRowsEl) {
    itemRowsEl.innerHTML = "";
  }
  if (categoryGridEl) {
    categoryGridEl.innerHTML = "";
  }
  if (categoryProductsEl) {
    categoryProductsEl.innerHTML = "";
  }
  if (categoryProductsTitleEl) {
    categoryProductsTitleEl.textContent = "";
  }
  if (productDetailEl) {
    productDetailEl.innerHTML = "";
  }
  formStatus.textContent = "";
  resetInventoryForm();
}

function setAuthBar() {
  if (!currentUser) {
    authBarEl.classList.add("hidden");
    currentUserLabelEl.textContent = "";
    if (addInventoryBtnEl) {
      addInventoryBtnEl.classList.add("hidden");
    }
    return;
  }

  currentUserLabelEl.textContent = `Sesión: ${currentUser.displayName} (${currentUser.role})`;
  authBarEl.classList.remove("hidden");
  if (addInventoryBtnEl) {
    addInventoryBtnEl.classList.toggle("hidden", currentUser.role !== "admin");
  }
}

function showLogin(message = "") {
  currentUser = null;
  setAuthBar();
  clearAppData();
  appLayoutEl.classList.add("hidden");
  loginLayoutEl.classList.remove("hidden");
  loginStatusEl.textContent = message;
  loginStatusEl.classList.toggle("error", Boolean(message));
}

function showApp() {
  loginLayoutEl.classList.add("hidden");
  appLayoutEl.classList.remove("hidden");
  loginStatusEl.textContent = "";
  loginStatusEl.classList.remove("error");
  document.body.classList.toggle("catalog-standalone", catalogStandaloneMode);
  setAuthBar();
  setInventoryModalOpen(false);
}

function handleUnauthorized() {
  showLogin("Sesión expirada. Vuelve a iniciar sesión.");
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...options
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401 && !options.allowUnauthorizedResponse) {
      handleUnauthorized();
    }
    throw new Error(payload.error || "Error inesperado");
  }

  return response.json();
}

function renderWarehouseSelect() {
  return;
}

function renderItemRows() {
  if (!itemRowsEl) {
    return;
  }

  itemRowsEl.innerHTML = "";
  for (const item of items) {
    const row = document.createElement("label");
    row.className = "item-row";
    row.innerHTML = `
      <span>${escapeHtml(item.name)} ${escapeHtml(item.size)} <small>(stock ${escapeHtml(item.stockTotal)})</small></span>
      <input type="number" name="qty_${escapeHtml(item.id)}" min="0" step="1" value="0" />
      <span class="warehouse-chip">${escapeHtml(getWarehouseLabel(item.warehouseId))}</span>
    `;
    itemRowsEl.appendChild(row);
  }
}

function getCategoryIconLabel(category) {
  const normalized = normalizeInventoryCategory(category);
  if (normalized === "Sillas") return "SI";
  if (normalized === "Platos") return "PL";
  if (normalized === "Lounge") return "LO";
  if (normalized === "Manteleria") return "MA";
  if (normalized === "Bares") return "BA";
  if (normalized === "Plaqué") return "PQ";
  if (normalized === "Carpa India") return "CI";
  return "??";
}

function getCategoryIconSlug(category) {
  const normalized = normalizeInventoryCategory(category);
  if (normalized === "Plaqué") return "plaque";
  if (normalized === "Carpa India") return "carpa-india";
  return normalized.toLowerCase();
}

function getCategoryItems(category) {
  const normalized = normalizeInventoryCategory(category);
  return items.filter((item) => normalizeInventoryCategory(item.category) === normalized);
}

function getCategorySummary(category) {
  const categoryItems = getCategoryItems(category);
  const productCount = categoryItems.length;
  const stockTotal = categoryItems.reduce((sum, item) => sum + Number(item.stockTotal || 0), 0);
  return { productCount, stockTotal };
}

function buildCatalogProductUrl(item) {
  const url = new URL(window.location.href);
  url.search = "";
  const category = normalizeInventoryCategory(item.category);
  if (category) {
    url.searchParams.set("category", category);
  }
  url.searchParams.set("product", item.id);
  return url.toString();
}

function buildCatalogCategoryUrl(category, options = {}) {
  const url = new URL(window.location.href);
  url.search = "";
  const normalizedCategory = normalizeInventoryCategory(category);
  if (normalizedCategory) {
    url.searchParams.set("category", normalizedCategory);
  }
  if (options.standalone) {
    url.searchParams.set("standalone", "1");
  }
  return url.toString();
}

function navigateToCatalogCategory(category, { standalone = catalogStandaloneMode } = {}) {
  const url = new URL(window.location.href);
  url.search = "";
  const normalizedCategory = normalizeInventoryCategory(category);
  if (normalizedCategory) {
    url.searchParams.set("category", normalizedCategory);
  }
  if (standalone) {
    url.searchParams.set("standalone", "1");
  }
  try {
    window.history.pushState({}, "", url);
  } catch (_error) {
    // No-op.
  }
  void applyCatalogRouteFromLocation();
}

function renderStandaloneCategoryNav() {
  if (!catalogCurrentCategoryEl) {
    return;
  }

  const active = normalizeInventoryCategory(activeCategory);
  const chips = INVENTORY_CATEGORIES.map((category) => {
    const { productCount, stockTotal } = getCategorySummary(category);
    const selected = category === active;
    return `
      <button type="button" class="catalog-category-chip ${selected ? "selected" : ""}" data-category="${escapeHtml(category)}" aria-pressed="${selected ? "true" : "false"}">
        <span class="catalog-chip-icon category-${escapeHtml(getCategoryIconSlug(category))}">${escapeHtml(getCategoryIconLabel(category))}</span>
        <span class="catalog-chip-copy">
          <strong>${escapeHtml(category)}</strong>
          <span>${productCount} productos · stock ${stockTotal}</span>
        </span>
      </button>
    `;
  }).join("");
  const homeButton = `
    <button type="button" class="secondary catalog-tab-button catalog-home-button" data-action="home">
      Home
    </button>
  `;

  catalogCurrentCategoryEl.innerHTML = `${chips}${homeButton}`;
  catalogCurrentCategoryEl.querySelectorAll(".catalog-category-chip").forEach((button) => {
    button.addEventListener("click", () => {
      const category = button.getAttribute("data-category");
      if (!category) {
        return;
      }
      navigateToCatalogCategory(category, { standalone: true });
    });
  });
  const homeButtonEl = catalogCurrentCategoryEl.querySelector('[data-action="home"]');
  if (homeButtonEl) {
    homeButtonEl.addEventListener("click", () => {
      returnToCatalogHome();
    });
  }
}

function setCatalogVisibility({ categoryVisible = true, productsVisible = false, detailVisible = false } = {}) {
  if (categoryGridEl) {
    categoryGridEl.classList.toggle("hidden", !categoryVisible);
  }
  if (categoryProductsViewEl) {
    categoryProductsViewEl.classList.toggle("hidden", !productsVisible);
  }
  if (productDetailEl) {
    productDetailEl.classList.toggle("hidden", !detailVisible);
  }
  if (catalogStandaloneNavEl) {
    catalogStandaloneNavEl.classList.toggle("hidden", !catalogStandaloneMode);
  }
  if (catalogCurrentCategoryEl) {
    catalogCurrentCategoryEl.classList.toggle("hidden", !catalogStandaloneMode);
    if (catalogStandaloneMode) {
      renderStandaloneCategoryNav();
    }
  }
  if (backToCategoriesBtnEl) {
    backToCategoriesBtnEl.classList.toggle("hidden", catalogStandaloneMode || (!productsVisible && !detailVisible));
    backToCategoriesBtnEl.textContent = catalogStandaloneMode ? "Home" : "Volver al menú principal";
  }
  if (catalogSaveBtnEl) {
    const shouldShowCatalogAction = productsVisible && Boolean(normalizeInventoryCategory(activeCategory));
    catalogSaveBtnEl.classList.toggle("hidden", !shouldShowCatalogAction);
    catalogSaveBtnEl.textContent = catalogStandaloneMode ? "Abrir categoría" : "Guardar y cerrar";
  }
  if (closeProductDetailBtnEl) {
    closeProductDetailBtnEl.classList.toggle("hidden", !detailVisible);
  }
}

function renderHomeCatalog() {
  if (!categoryGridEl) {
    return;
  }

  const cards = INVENTORY_CATEGORIES.map((category) => {
    const categoryItems = getCategoryItems(category);
    const productCount = categoryItems.length;
    const stockTotal = categoryItems.reduce((sum, item) => sum + Number(item.stockTotal || 0), 0);
    return `
      <button type="button" class="category-card home-category-card" data-category="${escapeHtml(category)}">
        <span class="category-icon category-${escapeHtml(getCategoryIconSlug(category))}">${escapeHtml(getCategoryIconLabel(category))}</span>
        <span class="category-copy">
          <strong>${escapeHtml(category)}</strong>
          <span>${productCount} productos · stock ${stockTotal}</span>
        </span>
        <span class="card-cta">Abrir categoría</span>
      </button>
    `;
  }).join("");

  categoryGridEl.innerHTML = cards;
  categoryGridEl.querySelectorAll(".home-category-card").forEach((button) => {
    button.addEventListener("click", () => {
      const category = button.getAttribute("data-category");
      const categoryUrl = buildCatalogCategoryUrl(category, { standalone: true });
      const opened = window.open(categoryUrl, "_blank");
      if (!opened) {
        window.location.assign(categoryUrl);
      }
    });
  });
}

function renderCategoryProducts() {
  if (!categoryProductsEl || !categoryProductsTitleEl) {
    return;
  }

  const category = normalizeInventoryCategory(activeCategory);
  const categoryItems = getCategoryItems(category);
  const { productCount, stockTotal } = getCategorySummary(category);

  if (catalogSectionTitleEl) {
    catalogSectionTitleEl.textContent = catalogStandaloneMode && category ? category : "Catálogo por categorías";
  }
  if (catalogSectionSubtitleEl) {
    catalogSectionSubtitleEl.textContent = catalogStandaloneMode && category
      ? `${productCount} productos · stock ${stockTotal}`
      : "Abre una categoría para ver sus productos, ingresa cantidades por producto y guarda la reserva desde el bloque superior.";
  }
  categoryProductsTitleEl.textContent = "";

  if (categoryItems.length === 0) {
    categoryProductsEl.innerHTML = "<p>No hay productos en esta categoría.</p>";
    return;
  }

  categoryProductsEl.innerHTML = categoryItems
    .map((item) => {
      const availability = catalogAvailabilityByItemId.get(item.id) || {};
      const reservedInRange = Number(availability.reservedInRange || 0);
      return `
        <article class="product-card">
          <a
            class="product-card-link"
            href="${escapeHtml(buildCatalogProductUrl(item))}"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div class="thumb">
              ${
                item.imageUrl
                  ? `<img src="${item.imageUrl}" alt="${item.name} ${item.size}" loading="lazy" />`
                  : `<div class="thumb-fallback">Sin imagen disponible</div>`
              }
            </div>
            <div class="card-body">
              <strong>${escapeHtml(item.name)}</strong>
              <div class="card-meta">
                <div>${escapeHtml(item.size)}</div>
                <div>${escapeHtml(getWarehouseLabel(item.warehouseId))}</div>
                <div class="card-stock-meta">
                  <span>Stock total</span>
                  <strong>${escapeHtml(item.stockTotal)}</strong>
                </div>
                <div class="card-stock-meta">
                  <span>Reservado</span>
                  <strong>${escapeHtml(reservedInRange)}</strong>
                </div>
                <div class="card-cta">Abrir ficha en pestaña nueva</div>
              </div>
            </div>
          </a>
          <div class="product-card-footer">
            <label class="product-qty-label">
              Cantidad
              <input
                type="number"
                class="product-qty-input"
                data-item-id="${escapeHtml(item.id)}"
                name="qty_${escapeHtml(item.id)}"
                min="0"
                max="${escapeHtml(item.stockTotal)}"
                step="1"
                value="${escapeHtml(catalogQuantityByItemId.get(item.id) || 0)}"
              />
            </label>
          </div>
        </article>
      `;
    })
    .join("");

  categoryProductsEl.querySelectorAll(".product-qty-input").forEach((input) => {
    input.addEventListener("input", (event) => {
      const itemId = event.currentTarget.getAttribute("data-item-id");
      if (!itemId) {
        return;
      }
      setCatalogQuantity(itemId, event.currentTarget.value);
    });
  });
}

function renderProductDetail() {
  if (!productDetailEl) {
    return;
  }

  const item = items.find((entry) => entry.id === activeProductId);
  if (!item) {
    productDetailEl.innerHTML = "";
    return;
  }

  const isChair = normalizeInventoryCategory(item.category) === "Sillas";
  productDetailEl.innerHTML = `
    <div class="product-detail-layout">
      <div class="product-detail-summary">
        <div class="thumb product-detail-thumb">
          ${
            item.imageUrl
              ? `<img src="${item.imageUrl}" alt="${item.name} ${item.size}" loading="lazy" />`
              : `<div class="thumb-fallback">Sin imagen disponible</div>`
          }
        </div>
        <div class="product-detail-meta">
          <h3>${escapeHtml(item.name)}</h3>
          <p>${escapeHtml(item.size)}</p>
          <p><strong>Categoría:</strong> ${escapeHtml(getCategoryLabel(item.category))}</p>
          <p><strong>Bodega:</strong> ${escapeHtml(item.warehouseName || getWarehouseLabel(item.warehouseId))}</p>
          <p><strong>Stock total:</strong> ${escapeHtml(item.stockTotal)}</p>
          <p><strong>Valor unitario:</strong> ${fmtCLP(item.unitPriceCLP)}</p>
          <p><strong>Propiedades:</strong> ${escapeHtml((item.properties || []).join(", ") || "-")}</p>
          ${isChair ? `<p><strong>Cojín:</strong> ${escapeHtml(getCushionLabel(item.cushionOption))}</p>` : ""}
          ${
            currentUser && currentUser.role === "admin"
              ? `<button type="button" class="secondary edit-product-btn">Editar inventario</button>`
              : ""
          }
        </div>
      </div>
      <div class="product-stock-panel">
        <div class="stock-controls">
          <label>Fecha
            <input id="product-stock-date" type="date" value="${escapeHtml(activeProductStockDate)}" />
          </label>
        </div>
        <div id="product-stock-table"></div>
      </div>
    </div>
  `;

  const dateInput = productDetailEl.querySelector("#product-stock-date");
  if (dateInput) {
    dateInput.addEventListener("change", async (event) => {
      activeProductStockDate = event.target.value || todayISO;
      await loadProductStock();
    });
  }

  const editBtn = productDetailEl.querySelector(".edit-product-btn");
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      openInventoryEditor(item.id);
    });
  }
}

async function loadProductStock() {
  const product = items.find((entry) => entry.id === activeProductId);
  const tableEl = productDetailEl ? productDetailEl.querySelector("#product-stock-table") : null;
  if (!product || !tableEl) {
    return;
  }

  const date = activeProductStockDate || todayISO;
  const stock = await api(`/api/stock?date=${date}`);
  const stockRow = stock.find((entry) => entry.itemId === product.id);
  const rows = stockRow
    ? `<tr>
         <td>${escapeHtml(product.name)} ${escapeHtml(product.size)}</td>
         <td>${escapeHtml(stockRow.stockTotal)}</td>
         <td>${escapeHtml(stockRow.reserved)}</td>
         <td>${escapeHtml(stockRow.available)}</td>
       </tr>`
    : `<tr><td colspan="4">Sin datos para esta fecha.</td></tr>`;

  tableEl.innerHTML = `<table class="table">
    <thead><tr><th>Producto</th><th>Total</th><th>Reservado</th><th>Disponible</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function openCategory(category) {
  activeCategory = normalizeInventoryCategory(category);
  activeProductId = "";
  activeProductStockDate = todayISO;
  renderCategoryProducts();
  setCatalogVisibility({ categoryVisible: false, productsVisible: true, detailVisible: false });
}

async function openProduct(itemId) {
  if (!itemId) {
    return;
  }
  activeProductId = itemId;
  activeProductStockDate = todayISO;
  const item = items.find((entry) => entry.id === itemId);
  if (!item) {
    return;
  }
  if (!activeCategory) {
    activeCategory = normalizeInventoryCategory(item.category);
    renderCategoryProducts();
  }
  renderProductDetail();
  setCatalogVisibility({ categoryVisible: false, productsVisible: true, detailVisible: true });
  await loadProductStock();
}

function closeProductDetail() {
  activeProductId = "";
  activeProductStockDate = todayISO;
  renderProductDetail();
  setCatalogVisibility({ categoryVisible: false, productsVisible: true, detailVisible: false });
}

async function applyCatalogRouteFromLocation() {
  const params = new URLSearchParams(window.location.search);
  const productId = String(params.get("product") || "").trim();
  const category = normalizeInventoryCategory(params.get("category"));

  if (!category && !productId) {
    activeCategory = "";
    activeProductId = "";
    if (catalogSectionTitleEl) {
      catalogSectionTitleEl.textContent = "Catálogo por categorías";
    }
    if (catalogSectionSubtitleEl) {
      catalogSectionSubtitleEl.textContent = "Abre una categoría para ver sus productos, ingresa cantidades por producto y guarda la reserva desde el bloque superior.";
    }
    renderHomeCatalog();
    setCatalogVisibility({ categoryVisible: true, productsVisible: false, detailVisible: false });
    return;
  }

  if (category) {
    openCategory(category);
  }

  if (productId) {
    await openProduct(productId);
  }
}

function isPrintSheetOpen() {
  return !printOrderSheetEl.classList.contains("hidden");
}

function closeReservationSheet() {
  printOrderSheetEl.classList.add("hidden");
  printOrderSheetEl.setAttribute("aria-hidden", "true");
  printOrderSheetEl.innerHTML = "";
  document.body.classList.remove("modal-open");
}

function openReservationSheet(reservation) {
  if (!reservation) {
    return;
  }
  buildReservationPrintSheet(reservation);
  printOrderSheetEl.classList.remove("hidden");
  printOrderSheetEl.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  requestAnimationFrame(() => {
    const closeBtn = printOrderSheetEl.querySelector(".print-modal-close");
    if (closeBtn) {
      closeBtn.focus({ preventScroll: true });
    }
  });
}

async function loadReservations() {
  reservations = await api("/api/reservations");
  if (selectedReservationId && !reservations.some((r) => r.id === selectedReservationId)) {
    selectedReservationId = null;
  }

  if (reservations.length === 0) {
    reservationsEl.innerHTML = "<p>No hay reservas aún.</p>";
    renderReservationDetail();
    await loadCatalogAvailability();
    if (activeCategory) {
      renderCategoryProducts();
    }
    return;
  }

  const rows = reservations
    .map((r) => {
      const itemLines = r.items
        .map((it) => {
          const item = items.find((x) => x.id === it.itemId);
          const authLabel = it.authorizationRequired
            ? getAuthorizationStatusLabel(it.authorizationStatus)
            : "No requiere";
          return `${item ? item.name : it.itemId} x${it.quantity} (${authLabel})`;
        })
        .join("; ");

      return `<tr class="reservation-row ${selectedReservationId === r.id ? "selected" : ""}" data-res-id="${r.id}">
        <td>${r.customerName}</td>
        <td>${r.startDate} a ${r.endDate}</td>
        <td>${getWarehouseLabel(r.warehouseId)}</td>
        <td><span class="approval-pill ${r.approvalStatus || "not_required"}">${getApprovalLabel(r.approvalStatus)}</span></td>
        <td>${itemLines}</td>
        <td>${fmtCLP(r.totalCLP)}</td>
        <td>
          <select data-res-id="${r.id}" class="status-select" ${canEditReservation(r) ? "" : "disabled"}>
            ${["pending", "confirmed", "delivered", "returned", "cancelled"]
              .map((s) => `<option value="${s}" ${s === r.status ? "selected" : ""}>${s}</option>`)
              .join("")}
          </select>
        </td>
      </tr>`;
    })
    .join("");

  reservationsEl.innerHTML = `<table class="table">
    <thead><tr><th>Cliente</th><th>Fechas</th><th>Bodega</th><th>Aprobación</th><th>Ítems</th><th>Total</th><th>Estado</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;

  const tbodyEl = reservationsEl.querySelector("tbody");
  tbodyEl.addEventListener("click", (event) => {
    if (event.target.closest(".status-select")) {
      return;
    }
    const row = event.target.closest(".reservation-row");
    if (!row) {
      return;
    }
    openReservation(row.getAttribute("data-res-id"));
  });

  reservationsEl.querySelectorAll(".status-select").forEach((el) => {
    el.addEventListener("change", async (event) => {
      const reservationId = event.target.getAttribute("data-res-id");
      const status = event.target.value;
      await api(`/api/reservations/${reservationId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      await Promise.all([loadReservations(), loadCalendar()]);
      if (activeProductId) {
        await loadProductStock();
      }
      renderReservationDetail();
    });
  });

  renderReservationDetail();
  await loadCatalogAvailability();
  if (activeCategory) {
    renderCategoryProducts();
  }
}

async function loadCalendar() {
  const payload = await api(`/api/calendar?month=${currentMonth}`);
  const [year, month] = currentMonth.split("-").map(Number);
  const firstDayUTC = new Date(Date.UTC(year, month - 1, 1));
  const monthDate = new Date(Date.UTC(year, month - 1, 2));
  const firstDayMondayBased = (firstDayUTC.getUTCDay() + 6) % 7;

  monthLabelEl.textContent = monthDate.toLocaleDateString("es-CL", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  });

  calendarWeekdaysEl.innerHTML = WEEKDAYS.map((name) => `<div class="weekday">${name}</div>`).join("");

  const leadingEmpty = Array.from({ length: firstDayMondayBased }, () => ({
    outside: true,
    dateLabel: "",
    reservationCount: "",
    reservedUnits: ""
  }));

  const monthDays = payload.days.map((d) => ({
    outside: false,
    dateISO: d.date,
    dateLabel: d.date.slice(8),
    reservationCount: d.reservationCount,
    reservedUnits: d.reservedUnits
  }));

  const calendarCells = [...leadingEmpty, ...monthDays];
  const trailingCount = (7 - (calendarCells.length % 7)) % 7;
  for (let i = 0; i < trailingCount; i += 1) {
    calendarCells.push({
      outside: true,
      dateISO: "",
      dateLabel: "",
      reservationCount: "",
      reservedUnits: ""
    });
  }

  calendarGridEl.innerHTML = calendarCells
    .map((d) => {
      const dayReservations = d.outside
        ? []
        : reservations.filter((r) => isActiveForStock(r.status) && overlapsDate(r, d.dateISO));
      const chips = dayReservations
        .slice(0, 2)
        .map(
          (r) =>
            `<button type="button" class="calendar-res-chip ${
              selectedReservationId === r.id ? "selected" : ""
            }" data-res-id="${r.id}" title="${escapeHtml(r.customerName)}">${escapeHtml(r.customerName)}</button>`
        )
        .join("");
      const extra = dayReservations.length > 2 ? `<div class="calendar-more">+${dayReservations.length - 2} más</div>` : "";

      return `<article class="day ${d.outside ? "outside" : ""}">
        <div class="date">${d.dateLabel}</div>
        <div>Reservas: ${d.reservationCount}</div>
        <div>Unid. ocupadas: ${d.reservedUnits}</div>
        <div class="calendar-day-reservations">${chips}${extra}</div>
      </article>`;
    })
    .join("");

  calendarGridEl.querySelectorAll(".calendar-res-chip").forEach((el) => {
    el.addEventListener("click", (event) => {
      const reservationId = event.currentTarget.getAttribute("data-res-id");
      openReservation(reservationId, { scrollToDetail: true });
    });
  });
}

function renderReservationDetail() {
  if (!selectedReservationId) {
    reservationDetailEl.innerHTML = "<p>Toca una reserva para abrir su detalle.</p>";
    return;
  }

  const reservation = reservations.find((r) => r.id === selectedReservationId);
  if (!reservation) {
    reservationDetailEl.innerHTML = "<p>La reserva seleccionada ya no existe.</p>";
    selectedReservationId = null;
    return;
  }

  const itemLines = reservation.items
    .map((it) => {
      const item = items.find((x) => x.id === it.itemId);
      if (!item) {
        const fallbackStatus = getAuthorizationStatusLabel(it.authorizationStatus || "not_required");
        return `<li>
          <div class="reservation-item-line">
            <span>${escapeHtml(it.itemId)} x${it.quantity}</span>
            <span class="approval-pill ${escapeHtml(it.authorizationStatus || "not_required")}">${escapeHtml(fallbackStatus)}</span>
          </div>
        </li>`;
      }
      const status = it.authorizationRequired ? it.authorizationStatus || "pending" : "not_required";
      const statusLabel = getAuthorizationStatusLabel(status);
      const ownerLabel = it.authorizationRequired ? getAuthorizationOwnerLabel(it.authorizationOwnerUsername) : "";
      return `<li>
        <div class="reservation-item-line">
          <span>${escapeHtml(item.name)} ${escapeHtml(item.size)} x${it.quantity}</span>
          <span class="approval-pill ${escapeHtml(status)}">${escapeHtml(statusLabel)}</span>
        </div>
        <div class="reservation-item-meta">
          <span>${escapeHtml(getWarehouseLabel(item.warehouseId))}</span>
          ${it.authorizationRequired ? `<span>Autoriza: ${escapeHtml(ownerLabel)}</span>` : ""}
        </div>
        ${
          it.authorizationRequired && canAuthorizeItem(it)
            ? `<div class="reservation-item-actions">
                 <button type="button" class="secondary item-auth-btn" data-res-id="${escapeHtml(reservation.id)}" data-item-id="${escapeHtml(it.itemId)}" data-auth-status="confirmed">Confirmar</button>
                 <button type="button" class="secondary item-auth-btn" data-res-id="${escapeHtml(reservation.id)}" data-item-id="${escapeHtml(it.itemId)}" data-auth-status="pending">Dejar pendiente</button>
               </div>`
            : ""
        }
      </li>`;
    })
    .join("");

  reservationDetailEl.innerHTML = `
    <h3>Reserva abierta</h3>
    <div class="detail-actions">
      ${
        canEditReservation(reservation)
          ? `<button type="button" class="secondary detail-edit-btn" data-res-id="${escapeHtml(reservation.id)}">Editar reserva</button>`
          : ""
      }
      <button type="button" class="secondary detail-print-btn" data-res-id="${escapeHtml(reservation.id)}">Imprimir pedido</button>
      ${
        currentUser && currentUser.role === "admin" && reservation.approvalStatus === "pending"
          ? `<button type="button" class="secondary detail-approve-btn" data-res-id="${escapeHtml(reservation.id)}">Aprobar</button>
             <button type="button" class="secondary detail-reject-btn" data-res-id="${escapeHtml(reservation.id)}">Rechazar</button>`
          : ""
      }
    </div>
    <div class="reservation-detail-grid">
      <p><strong>Cliente:</strong> ${escapeHtml(reservation.customerName)}</p>
      <p><strong>Fechas:</strong> ${reservation.startDate} a ${reservation.endDate}</p>
      <p><strong>Lugar del evento:</strong> ${escapeHtml(getEventLocationLabel(reservation.eventLocation))}</p>
      <p><strong>Banquetero a cargo:</strong> ${escapeHtml(getBanqueteroLabel(reservation.banquetero))}</p>
      <p><strong>Creada por:</strong> ${escapeHtml(reservation.createdByDisplayName || reservation.createdBy || "Sistema")}</p>
      <p><strong>Estado:</strong> ${escapeHtml(reservation.status)}</p>
      <p><strong>Bodega:</strong> ${escapeHtml(getWarehouseLabel(reservation.warehouseId))}</p>
      <p><strong>Aprobación:</strong> <span class="approval-pill ${escapeHtml(reservation.approvalStatus || "not_required")}">${escapeHtml(getApprovalLabel(reservation.approvalStatus))}</span></p>
      <p><strong>Total:</strong> ${fmtCLP(reservation.totalCLP)}</p>
      <p><strong>ID:</strong> ${escapeHtml(reservation.id)}</p>
    </div>
    <div class="reservation-detail-items">
      <strong>Ítems</strong>
      <ul>${itemLines}</ul>
    </div>
    <p class="reservation-notes"><strong>Motivo aprobación:</strong> ${escapeHtml(reservation.approvalReason || "No requiere")}</p>
    <p class="reservation-notes"><strong>Notas:</strong> ${escapeHtml(reservation.notes || "-")}</p>
  `;

  const editBtn = reservationDetailEl.querySelector(".detail-edit-btn");
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      setEditMode(reservation);
      fillFormFromReservation(reservation);
      if (formTitleEl) {
        formTitleEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      formStatus.textContent = "Editando reserva abierta.";
      formStatus.classList.remove("error");
    });
  }

  const printBtn = reservationDetailEl.querySelector(".detail-print-btn");
  printBtn.addEventListener("click", () => {
    openReservationSheet(reservation);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
      });
    });
  });

  const approveBtn = reservationDetailEl.querySelector(".detail-approve-btn");
  if (approveBtn) {
    approveBtn.addEventListener("click", async () => {
      await api(`/api/reservations/${reservation.id}/approval`, {
        method: "PATCH",
        body: JSON.stringify({ approvalStatus: "approved" })
      });
      await Promise.all([loadReservations(), loadCalendar()]);
      renderReservationDetail();
    });
  }

  const rejectBtn = reservationDetailEl.querySelector(".detail-reject-btn");
  if (rejectBtn) {
    rejectBtn.addEventListener("click", async () => {
      await api(`/api/reservations/${reservation.id}/approval`, {
        method: "PATCH",
        body: JSON.stringify({ approvalStatus: "rejected" })
      });
      await Promise.all([loadReservations(), loadCalendar()]);
      renderReservationDetail();
    });
  }

  reservationDetailEl.querySelectorAll(".item-auth-btn").forEach((button) => {
    button.addEventListener("click", async (event) => {
      const resId = event.currentTarget.getAttribute("data-res-id");
      const itemId = event.currentTarget.getAttribute("data-item-id");
      const authorizationStatus = event.currentTarget.getAttribute("data-auth-status");
      await api(`/api/reservations/${resId}/items/${itemId}/authorization`, {
        method: "PATCH",
        body: JSON.stringify({ authorizationStatus })
      });
      await loadReservations();
      renderReservationDetail();
    });
  });
}

function openReservation(reservationId, options = {}) {
  if (!reservationId) {
    return;
  }
  selectedReservationId = reservationId;
  renderReservationDetail();

  reservationsEl.querySelectorAll(".reservation-row").forEach((row) => {
    row.classList.toggle("selected", row.getAttribute("data-res-id") === reservationId);
  });
  calendarGridEl.querySelectorAll(".calendar-res-chip").forEach((chip) => {
    chip.classList.toggle("selected", chip.getAttribute("data-res-id") === reservationId);
  });

  if (options.scrollToDetail) {
    requestAnimationFrame(() => {
      reservationDetailEl.scrollIntoView({ behavior: "smooth", block: "start" });
      const printBtn = reservationDetailEl.querySelector(".detail-print-btn");
      if (printBtn) {
        printBtn.focus({ preventScroll: true });
      }
    });
  }
}

function getCatalogQuantities() {
  return items
    .map((item) => {
      const input = getCatalogQuantityInput(item.id);
      const quantity = Number(input ? input.value : catalogQuantityByItemId.get(item.id) || 0) || 0;
      setCatalogQuantity(item.id, quantity);
      return {
        itemId: item.id,
        quantity
      };
    })
    .filter((entry) => entry.quantity > 0);
}

function monthShift(current, delta) {
  const [yy, mm] = current.split("-").map(Number);
  const date = new Date(Date.UTC(yy, mm - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}

function buildReservationPrintSheet(reservation) {
  const itemLines = reservation.items
    .map((it) => {
      const item = items.find((x) => x.id === it.itemId);
      const label = item ? `${item.name} ${item.size}` : it.itemId;
      const status = it.authorizationRequired ? it.authorizationStatus || "pending" : "not_required";
      return `<li><span>${escapeHtml(label)}</span><span>x${it.quantity} · ${escapeHtml(getAuthorizationStatusLabel(status))}</span></li>`;
    })
    .join("");
  const clientName = escapeHtml(reservation.customerName || "Sin nombre");
  const preparedBy = escapeHtml(currentUser ? currentUser.displayName : "Sistema");

  printOrderSheetEl.innerHTML = `
    <div class="modal-backdrop" data-close-print-modal="true"></div>
    <section class="modal-card print-sheet-card" role="dialog" aria-modal="true" aria-labelledby="print-sheet-title">
      <div class="modal-header print-sheet-header">
        <div>
          <p class="print-kicker">Pedido para revisión</p>
          <h2 id="print-sheet-title">Vista tipo PDF</h2>
          <p class="modal-subtitle">Puedes cerrar esta lámina cuando termines de verla.</p>
        </div>
        <div class="print-sheet-actions">
          <button type="button" class="secondary print-sheet-print-btn">Imprimir</button>
          <button type="button" class="secondary print-modal-close">Cerrar</button>
        </div>
      </div>
      <section class="print-order-page">
        <header class="print-order-header">
          <div class="print-brand">
            <div class="print-logo" aria-hidden="true">
              <span>AC</span>
            </div>
            <div>
              <p class="print-kicker">Pedido para impresión</p>
              <h1>AC Mobiliario</h1>
              <p class="print-muted">Detalle de reserva y pedido asociado</p>
            </div>
          </div>
          <div class="print-meta">
            <span>ID ${escapeHtml(reservation.id)}</span>
            <span>${escapeHtml(new Date().toLocaleString("es-CL"))}</span>
          </div>
        </header>
        <section class="print-client">
          <div class="print-client-label">Cliente</div>
          <div class="print-client-name">${clientName}</div>
        </section>
        <section class="print-summary">
          <div><strong>Fechas:</strong> ${escapeHtml(reservation.startDate)} a ${escapeHtml(reservation.endDate)}</div>
          <div><strong>Lugar del evento:</strong> ${escapeHtml(getEventLocationLabel(reservation.eventLocation))}</div>
          <div><strong>Banquetero a cargo:</strong> ${escapeHtml(getBanqueteroLabel(reservation.banquetero))}</div>
          <div><strong>Creada por:</strong> ${escapeHtml(reservation.createdByDisplayName || reservation.createdBy || "Sistema")}</div>
          <div><strong>Estado:</strong> ${escapeHtml(reservation.status)}</div>
          <div><strong>Bodega:</strong> ${escapeHtml(getWarehouseLabel(reservation.warehouseId))}</div>
          <div><strong>Aprobación:</strong> ${escapeHtml(getApprovalLabel(reservation.approvalStatus))}</div>
        </section>
        <section class="print-items">
          <h2>Ítems</h2>
          <ul>${itemLines}</ul>
        </section>
        <section class="print-footer">
          <div><strong>Total:</strong> ${escapeHtml(fmtCLP(reservation.totalCLP))}</div>
          <div><strong>Notas:</strong> ${escapeHtml(reservation.notes || "-")}</div>
          <div><strong>Motivo aprobación:</strong> ${escapeHtml(reservation.approvalReason || "No requiere")}</div>
        </section>
        <section class="print-signatures">
          <div class="print-signature-block">
            <span class="print-signature-title">Firma de despacho</span>
            <div class="print-signature-line"></div>
            <span class="print-signature-caption">Preparado por ${preparedBy}</span>
          </div>
          <div class="print-signature-block">
            <span class="print-signature-title">Firma de recepción</span>
            <div class="print-signature-line"></div>
            <span class="print-signature-caption">Recibe cliente</span>
          </div>
        </section>
      </section>
    </section>
  `;

  const closeBtn = printOrderSheetEl.querySelector(".print-modal-close");
  const printBtn = printOrderSheetEl.querySelector(".print-sheet-print-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", closeReservationSheet);
  }
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      window.print();
    });
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formStatus.textContent = "Guardando...";
  formStatus.classList.remove("error");

  const data = new FormData(form);
  const selectedItems = getCatalogQuantities();
  const eventDate = String(data.get("eventDate") || "").trim();

  try {
    const isEditing = Boolean(editingReservationId);
    const endpoint = isEditing ? `/api/reservations/${editingReservationId}` : "/api/reservations";
    const method = isEditing ? "PUT" : "POST";
    await api(endpoint, {
      method,
      body: JSON.stringify({
        customerName: data.get("customerName"),
        startDate: eventDate,
        endDate: eventDate,
        eventLocation: data.get("eventLocation"),
        banquetero: data.get("banquetero"),
        notes: data.get("notes"),
        status: data.get("status"),
        warehouseId: data.get("warehouseId"),
        items: selectedItems
      })
    });

    formStatus.textContent = isEditing ? "Reserva actualizada." : "Reserva guardada.";
    resetFormForCreateMode();
    clearCatalogQuantities();
    await Promise.all([loadReservations(), loadCalendar()]);
    if (activeProductId) {
      await loadProductStock();
    }
  } catch (error) {
    formStatus.textContent = error.message;
    formStatus.classList.add("error");
  }
});

inventoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  inventoryFormStatus.textContent = "Guardando inventario...";
  inventoryFormStatus.classList.remove("error");

  const data = new FormData(inventoryForm);
  try {
    const payload = {
      name: data.get("name"),
      category: normalizeInventoryCategory(data.get("category")) || data.get("category"),
      size: data.get("size"),
      stockTotal: data.get("stockTotal"),
      unitPriceCLP: data.get("unitPriceCLP"),
      warehouseId: data.get("warehouseId"),
      properties: data.get("properties"),
      imageRef: data.get("imageRef"),
      cushionOption: getInventoryCushionOption(),
      authorizationRequired: Boolean(data.get("authorizationRequired")),
      authorizationOwnerUsername: data.get("authorizationOwnerUsername"),
      authorizationStatus: data.get("authorizationStatus")
    };

    if (inventoryMode === "create") {
      const createdItem = await api("/api/items", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      editingInventoryId = createdItem.id;
      if (inventoryPendingImageFile) {
        await uploadInventoryImage(inventoryPendingImageFile, { reload: false });
      }
      await loadInitialData();
      closeInventoryEditor("Producto creado.");
      return;
    }

    if (!editingInventoryId) {
      return;
    }

    await api(`/api/items/${editingInventoryId}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });

    await loadInitialData();
    closeInventoryEditor("Inventario actualizado.");
  } catch (error) {
    inventoryFormStatus.textContent = error.message;
    inventoryFormStatus.classList.add("error");
  }
});

if (inventoryForm.elements.authorizationRequired) {
  inventoryForm.elements.authorizationRequired.addEventListener("change", () => {
    syncInventoryAuthorizationState();
  });
}
if (inventoryAuthorizationOwnerSelectEl) {
  inventoryAuthorizationOwnerSelectEl.addEventListener("change", () => {
    inventoryForm.elements.authorizationOwnerUsername.value = inventoryAuthorizationOwnerSelectEl.value;
  });
}
if (inventoryForm.elements.authorizationStatus) {
  inventoryForm.elements.authorizationStatus.addEventListener("change", () => {
    syncInventoryAuthorizationState();
  });
}
if (inventoryCategorySelectEl) {
  inventoryCategorySelectEl.addEventListener("change", () => {
    syncInventoryCushionState();
  });
}
if (eventDateInputEl) {
  eventDateInputEl.addEventListener("change", async () => {
    refreshCatalogAvailabilityView();
  });
}
if (inventoryWarehouseSelectEl) {
  inventoryWarehouseSelectEl.addEventListener("change", () => {
    syncInventoryAuthorizationState({ authorizationStatus: "pending" });
  });
}
if (backToCategoriesBtnEl) {
  backToCategoriesBtnEl.addEventListener("click", () => {
    returnToCatalogHome();
  });
}
if (catalogSaveBtnEl) {
  catalogSaveBtnEl.addEventListener("click", () => {
    if (catalogStandaloneMode && activeCategory) {
      const mainCategoryUrl = buildCatalogCategoryUrl(activeCategory, { standalone: false });
      const opened = window.open(mainCategoryUrl, "_blank");
      if (!opened) {
        window.location.assign(mainCategoryUrl);
      }
      return;
    }
    saveCatalogDraftAndClose();
  });
}
if (closeProductDetailBtnEl) {
  closeProductDetailBtnEl.addEventListener("click", () => {
    closeProductDetail();
  });
}
if (addInventoryBtnEl) {
  addInventoryBtnEl.addEventListener("click", () => {
    openNewInventoryEditor();
  });
}
inventoryImageBrowseEl.addEventListener("click", () => {
  openImagePicker();
});
inventoryImageClearEl.addEventListener("click", () => {
  clearInventoryDraftImage();
  inventoryForm.elements.imageRef.value = "";
  setInventoryPreview("", "");
  inventoryFormStatus.textContent = "Foto limpiada.";
  inventoryFormStatus.classList.remove("error");
});
inventoryImageInputEl.addEventListener("change", async (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) {
    return;
  }
  try {
    await handleInventoryImageFile(file);
  } catch (error) {
    inventoryFormStatus.textContent = error.message;
    inventoryFormStatus.classList.add("error");
  }
});
inventoryImageDropzoneEl.addEventListener("click", (event) => {
  if (event.target.closest("button")) {
    return;
  }
  if (currentUser && currentUser.role === "admin") {
    openImagePicker();
  }
});
inventoryImageDropzoneEl.addEventListener("dragover", (event) => {
  event.preventDefault();
  inventoryImageDropzoneEl.classList.add("drag-over");
});
inventoryImageDropzoneEl.addEventListener("dragleave", () => {
  inventoryImageDropzoneEl.classList.remove("drag-over");
});
inventoryImageDropzoneEl.addEventListener("drop", async (event) => {
  event.preventDefault();
  inventoryImageDropzoneEl.classList.remove("drag-over");
  const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
  if (!file) {
    return;
  }
  try {
    await handleInventoryImageFile(file);
  } catch (error) {
    inventoryFormStatus.textContent = error.message;
    inventoryFormStatus.classList.add("error");
  }
});
inventoryModalCloseEl.addEventListener("click", () => {
  closeInventoryEditor();
});
inventoryCancelBtn.addEventListener("click", () => {
  closeInventoryEditor();
});
inventoryModalEl.addEventListener("click", (event) => {
  if (event.target && event.target.dataset && event.target.dataset.closeInventoryModal === "true") {
    closeInventoryEditor();
  }
});
printOrderSheetEl.addEventListener("click", (event) => {
  if (event.target && event.target.dataset && event.target.dataset.closePrintModal === "true") {
    closeReservationSheet();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !inventoryModalEl.classList.contains("hidden")) {
    closeInventoryEditor();
  }
  if (event.key === "Escape" && isPrintSheetOpen()) {
    closeReservationSheet();
  }
});
window.addEventListener("popstate", () => {
  void applyCatalogRouteFromLocation();
});
prevMonthBtn.addEventListener("click", async () => {
  currentMonth = monthShift(currentMonth, -1);
  await loadCalendar();
});
nextMonthBtn.addEventListener("click", async () => {
  currentMonth = monthShift(currentMonth, 1);
  await loadCalendar();
});
cancelEditBtn.addEventListener("click", () => {
  resetFormForCreateMode();
  formStatus.textContent = "Edición cancelada.";
  formStatus.classList.remove("error");
});

loginFormEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginStatusEl.textContent = "Validando acceso...";
  loginStatusEl.classList.remove("error");

  const data = new FormData(loginFormEl);
  try {
    const payload = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: data.get("username"),
        password: data.get("password")
      }),
      allowUnauthorizedResponse: true
    });

    currentUser = payload.user;
    setAuthBar();
    loginFormEl.reset();
    showApp();
    await loadInitialData();
  } catch (error) {
    loginStatusEl.textContent = error.message;
    loginStatusEl.classList.add("error");
  }
});

logoutBtnEl.addEventListener("click", async () => {
  try {
    await api("/api/auth/logout", { method: "POST", allowUnauthorizedResponse: true });
  } catch (_error) {
    // No bloquear el cierre de sesion en frontend por error de red.
  }
  showLogin("Sesión cerrada.");
});

async function loadInitialData() {
  warehouses = await api("/api/warehouses");
  items = await api("/api/items");
  loadCatalogDraft();
  renderInventoryCategorySelect();
  renderAuthorizationOwnerSelect();
  renderInventoryWarehouseSelect();
  if (editingInventoryId) {
    const selectedItem = items.find((item) => item.id === editingInventoryId);
    if (selectedItem) {
      setInventoryPreview(selectedItem.imageUrl || selectedItem.imageRef || "", `${selectedItem.name} ${selectedItem.size}`);
      inventoryForm.elements.imageRef.value = selectedItem.imageRef || "";
    }
  }
  resetFormForCreateMode({ clearCatalog: false });
  activeCategory = "";
  activeProductId = "";
  activeProductStockDate = todayISO;
  if (catalogSectionTitleEl) {
    catalogSectionTitleEl.textContent = "Catálogo por categorías";
  }
  if (catalogSectionSubtitleEl) {
    catalogSectionSubtitleEl.textContent = "Abre una categoría para ver sus productos, ingresa cantidades por producto y guarda la reserva desde el bloque superior.";
  }
  renderHomeCatalog();
  setCatalogVisibility({ categoryVisible: true, productsVisible: false, detailVisible: false });
  await loadReservations();
  await loadCalendar();
  await applyCatalogRouteFromLocation();
}

async function init() {
  try {
    const payload = await api("/api/auth/me", { allowUnauthorizedResponse: true });
    currentUser = payload.user;
    showApp();
    await loadInitialData();
  } catch (_error) {
    showLogin();
  }
}

init();
