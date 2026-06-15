const loginLayoutEl = document.getElementById("login-layout");
const appLayoutEl = document.getElementById("app-layout");
const loginFormEl = document.getElementById("login-form");
const loginStatusEl = document.getElementById("login-status");
const authBarEl = document.getElementById("auth-bar");
const currentUserLabelEl = document.getElementById("current-user-label");
const logoutBtnEl = document.getElementById("logout-btn");

const form = document.getElementById("reservation-form");
const formStatus = document.getElementById("form-status");
const catalogEl = document.getElementById("catalog");
const reservationsEl = document.getElementById("reservations");
const itemRowsEl = document.getElementById("item-rows");
const stockDateEl = document.getElementById("stock-date");
const stockTableEl = document.getElementById("stock-table");
const calendarGridEl = document.getElementById("calendar-grid");
const calendarWeekdaysEl = document.getElementById("calendar-weekdays");
const monthLabelEl = document.getElementById("month-label");
const prevMonthBtn = document.getElementById("prev-month");
const nextMonthBtn = document.getElementById("next-month");
const reservationDetailEl = document.getElementById("reservation-detail");
const formTitleEl = document.getElementById("reservation-form-title");
const formSubmitBtn = document.getElementById("reservation-submit-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const warehouseSelectEl = document.getElementById("warehouse-select");
const warehouseAlertEl = document.getElementById("warehouse-alert");
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
const inventoryImageDropzoneEl = document.getElementById("inventory-image-dropzone");
const inventoryImagePreviewEl = document.getElementById("inventory-image-preview");
const inventoryImageInputEl = document.getElementById("inventory-image-input");
const inventoryImageBrowseEl = document.getElementById("inventory-image-browse");
const inventoryImageClearEl = document.getElementById("inventory-image-clear");
const printOrderSheetEl = document.getElementById("print-order-sheet");

const todayISO = new Date().toISOString().slice(0, 10);
stockDateEl.value = todayISO;

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
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const ACTIVE_STOCK_STATUSES = new Set(["pending", "confirmed", "delivered"]);
const CUSHION_OPTIONS = new Map([
  ["none", "No usa"],
  ["white", "Blanco"],
  ["black", "Negro"]
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

function getApprovalLabel(approvalStatus) {
  if (approvalStatus === "approved") return "Aprobada";
  if (approvalStatus === "rejected") return "Rechazada";
  if (approvalStatus === "pending") return "Pendiente";
  return "No requiere";
}

function updateWarehouseAlert() {
  const warehouseId = warehouseSelectEl.value;
  const warehouse = getWarehouseById(warehouseId);
  if (!warehouse) {
    warehouseAlertEl.textContent = "";
    warehouseAlertEl.classList.add("empty");
    return;
  }

  warehouseAlertEl.textContent = `Alerta de aprobación: esta reserva quedará pendiente porque pide ${warehouse.name}.`;
  warehouseAlertEl.classList.remove("empty");
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

function getInventoryCushionOption() {
  const selected = inventoryForm.querySelector('input[name="cushionOption"]:checked');
  return selected ? selected.value : "none";
}

function getCushionLabel(value) {
  return CUSHION_OPTIONS.get(value) || "No usa";
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
  setInventoryModalOpen(false);
}

function fillInventoryForm(item) {
  inventoryMode = "edit";
  clearInventoryDraftImage();
  editingInventoryId = item.id;
  inventoryModalTitleEl.textContent = "Editar inventario";
  inventoryModalSubtitleEl.textContent = `${item.name} ${item.size}`;
  inventorySaveBtn.textContent = "Guardar cambios";
  inventoryForm.elements.id.value = item.id;
  inventoryForm.elements.name.value = item.name || "";
  inventoryForm.elements.category.value = item.category || "";
  inventoryForm.elements.size.value = item.size || "";
  inventoryForm.elements.stockTotal.value = String(item.stockTotal ?? 0);
  inventoryForm.elements.unitPriceCLP.value = String(item.unitPriceCLP ?? 0);
  inventoryForm.elements.warehouseId.value = item.warehouseId || "";
  inventoryForm.elements.properties.value = Array.isArray(item.properties) ? item.properties.join("\n") : "";
  inventoryForm.elements.imageRef.value = item.imageRef || "";
  setInventoryCushionOption(item.cushionOption || "none");
  inventoryFormStatus.textContent = "";
  inventoryFormStatus.classList.remove("error");
  setInventoryPreview(item.imageUrl || item.imageRef || "", `${item.name} ${item.size}`);
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
  inventoryModalSubtitleEl.textContent = "Completa los datos del nuevo producto para el catálogo.";
  inventorySaveBtn.textContent = "Crear producto";
  inventoryForm.elements.id.value = "";
  inventoryForm.elements.name.value = "";
  inventoryForm.elements.category.value = "";
  inventoryForm.elements.size.value = "";
  inventoryForm.elements.stockTotal.value = "0";
  inventoryForm.elements.unitPriceCLP.value = "0";
  inventoryForm.elements.warehouseId.value = "";
  inventoryForm.elements.properties.value = "";
  inventoryForm.elements.imageRef.value = "";
  setInventoryCushionOption("none");
  inventoryFormStatus.textContent = "";
  inventoryFormStatus.classList.remove("error");
  renderInventoryWarehouseSelect();
  setInventoryPreview("", "");
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
  form.elements.endDate.value = reservation.endDate || "";
  form.elements.status.value = reservation.status || "confirmed";
  form.elements.warehouseId.value = reservation.warehouseId || "";
  form.elements.notes.value = reservation.notes || "";

  const qtyByItem = new Map((reservation.items || []).map((it) => [it.itemId, Number(it.quantity) || 0]));
  for (const item of items) {
    const input = form.elements[`qty_${item.id}`];
    if (input) {
      input.value = String(qtyByItem.get(item.id) || 0);
    }
  }
}

function resetFormForCreateMode() {
  form.reset();
  stockDateEl.value = todayISO;
  warehouseSelectEl.value = "";
  renderItemRows();
  setEditMode(null);
  updateWarehouseAlert();
}

function clearAppData() {
  items = [];
  reservations = [];
  warehouses = [];
  selectedReservationId = null;
  editingReservationId = null;
  catalogEl.innerHTML = "";
  reservationsEl.innerHTML = "";
  stockTableEl.innerHTML = "";
  calendarGridEl.innerHTML = "";
  calendarWeekdaysEl.innerHTML = "";
  reservationDetailEl.innerHTML = "<p>Toca una reserva para abrir su detalle.</p>";
  itemRowsEl.innerHTML = "";
  formStatus.textContent = "";
  warehouseAlertEl.textContent = "";
  warehouseAlertEl.classList.add("empty");
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
  const options = [
    '<option value="">Sin bodega específica</option>',
    ...warehouses.map(
      (warehouse) =>
        `<option value="${warehouse.id}">${warehouse.name} · ${warehouse.location}</option>`
    )
  ];
  warehouseSelectEl.innerHTML = options.join("");
}

function renderItemRows() {
  itemRowsEl.innerHTML = "";
  for (const item of items) {
    const row = document.createElement("label");
    row.className = "item-row";
    row.innerHTML = `
      <span>${item.name} ${item.size} <small>(stock ${item.stockTotal})</small></span>
      <input type="number" name="qty_${item.id}" min="0" step="1" value="0" />
      <span class="warehouse-chip">${getWarehouseLabel(item.warehouseId)}</span>
    `;
    itemRowsEl.appendChild(row);
  }
}

function renderCatalog() {
  catalogEl.innerHTML = items
    .map(
      (item) => `
    <article class="card ${currentUser && currentUser.role === "admin" ? "clickable" : ""}" ${
      currentUser && currentUser.role === "admin"
        ? `tabindex="0" role="button" aria-label="Abrir ${escapeHtml(item.name)} ${escapeHtml(item.size)}"`
        : ""
    } data-item-id="${escapeHtml(item.id)}">
      <div class="thumb">
        ${
          item.imageUrl
            ? `<img src="${item.imageUrl}" alt="${item.name} ${item.size}" loading="lazy" />`
            : `<div class="thumb-fallback">Sin imagen disponible</div>`
        }
      </div>
      <div class="card-body">
        ${currentUser && currentUser.role === "admin" ? '<span class="admin-tag">Admin</span>' : ""}
        <strong>${item.name} ${item.size}</strong>
        <div class="card-meta">
          <div>Categoría: ${item.category}</div>
          <div>Bodega: ${item.warehouseName || getWarehouseLabel(item.warehouseId)}</div>
          <div>Stock total: ${item.stockTotal}</div>
          <div>Valor unitario: ${fmtCLP(item.unitPriceCLP)}</div>
          <div>Propiedades: ${item.properties.join(", ")}</div>
          ${String(item.category || "").toLowerCase().includes("silla") ? `<div>Cojín: ${getCushionLabel(item.cushionOption)}</div>` : ""}
        </div>
        ${
          currentUser && currentUser.role === "admin"
            ? `<div class="card-actions">
                 <button type="button" class="secondary edit-inventory-btn" data-item-id="${escapeHtml(item.id)}">Editar inventario</button>
               </div>`
            : ""
        }
        ${currentUser && currentUser.role === "admin" ? '<div class="card-cta">Click en la tarjeta para abrir la ficha.</div>' : ""}
      </div>
    </article>
  `
    )
    .join("");

  const openItem = (itemId) => {
    openInventoryEditor(itemId);
  };

  catalogEl.querySelectorAll(".card.clickable").forEach((card) => {
    card.addEventListener("click", (event) => {
      const itemId = event.currentTarget.getAttribute("data-item-id");
      if (!itemId) return;
      if (event.target.closest("button")) {
        return;
      }
      if (currentUser && currentUser.role === "admin") {
        openItem(itemId);
      }
    });
    card.addEventListener("keydown", (event) => {
      if ((event.key === "Enter" || event.key === " ") && currentUser && currentUser.role === "admin") {
        event.preventDefault();
        const itemId = event.currentTarget.getAttribute("data-item-id");
        if (itemId) openItem(itemId);
      }
    });
  });

  catalogEl.querySelectorAll(".edit-inventory-btn").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      const itemId = event.currentTarget.getAttribute("data-item-id");
      openItem(itemId);
    });
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
    return;
  }

  const rows = reservations
    .map((r) => {
      const itemLines = r.items
        .map((it) => {
          const item = items.find((x) => x.id === it.itemId);
          return `${item ? item.name : it.itemId} x${it.quantity}`;
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
          <select data-res-id="${r.id}" class="status-select">
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
      await Promise.all([loadReservations(), loadStock(), loadCalendar()]);
    });
  });

  renderReservationDetail();
}

async function loadStock() {
  const date = stockDateEl.value;
  const stock = await api(`/api/stock?date=${date}`);
  const rows = stock
    .map(
      (s) => `<tr>
      <td>${s.name} ${s.size}</td>
      <td>${s.stockTotal}</td>
      <td>${s.reserved}</td>
      <td>${s.available}</td>
    </tr>`
    )
    .join("");
  stockTableEl.innerHTML = `<table class="table">
    <thead><tr><th>Ítem</th><th>Total</th><th>Reservado</th><th>Disponible</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
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
        return `<li>${escapeHtml(it.itemId)} x${it.quantity}</li>`;
      }
      return `<li>${escapeHtml(item.name)} ${escapeHtml(item.size)} x${it.quantity}</li>`;
    })
    .join("");

  reservationDetailEl.innerHTML = `
    <h3>Reserva abierta</h3>
    <div class="detail-actions">
      <button type="button" class="secondary detail-edit-btn" data-res-id="${escapeHtml(reservation.id)}">Editar reserva</button>
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
  editBtn.addEventListener("click", () => {
    setEditMode(reservation);
    fillFormFromReservation(reservation);
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    formStatus.textContent = "Editando reserva abierta.";
    formStatus.classList.remove("error");
  });

  const printBtn = reservationDetailEl.querySelector(".detail-print-btn");
  printBtn.addEventListener("click", () => {
    buildReservationPrintSheet(reservation);
    window.print();
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
      return `<li><span>${escapeHtml(label)}</span><span>x${it.quantity}</span></li>`;
    })
    .join("");
  const clientName = escapeHtml(reservation.customerName || "Sin nombre");
  const preparedBy = escapeHtml(currentUser ? currentUser.displayName : "Sistema");

  printOrderSheetEl.innerHTML = `
    <section class="print-order-page">
      <header class="print-order-header">
        <div class="print-brand">
          <div class="print-logo" aria-hidden="true">
            <span>AP</span>
          </div>
          <div>
            <p class="print-kicker">Pedido para impresión</p>
            <h1>Arriendo Plaqué</h1>
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
  `;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formStatus.textContent = "Guardando...";
  formStatus.classList.remove("error");

  const data = new FormData(form);
  const selectedItems = items
    .map((item) => ({
      itemId: item.id,
      quantity: Number(data.get(`qty_${item.id}`) || 0)
    }))
    .filter((it) => it.quantity > 0);

  try {
    const isEditing = Boolean(editingReservationId);
    const endpoint = isEditing ? `/api/reservations/${editingReservationId}` : "/api/reservations";
    const method = isEditing ? "PUT" : "POST";
    await api(endpoint, {
      method,
      body: JSON.stringify({
        customerName: data.get("customerName"),
        startDate: data.get("startDate"),
        endDate: data.get("endDate"),
        notes: data.get("notes"),
        status: data.get("status"),
        warehouseId: data.get("warehouseId"),
        items: selectedItems
      })
    });

    formStatus.textContent = isEditing ? "Reserva actualizada." : "Reserva guardada.";
    resetFormForCreateMode();
    await Promise.all([loadReservations(), loadStock(), loadCalendar()]);
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
      category: data.get("category"),
      size: data.get("size"),
      stockTotal: data.get("stockTotal"),
      unitPriceCLP: data.get("unitPriceCLP"),
      warehouseId: data.get("warehouseId"),
      properties: data.get("properties"),
      imageRef: data.get("imageRef"),
      cushionOption: getInventoryCushionOption()
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

stockDateEl.addEventListener("change", loadStock);
warehouseSelectEl.addEventListener("change", updateWarehouseAlert);
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
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !inventoryModalEl.classList.contains("hidden")) {
    closeInventoryEditor();
  }
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
  renderWarehouseSelect();
  renderInventoryWarehouseSelect();
  if (editingInventoryId) {
    const selectedItem = items.find((item) => item.id === editingInventoryId);
    if (selectedItem) {
      setInventoryPreview(selectedItem.imageUrl || selectedItem.imageRef || "", `${selectedItem.name} ${selectedItem.size}`);
      inventoryForm.elements.imageRef.value = selectedItem.imageRef || "";
    }
  }
  resetFormForCreateMode();
  renderCatalog();
  await loadReservations();
  await Promise.all([loadStock(), loadCalendar()]);
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
