const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4780;

const DEFAULT_DATA_DIR = path.join(__dirname, "data");
const DEFAULT_MEDIA_DIR = path.join(process.env.HOME || "", ".openclaw", "media", "inbound");
const SEED_MEDIA_DIR = path.join(__dirname, "seed", "inbound");
const DATA_DIR = path.resolve(process.env.APP_DATA_DIR || DEFAULT_DATA_DIR);
const ITEMS_FILE = path.join(DATA_DIR, "items.json");
const RESERVATIONS_FILE = path.join(DATA_DIR, "reservations.json");
const WAREHOUSES_FILE = path.join(DATA_DIR, "warehouses.json");
const INBOUND_MEDIA_DIR = path.resolve(process.env.APP_MEDIA_DIR || DEFAULT_MEDIA_DIR);
const SESSION_COOKIE_NAME = "catalog_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const SOURCE_DATA_DIR = path.join(__dirname, "data");
const INVENTORY_CATEGORIES = ["Sillas", "Platos", "Lounge", "Manteleria", "Bares", "Plaqué"];
const INVENTORY_CATEGORY_ALIASES = new Map([
  ["fuentes", "Plaqué"],
  ["bandejas", "Plaqué"],
  ["plaque", "Plaqué"]
]);

const AUTH_USERS = [
  { username: "lula", displayName: "Lula", password: "lula321", role: "operator" },
  { username: "amelita", displayName: "Amelita", password: "Ame321", role: "operator" },
  { username: "sraame", displayName: "SraAme", password: "Mama321", role: "operator" },
  { username: "nancy", displayName: "Nancy", password: "Orga321", role: "operator" },
  { username: "kathy", displayName: "Kathy", password: "kat432", role: "operator" },
  { username: "jpi", displayName: "JPI", password: "2380", role: "admin" },
  { username: "jeisson", displayName: "Jeisson", password: "Jei321", role: "admin" }
];
const AUTH_USER_MAP = new Map(AUTH_USERS.map((user) => [user.username, user]));
const sessions = new Map();
const DEFAULT_WAREHOUSES = [
  { id: "ppal-izco", name: "Ppal Izco", location: "Principal", manager: "Juan Pablo", notes: "Bodega principal" },
  { id: "jp", name: "JP", location: "Apoyo", manager: "Juan Pablo", notes: "Bodega de respaldo operativo" },
  { id: "amelita", name: "Amelita", location: "Casa", manager: "Amelita", notes: "Bodega asignada a Amelita" },
  { id: "mama", name: "Mamá", location: "Casa", manager: "Mamá", notes: "Bodega asignada a Mamá" }
];

app.use(express.json({ limit: "15mb" }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/inbound-media", express.static(INBOUND_MEDIA_DIR));

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readJsonOrFallback(filePath, fallback) {
  try {
    return readJson(filePath);
  } catch (_error) {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function seedMediaFiles(targetDir, sourceDir) {
  if (!fs.existsSync(sourceDir)) {
    return;
  }

  ensureDir(targetDir);
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (!entry.isFile()) {
      continue;
    }
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (!fs.existsSync(targetPath)) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function seedFileIfMissing(targetPath, sourcePath, fallbackValue) {
  if (fs.existsSync(targetPath)) {
    return;
  }

  ensureDir(path.dirname(targetPath));
  if (sourcePath && fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, targetPath);
    return;
  }

  writeJson(targetPath, fallbackValue);
}

function normalizeInventorySignature(item) {
  return JSON.stringify({
    name: String(item?.name || "").trim(),
    category: normalizeInventoryCategory(item?.category),
    size: String(item?.size || "").trim(),
    stockTotal: Number(item?.stockTotal || 0),
    unitPriceCLP: Number(item?.unitPriceCLP || 0),
    warehouseId: String(item?.warehouseId || "").trim(),
    authorizationRequired: Boolean(item?.authorizationRequired),
    authorizationStatus: String(item?.authorizationStatus || "").trim(),
    authorizationOwnerUsername: String(item?.authorizationOwnerUsername || "").trim().toLowerCase(),
    cushionOption: String(item?.cushionOption || "none").trim().toLowerCase(),
    imageRef: String(item?.imageRef || "").trim(),
    properties: Array.isArray(item?.properties) ? item.properties.map((value) => String(value || "").trim()) : []
  });
}

function normalizeInventoryCategory(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) {
    return "";
  }
  const normalized = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return INVENTORY_CATEGORIES.find((category) => category.toLowerCase() === normalized) || INVENTORY_CATEGORY_ALIASES.get(normalized) || "";
}

function normalizeLoadedInventoryItem(item) {
  if (!item || typeof item !== "object") {
    return item;
  }

  const category = normalizeInventoryCategory(item.category);
  const cushionOption = normalizeCushionOption(item.cushionOption, category);
  return {
    ...item,
    category,
    cushionOption: cushionOption === null ? "none" : cushionOption
  };
}

function dedupeInventoryItems(items) {
  if (!Array.isArray(items) || items.length < 2) {
    return Array.isArray(items) ? items : [];
  }

  const seen = new Map();
  const deduped = [];
  for (const item of items) {
    const signature = normalizeInventorySignature(item);
    if (seen.has(signature)) {
      continue;
    }
    seen.set(signature, true);
    deduped.push(item);
  }

  return deduped;
}

function bootstrapStorage() {
  ensureDir(DATA_DIR);
  ensureDir(INBOUND_MEDIA_DIR);
  seedMediaFiles(INBOUND_MEDIA_DIR, SEED_MEDIA_DIR);
  seedFileIfMissing(ITEMS_FILE, path.join(SOURCE_DATA_DIR, "items.json"), []);
  seedFileIfMissing(RESERVATIONS_FILE, path.join(SOURCE_DATA_DIR, "reservations.json"), []);
  seedFileIfMissing(WAREHOUSES_FILE, path.join(SOURCE_DATA_DIR, "warehouses.json"), DEFAULT_WAREHOUSES);

  const items = readJsonOrFallback(ITEMS_FILE, []);
  const normalizedItems = dedupeInventoryItems(items.map((item) => normalizeLoadedInventoryItem(item)));
  if (JSON.stringify(normalizedItems) !== JSON.stringify(items)) {
    writeJson(ITEMS_FILE, normalizedItems);
  }
}

function ensureInboundMediaDir() {
  ensureDir(INBOUND_MEDIA_DIR);
}

function decodeDataUrl(dataUrl) {
  const raw = String(dataUrl || "").trim();
  const match = /^data:([^;,]+)?;base64,(.+)$/i.exec(raw);
  if (!match) {
    return null;
  }

  const mimeType = match[1] || "application/octet-stream";
  const base64 = match[2];
  const buffer = Buffer.from(base64, "base64");
  if (!buffer.length) {
    return null;
  }

  return { mimeType, buffer };
}

function mimeTypeToExtension(mimeType) {
  const normalized = String(mimeType || "").toLowerCase();
  if (normalized === "image/jpeg" || normalized === "image/jpg") return "jpg";
  if (normalized === "image/png") return "png";
  if (normalized === "image/webp") return "webp";
  if (normalized === "image/gif") return "gif";
  if (normalized === "image/heic") return "heic";
  if (normalized === "image/heif") return "heif";
  return null;
}

function sanitizeFileStem(value) {
  return String(value || "image")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "image";
}

function parseISODate(value) {
  const match = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (!match) {
    return null;
  }
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateToISO(date) {
  return date.toISOString().slice(0, 10);
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && aEnd >= bStart;
}

function activeForStock(status) {
  return status === "pending" || status === "confirmed" || status === "delivered";
}

function normalizeItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return null;
  }
  const out = [];
  for (const it of rawItems) {
    if (!it || typeof it.itemId !== "string") {
      return null;
    }
    const qty = Number(it.quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      return null;
    }
    out.push({ itemId: it.itemId, quantity: qty });
  }
  return out;
}

function computeReservedByItem(items, reservations, rangeStart, rangeEnd, reservationToIgnore = null) {
  const reserved = {};
  for (const item of items) {
    reserved[item.id] = 0;
  }

  for (const reservation of reservations) {
    if (reservationToIgnore && reservation.id === reservationToIgnore) {
      continue;
    }
    if (!activeForStock(reservation.status)) {
      continue;
    }
    const start = parseISODate(reservation.startDate);
    const end = parseISODate(reservation.endDate);
    if (!start || !end || !overlaps(start, end, rangeStart, rangeEnd)) {
      continue;
    }
    for (const it of reservation.items || []) {
      if (reserved[it.itemId] !== undefined) {
        reserved[it.itemId] += Number(it.quantity) || 0;
      }
    }
  }
  return reserved;
}

function formatCurrencyCLP(value) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(value);
}

function getUserByUsername(username) {
  return AUTH_USER_MAP.get(String(username || "").trim().toLowerCase()) || null;
}

function mediaRefToUrl(imageRef) {
  if (typeof imageRef !== "string") {
    return null;
  }
  if (imageRef.startsWith("media://inbound/")) {
    const filename = imageRef.slice("media://inbound/".length);
    if (!filename) {
      return null;
    }
    return `/inbound-media/${encodeURIComponent(filename)}`;
  }
  return imageRef;
}

function getWarehouses() {
  const warehouses = readJsonOrFallback(WAREHOUSES_FILE, DEFAULT_WAREHOUSES);
  return Array.isArray(warehouses) ? warehouses : DEFAULT_WAREHOUSES;
}

function getWarehouseMap() {
  return new Map(getWarehouses().map((warehouse) => [warehouse.id, warehouse]));
}

function resolveWarehouseId(rawValue) {
  const value = String(rawValue || "").trim();
  return value || null;
}

function parseCookies(req) {
  const cookieHeader = req.headers.cookie || "";
  const cookies = {};
  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rawVal] = part.trim().split("=");
    if (!rawKey) {
      continue;
    }
    cookies[rawKey] = decodeURIComponent(rawVal.join("=") || "");
  }
  return cookies;
}

function setSessionCookie(res, token) {
  const maxAgeSec = Math.floor(SESSION_TTL_MS / 1000);
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}`
  );
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

bootstrapStorage();

function getSessionFromReq(req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) {
    return null;
  }
  const session = sessions.get(token);
  if (!session) {
    return null;
  }
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

function getSafeUser(user) {
  return {
    username: user.username,
    displayName: user.displayName,
    role: user.role
  };
}

function authMiddleware(req, res, next) {
  const session = getSessionFromReq(req);
  if (!session) {
    return res.status(401).json({ error: "Sesion requerida" });
  }
  req.user = session.user;
  return next();
}

function validateReservationPayload(payload) {
  const customerName = String(payload.customerName || "").trim();
  const eventLocation = String(payload.eventLocation || "").trim();
  const banquetero = String(payload.banquetero || "").trim();
  const notes = String(payload.notes || "").trim();
  const startDate = String(payload.startDate || "").trim();
  const endDate = String(payload.endDate || "").trim();
  const status = String(payload.status || "confirmed").trim();
  const warehouseId = resolveWarehouseId(payload.warehouseId);

  if (!customerName) {
    return { error: "customerName es obligatorio" };
  }
  if (!eventLocation) {
    return { error: "eventLocation es obligatorio" };
  }
  if (!banquetero) {
    return { error: "banquetero es obligatorio" };
  }

  const start = parseISODate(startDate);
  const end = parseISODate(endDate);
  if (!start || !end || start > end) {
    return { error: "Rango de fecha invalido" };
  }

  const normalizedItems = normalizeItems(payload.items);
  if (!normalizedItems) {
    return { error: "items debe ser un arreglo con itemId y quantity > 0" };
  }

  if (!["pending", "confirmed", "delivered", "returned", "cancelled"].includes(status)) {
    return { error: "status invalido" };
  }

  return {
    customerName,
    eventLocation,
    banquetero,
    notes,
    startDate,
    endDate,
    status,
    warehouseId,
    start,
    end,
    normalizedItems
  };
}

function normalizeInventoryProperties(rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue
      .map((value) => String(value || "").trim())
      .filter(Boolean);
  }

  return String(rawValue || "")
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function normalizeBoolean(rawValue) {
  const normalized = String(rawValue || "").trim().toLowerCase();
  return ["true", "1", "on", "yes", "si"].includes(normalized);
}

function normalizeAuthorizationOwnerUsername(rawValue) {
  const normalized = String(rawValue || "").trim().toLowerCase();
  return normalized || "";
}

function normalizeAuthorizationStatus(rawValue, authorizationRequired) {
  const normalized = String(rawValue || "").trim().toLowerCase();
  if (!authorizationRequired) {
    return "not_required";
  }
  if (["pending", "confirmed"].includes(normalized)) {
    return normalized;
  }
  return "pending";
}

function getAuthorizationOwnerLabel(username) {
  const user = getUserByUsername(username);
  return user ? user.displayName : "Sin usuario";
}

function normalizeCushionOption(rawValue, category) {
  const allowed = new Set(["none", "white", "black"]);
  const normalizedCategory = normalizeInventoryCategory(category).toLowerCase();
  const rawOption = String(rawValue || "none").trim().toLowerCase();

  if (!normalizedCategory.includes("silla")) {
    return "none";
  }

  if (!allowed.has(rawOption)) {
    return null;
  }

  return rawOption;
}

function validateInventoryItemPayload(payload) {
  const name = String(payload.name || "").trim();
  const category = normalizeInventoryCategory(payload.category);
  const size = String(payload.size || "").trim();
  const imageRef = String(payload.imageRef || "").trim();
  const warehouseId = resolveWarehouseId(payload.warehouseId);
  const cushionOption = normalizeCushionOption(payload.cushionOption, category);
  const authorizationRequired = normalizeBoolean(payload.authorizationRequired);
  const authorizationOwnerUsername = normalizeAuthorizationOwnerUsername(payload.authorizationOwnerUsername);
  const authorizationStatus = normalizeAuthorizationStatus(payload.authorizationStatus, authorizationRequired);

  const stockTotal = Number(payload.stockTotal);
  const unitPriceCLP = Number(payload.unitPriceCLP);

  if (!name) {
    return { error: "name es obligatorio" };
  }
  if (!category) {
    return { error: `category debe ser una de: ${INVENTORY_CATEGORIES.join(", ")}` };
  }
  if (!size) {
    return { error: "size es obligatorio" };
  }
  if (!Number.isInteger(stockTotal) || stockTotal < 0) {
    return { error: "stockTotal debe ser un entero mayor o igual a 0" };
  }
  if (!Number.isInteger(unitPriceCLP) || unitPriceCLP < 0) {
    return { error: "unitPriceCLP debe ser un entero mayor o igual a 0" };
  }
  if (!warehouseId) {
    return { error: "warehouseId es obligatorio" };
  }
  if (cushionOption === null) {
    return { error: "cushionOption invalido" };
  }
  if (authorizationRequired && !authorizationOwnerUsername) {
    return { error: "authorizationOwnerUsername es obligatorio cuando requiere autorizacion" };
  }
  if (authorizationOwnerUsername && !getUserByUsername(authorizationOwnerUsername)) {
    return { error: `authorizationOwnerUsername no existe: ${authorizationOwnerUsername}` };
  }

  return {
    name,
    category,
    size,
    stockTotal,
    unitPriceCLP,
    warehouseId,
    cushionOption,
    authorizationRequired,
    authorizationStatus,
    authorizationOwnerUsername: authorizationRequired ? authorizationOwnerUsername : "",
    imageRef: imageRef || "",
    properties: normalizeInventoryProperties(payload.properties)
  };
}

function buildReservationItemSnapshot(item, quantity) {
  const authorizationRequired = Boolean(item.authorizationRequired);
  return {
    itemId: item.id,
    quantity,
    authorizationRequired,
    authorizationStatus: authorizationRequired ? item.authorizationStatus || "pending" : "not_required",
    authorizationOwnerUsername: authorizationRequired ? item.authorizationOwnerUsername || "" : "",
    authorizationOwnerDisplayName: authorizationRequired
      ? getAuthorizationOwnerLabel(item.authorizationOwnerUsername)
      : ""
  };
}

function generateInventoryItemId(items) {
  const existingIds = new Set((items || []).map((item) => item.id));
  let id = "";
  do {
    id = `item-${crypto.randomUUID().slice(0, 8)}`;
  } while (existingIds.has(id));
  return id;
}

app.post("/api/auth/login", (req, res) => {
  const usernameInput = String(req.body.username || "")
    .trim()
    .toLowerCase();
  const passwordInput = String(req.body.password || "");

  const user = AUTH_USER_MAP.get(usernameInput);
  if (!user || user.password !== passwordInput) {
    return res.status(401).json({ error: "Usuario o clave incorrecta" });
  }

  const token = crypto.randomBytes(24).toString("hex");
  const safeUser = getSafeUser(user);
  sessions.set(token, {
    user: safeUser,
    expiresAt: Date.now() + SESSION_TTL_MS
  });
  setSessionCookie(res, token);

  return res.json({ user: safeUser });
});

app.get("/api/auth/me", (req, res) => {
  const session = getSessionFromReq(req);
  if (!session) {
    return res.status(401).json({ error: "No autenticado" });
  }
  return res.json({ user: session.user });
});

app.post("/api/auth/logout", (req, res) => {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE_NAME];
  if (token) {
    sessions.delete(token);
  }
  clearSessionCookie(res);
  return res.json({ ok: true });
});

app.use("/api", authMiddleware);

app.get("/api/items", (req, res) => {
  const items = readJson(ITEMS_FILE);
  const reservations = readJson(RESERVATIONS_FILE);
  const warehouseMap = getWarehouseMap();

  const start = req.query.startDate ? parseISODate(String(req.query.startDate)) : null;
  const end = req.query.endDate ? parseISODate(String(req.query.endDate)) : null;

  if ((req.query.startDate && !start) || (req.query.endDate && !end)) {
    return res.status(400).json({ error: "startDate/endDate deben usar formato YYYY-MM-DD" });
  }

  let reserved = null;
  if (start && end) {
    if (start > end) {
      return res.status(400).json({ error: "startDate no puede ser mayor que endDate" });
    }
    reserved = computeReservedByItem(items, reservations, start, end);
  }

  const payload = items.map((item) => {
    const warehouse = warehouseMap.get(item.warehouseId) || null;
    const authorizationRequired = Boolean(item.authorizationRequired);
    const authorizationOwnerUsername = authorizationRequired ? String(item.authorizationOwnerUsername || "").trim().toLowerCase() : "";
    const out = {
      ...item,
      warehouseName: warehouse ? warehouse.name : "Sin bodega",
      imageUrl: mediaRefToUrl(item.imageRef),
      unitPriceLabel: formatCurrencyCLP(item.unitPriceCLP),
      authorizationRequired,
      authorizationStatus: authorizationRequired ? item.authorizationStatus || "pending" : "not_required",
      authorizationOwnerUsername,
      authorizationOwnerDisplayName: authorizationRequired ? getAuthorizationOwnerLabel(authorizationOwnerUsername) : ""
    };
    if (reserved) {
      out.reservedInRange = reserved[item.id] || 0;
      out.availableInRange = item.stockTotal - out.reservedInRange;
    }
    return out;
  });

  return res.json(payload);
});

app.post("/api/items", (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Solo admin puede editar inventario" });
  }

  const parsed = validateInventoryItemPayload(req.body);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }

  const warehouseMap = getWarehouseMap();
  if (parsed.warehouseId && !warehouseMap.has(parsed.warehouseId)) {
    return res.status(400).json({ error: `warehouseId no existe: ${parsed.warehouseId}` });
  }

  const items = readJson(ITEMS_FILE);
  const now = new Date().toISOString();
  const item = {
    id: generateInventoryItemId(items),
    ...parsed,
    createdAt: now,
    updatedAt: now
  };

  items.push(item);
  writeJson(ITEMS_FILE, items);

  return res.status(201).json(item);
});

app.put("/api/items/:id", (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Solo admin puede editar inventario" });
  }

  const id = String(req.params.id);
  const items = readJson(ITEMS_FILE);
  const item = items.find((entry) => entry.id === id);
  if (!item) {
    return res.status(404).json({ error: "Item no encontrado" });
  }

  const parsed = validateInventoryItemPayload(req.body);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }

  const warehouseMap = getWarehouseMap();
  if (parsed.warehouseId && !warehouseMap.has(parsed.warehouseId)) {
    return res.status(400).json({ error: `warehouseId no existe: ${parsed.warehouseId}` });
  }

  item.name = parsed.name;
  item.category = parsed.category;
  item.size = parsed.size;
  item.stockTotal = parsed.stockTotal;
  item.unitPriceCLP = parsed.unitPriceCLP;
  item.warehouseId = parsed.warehouseId;
  item.cushionOption = parsed.cushionOption;
  item.authorizationRequired = parsed.authorizationRequired;
  item.authorizationStatus = parsed.authorizationStatus;
  item.authorizationOwnerUsername = parsed.authorizationOwnerUsername;
  item.imageRef = parsed.imageRef;
  item.properties = parsed.properties;
  item.updatedAt = new Date().toISOString();

  writeJson(ITEMS_FILE, items);
  return res.json(item);
});

app.post("/api/items/:id/image", (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Solo admin puede editar inventario" });
  }

  const id = String(req.params.id);
  const items = readJson(ITEMS_FILE);
  const item = items.find((entry) => entry.id === id);
  if (!item) {
    return res.status(404).json({ error: "Item no encontrado" });
  }

  const decoded = decodeDataUrl(req.body.dataUrl);
  if (!decoded) {
    return res.status(400).json({ error: "dataUrl invalido" });
  }

  const extension = mimeTypeToExtension(decoded.mimeType);
  if (!extension) {
    return res.status(400).json({ error: "Solo se permiten imagenes JPG, PNG, WEBP, GIF, HEIC o HEIF" });
  }

  ensureInboundMediaDir();
  const fileStem = sanitizeFileStem(item.id);
  const filename = `${fileStem}-${Date.now()}.${extension}`;
  const filePath = path.join(INBOUND_MEDIA_DIR, filename);
  fs.writeFileSync(filePath, decoded.buffer);

  item.imageRef = `media://inbound/${filename}`;
  item.updatedAt = new Date().toISOString();
  writeJson(ITEMS_FILE, items);

  return res.json({
    item,
    imageRef: item.imageRef,
    imageUrl: mediaRefToUrl(item.imageRef)
  });
});

app.get("/api/warehouses", (_req, res) => {
  return res.json(getWarehouses());
});

app.get("/api/reservations", (_req, res) => {
  const reservations = readJson(RESERVATIONS_FILE)
    .slice()
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  return res.json(reservations);
});

app.get("/api/stock", (req, res) => {
  const dateStr = req.query.date ? String(req.query.date) : dateToISO(new Date());
  const targetDate = parseISODate(dateStr);
  if (!targetDate) {
    return res.status(400).json({ error: "date debe usar formato YYYY-MM-DD" });
  }

  const items = readJson(ITEMS_FILE);
  const reservations = readJson(RESERVATIONS_FILE);
  const reserved = computeReservedByItem(items, reservations, targetDate, targetDate);

  return res.json(
    items.map((item) => ({
      itemId: item.id,
      name: item.name,
      size: item.size,
      stockTotal: item.stockTotal,
      reserved: reserved[item.id] || 0,
      available: item.stockTotal - (reserved[item.id] || 0)
    }))
  );
});

app.get("/api/calendar", (req, res) => {
  const month = req.query.month ? String(req.query.month) : dateToISO(new Date()).slice(0, 7);
  const match = /^\d{4}-\d{2}$/.test(month);
  if (!match) {
    return res.status(400).json({ error: "month debe usar formato YYYY-MM" });
  }

  const [yy, mm] = month.split("-").map(Number);
  const start = new Date(Date.UTC(yy, mm - 1, 1));
  const end = new Date(Date.UTC(yy, mm, 0));

  const items = readJson(ITEMS_FILE);
  const reservations = readJson(RESERVATIONS_FILE);

  const days = [];
  for (let day = 1; day <= end.getUTCDate(); day += 1) {
    const d = new Date(Date.UTC(yy, mm - 1, day));
    const dateISO = d.toISOString().slice(0, 10);
    const reservedByItem = computeReservedByItem(items, reservations, d, d);
    const reservedUnits = Object.values(reservedByItem).reduce((acc, n) => acc + n, 0);
    const reservationCount = reservations.filter((r) => {
      if (!activeForStock(r.status)) {
        return false;
      }
      const rStart = parseISODate(r.startDate);
      const rEnd = parseISODate(r.endDate);
      if (!rStart || !rEnd) {
        return false;
      }
      return overlaps(rStart, rEnd, d, d);
    }).length;

    days.push({
      date: dateISO,
      reservedUnits,
      reservationCount
    });
  }

  return res.json({ month, days });
});

app.post("/api/reservations", (req, res) => {
  const parsed = validateReservationPayload(req.body);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }
  const { customerName, eventLocation, banquetero, notes, startDate, endDate, status, warehouseId, start, end, normalizedItems } = parsed;

  const items = readJson(ITEMS_FILE);
  const reservations = readJson(RESERVATIONS_FILE);
  const warehouseMap = getWarehouseMap();

  const itemMap = new Map(items.map((it) => [it.id, it]));
  for (const it of normalizedItems) {
    if (!itemMap.has(it.itemId)) {
      return res.status(400).json({ error: `itemId no existe: ${it.itemId}` });
    }
  }

  if (warehouseId && !warehouseMap.has(warehouseId)) {
    return res.status(400).json({ error: `warehouseId no existe: ${warehouseId}` });
  }

  const reserved = computeReservedByItem(items, reservations, start, end);

  for (const it of normalizedItems) {
    const item = itemMap.get(it.itemId);
    const remaining = item.stockTotal - (reserved[it.itemId] || 0);
    if (it.quantity > remaining) {
      return res.status(409).json({
        error: `Stock insuficiente para ${item.name} ${item.size}. Disponible: ${remaining}, solicitado: ${it.quantity}`
      });
    }
  }

  const totalCLP = normalizedItems.reduce((sum, it) => {
    const item = itemMap.get(it.itemId);
    return sum + item.unitPriceCLP * it.quantity;
  }, 0);

  const approvalStatus = warehouseId ? "pending" : "not_required";
  const approvalReason = warehouseId
    ? `Reserva solicitada para ${warehouseMap.get(warehouseId).name}`
    : "";

  const reservation = {
    id: `res-${Date.now()}`,
    createdAt: new Date().toISOString(),
    customerName,
    eventLocation,
    banquetero,
    createdBy: req.user.username,
    createdByDisplayName: req.user.displayName,
    notes,
    startDate,
    endDate,
    status,
    warehouseId,
    approvalStatus,
    approvalReason,
    approvalUpdatedAt: null,
    approvalUpdatedBy: null,
    items: normalizedItems.map((it) => buildReservationItemSnapshot(itemMap.get(it.itemId), it.quantity)),
    totalCLP,
    totalLabel: formatCurrencyCLP(totalCLP)
  };

  reservations.push(reservation);
  writeJson(RESERVATIONS_FILE, reservations);

  return res.status(201).json(reservation);
});

app.put("/api/reservations/:id", (req, res) => {
  const id = String(req.params.id);
  const parsed = validateReservationPayload(req.body);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }
  const { customerName, eventLocation, banquetero, notes, startDate, endDate, status, warehouseId, start, end, normalizedItems } = parsed;

  const items = readJson(ITEMS_FILE);
  const reservations = readJson(RESERVATIONS_FILE);
  const warehouseMap = getWarehouseMap();
  const found = reservations.find((r) => r.id === id);
  if (!found) {
    return res.status(404).json({ error: "Reserva no encontrada" });
  }
  if (req.user.role !== "admin" && found.createdBy && found.createdBy !== req.user.username) {
    return res.status(403).json({ error: "Solo el creador o admin puede editar esta reserva" });
  }
  if (req.user.role !== "admin" && !found.createdBy) {
    return res.status(403).json({ error: "Solo el creador o admin puede editar esta reserva" });
  }

  const itemMap = new Map(items.map((it) => [it.id, it]));
  for (const it of normalizedItems) {
    if (!itemMap.has(it.itemId)) {
      return res.status(400).json({ error: `itemId no existe: ${it.itemId}` });
    }
  }

  if (warehouseId && !warehouseMap.has(warehouseId)) {
    return res.status(400).json({ error: `warehouseId no existe: ${warehouseId}` });
  }

  const reserved = computeReservedByItem(items, reservations, start, end, id);
  for (const it of normalizedItems) {
    const item = itemMap.get(it.itemId);
    const remaining = item.stockTotal - (reserved[it.itemId] || 0);
    if (it.quantity > remaining) {
      return res.status(409).json({
        error: `Stock insuficiente para ${item.name} ${item.size}. Disponible: ${remaining}, solicitado: ${it.quantity}`
      });
    }
  }

  const totalCLP = normalizedItems.reduce((sum, it) => {
    const item = itemMap.get(it.itemId);
    return sum + item.unitPriceCLP * it.quantity;
  }, 0);

  const approvalStatus = warehouseId ? "pending" : "not_required";
  const approvalReason = warehouseId
    ? `Reserva solicitada para ${warehouseMap.get(warehouseId).name}`
    : "";

  found.customerName = customerName;
  found.eventLocation = eventLocation;
  found.banquetero = banquetero;
  found.notes = notes;
  found.startDate = startDate;
  found.endDate = endDate;
  found.status = status;
  found.warehouseId = warehouseId;
  found.approvalStatus = approvalStatus;
  found.approvalReason = approvalReason;
  found.items = normalizedItems.map((it) => buildReservationItemSnapshot(itemMap.get(it.itemId), it.quantity));
  found.totalCLP = totalCLP;
  found.totalLabel = formatCurrencyCLP(totalCLP);
  found.updatedAt = new Date().toISOString();

  writeJson(RESERVATIONS_FILE, reservations);
  return res.json(found);
});

app.patch("/api/reservations/:id/approval", (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Solo admin puede aprobar o rechazar" });
  }

  const id = String(req.params.id);
  const approvalStatus = String(req.body.approvalStatus || "").trim();
  if (!["approved", "rejected"].includes(approvalStatus)) {
    return res.status(400).json({ error: "approvalStatus invalido" });
  }

  const reservations = readJson(RESERVATIONS_FILE);
  const found = reservations.find((r) => r.id === id);
  if (!found) {
    return res.status(404).json({ error: "Reserva no encontrada" });
  }

  found.approvalStatus = approvalStatus;
  found.approvalUpdatedAt = new Date().toISOString();
  found.approvalUpdatedBy = req.user.username;
  writeJson(RESERVATIONS_FILE, reservations);

  return res.json(found);
});

app.patch("/api/reservations/:id/items/:itemId/authorization", (req, res) => {
  const reservationId = String(req.params.id);
  const itemId = String(req.params.itemId);
  const requestedStatus = String(req.body.authorizationStatus || "").trim().toLowerCase();

  if (!["pending", "confirmed"].includes(requestedStatus)) {
    return res.status(400).json({ error: "authorizationStatus invalido" });
  }

  const reservations = readJson(RESERVATIONS_FILE);
  const found = reservations.find((r) => r.id === reservationId);
  if (!found) {
    return res.status(404).json({ error: "Reserva no encontrada" });
  }

  const foundItem = (found.items || []).find((it) => it.itemId === itemId);
  if (!foundItem) {
    return res.status(404).json({ error: "Item no encontrado en la reserva" });
  }
  if (!foundItem.authorizationRequired) {
    return res.status(400).json({ error: "Este item no requiere autorizacion" });
  }

  const ownerUsername = String(foundItem.authorizationOwnerUsername || "").trim().toLowerCase();
  if (req.user.role !== "admin" && req.user.username !== ownerUsername) {
    return res.status(403).json({ error: "Solo el usuario autorizado o admin puede cambiar este estado" });
  }

  foundItem.authorizationStatus = requestedStatus;
  foundItem.authorizationUpdatedAt = new Date().toISOString();
  foundItem.authorizationUpdatedBy = req.user.username;
  writeJson(RESERVATIONS_FILE, reservations);

  return res.json(found);
});

app.patch("/api/reservations/:id/status", (req, res) => {
  const id = String(req.params.id);
  const newStatus = String(req.body.status || "").trim();
  if (!["pending", "confirmed", "delivered", "returned", "cancelled"].includes(newStatus)) {
    return res.status(400).json({ error: "status invalido" });
  }

  const reservations = readJson(RESERVATIONS_FILE);
  const found = reservations.find((r) => r.id === id);
  if (!found) {
    return res.status(404).json({ error: "Reserva no encontrada" });
  }
  if (req.user.role !== "admin" && found.createdBy && found.createdBy !== req.user.username) {
    return res.status(403).json({ error: "Solo el creador o admin puede modificar esta reserva" });
  }
  if (req.user.role !== "admin" && !found.createdBy) {
    return res.status(403).json({ error: "Solo el creador o admin puede modificar esta reserva" });
  }

  found.status = newStatus;
  found.updatedAt = new Date().toISOString();
  writeJson(RESERVATIONS_FILE, reservations);

  return res.json(found);
});

app.listen(PORT, () => {
  console.log(`App arriendo platos escuchando en http://localhost:${PORT}`);
});
