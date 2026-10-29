// Cliente de la API REST de PharmaTrace sobre Hyperledger Fabric (backend/).
//
// Los errores del backend llegan como `{ "error": "<motivo>" }` con un código HTTP 4xx/5xx. Acá
// se convierten en una excepción `ApiError` con el mensaje ya traducido, así que quien llama
// nunca revisa `response.ok` ni adivina si una operación salió bien.
//
// El backend es custodial: cada operación la firma con la identidad de la org que corresponde
// (el dueño del lote, quien lo recibe, el regulador). El UI no elige quién firma; solo manda
// qué se quiere hacer. Las escrituras (y leer condiciones comerciales) exigen `x-api-key`.

import { getApiKey } from "./apiKey.js";
import { translateError } from "./errorMessages.js";

// "/" (la API en el mismo origen, detrás del ingress) queda como "" y las rutas son /api/...
const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/+$/, "");

export const API_URL = BASE_URL || (typeof window !== "undefined" ? window.location.origin : "");

export class ApiError extends Error {
    constructor(message, { status = 0, raw = "" } = {}) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.raw = raw; // texto original del backend, útil para depurar
    }
}

async function request(path, { method = "GET", body } = {}) {
    const headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const key = getApiKey();
    if (key) headers["x-api-key"] = key;

    let response;
    try {
        response = await fetch(`${BASE_URL}${path}`, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    } catch {
        throw new ApiError(`No se pudo conectar con la API en ${API_URL}. ¿Está levantado el backend?`);
    }

    const text = await response.text();
    let data = null;
    let isJson = true;
    try {
        data = text === "" ? null : JSON.parse(text);
    } catch {
        isJson = false;
    }

    if (!response.ok) {
        const raw = isJson && data && typeof data.error === "string" ? data.error : "";
        throw new ApiError(translateError(response.status, raw), { status: response.status, raw });
    }
    if (!isJson) {
        // Pasa cuando algo que no es la API contesta en esa URL (por ejemplo nginx devolviendo index.html).
        throw new ApiError(`${API_URL} no respondió como la API de PharmaTrace.`, { status: response.status });
    }
    return data;
}

const enc = encodeURIComponent;
const post = (path, body = {}) => request(path, { method: "POST", body });

// ---- Salud ------------------------------------------------------------------------------------
// No usa /healthz: detrás de nginx (la imagen del UI) ese path lo contesta nginx aunque la API
// esté caída. En cambio GET /api/orgs/LabMSP lo contesta solo la API: 200 o 404 (todavía no
// registrada) quieren decir que la API y la red responden; 503, que la API está pero la red Fabric no.
export async function checkApi() {
    try {
        await request("/api/orgs/LabMSP");
        return { state: "ok" };
    } catch (error) {
        if (!(error instanceof ApiError)) return { state: "offline", message: String(error) };
        if (error.status === 404) return { state: "ok", orgsRegistered: false };
        if (error.status === 503) return { state: "ledger-down", message: error.message };
        if (error.status === 0 || error.status === 200) return { state: "offline", message: error.message };
        return { state: "error", message: error.message };
    }
}

// ---- Organizaciones ---------------------------------------------------------------------------
export const getOrg = (mspId) => request(`/api/orgs/${enc(mspId)}`);
export const listBatchesByOrg = (mspId) => request(`/api/orgs/${enc(mspId)}/batches`);
export const registerOrg = ({ mspId, role }) => post("/api/orgs", { mspId, role });

// ---- Lotes ------------------------------------------------------------------------------------
// batch: { id, gtin, product, lot, expiryDate, manufacturer, owner, pendingTo, state, cargo,
//          patientRef, recallReason, stateBefore, lastUpdatedAt, lastTxId }
export const getBatch = (batchId) => request(`/api/batches/${enc(batchId)}`);
// -> [{ txId, timestamp, isDelete, batch }] del más viejo al más nuevo
export const getBatchHistory = (batchId) => request(`/api/batches/${enc(batchId)}/history`);

export const registerBatch = ({ batchId, gtin, product, lot, expiryDate }) =>
    post("/api/batches", { batchId, gtin, product, lot, expiryDate });
export const dispatchBatch = ({ batchId, to }) => post(`/api/batches/${enc(batchId)}/dispatch`, { to });
export const receiveBatch = ({ batchId }) => post(`/api/batches/${enc(batchId)}/receive`);
export const dispenseBatch = ({ batchId, patientRef }) => post(`/api/batches/${enc(batchId)}/dispense`, { patientRef });
export const recallBatch = ({ batchId, reason }) => post(`/api/batches/${enc(batchId)}/recall`, { reason });

// ---- Condiciones comerciales (privadas entre vendedor y comprador) ------------------------------
export const setTerms = ({ batchId, buyer, unitPrice, currency, quantity }) =>
    request(`/api/batches/${enc(batchId)}/terms`, { method: "PUT", body: { buyer, unitPrice, currency, quantity } });
// leg: "manufacturer" | "distributor" (el rol del vendedor). as: MSP de quien lee.
export const readTerms = ({ batchId, leg, as }) =>
    request(`/api/batches/${enc(batchId)}/terms?leg=${enc(leg)}&as=${enc(as)}`);
// -> { matches: boolean }
export const verifyTerms = ({ batchId, leg, seller, buyer, unitPrice, currency, quantity }) =>
    post(`/api/batches/${enc(batchId)}/terms/verify`, { leg, seller, buyer, unitPrice, currency, quantity });

// ---- Cargamentos ------------------------------------------------------------------------------
// cargo: { id, owner, pendingTo, batchIds, state, createdAt, updatedAt }
export const getCargo = (cargoId) => request(`/api/cargo/${enc(cargoId)}`);
export const createCargo = ({ cargoId, batchIds }) => post("/api/cargo", { cargoId, batchIds });
export const dispatchCargo = ({ cargoId, to }) => post(`/api/cargo/${enc(cargoId)}/dispatch`, { to });
export const receiveCargo = ({ cargoId }) => post(`/api/cargo/${enc(cargoId)}/receive`);
export const dissolveCargo = ({ cargoId }) => post(`/api/cargo/${enc(cargoId)}/dissolve`);

// ---- Cadena de frío (valija IoT) --------------------------------------------------------------
// -> { cargoId, verdict, reason, deviceId, policy, startedAt, closed, excursionSeconds,
//      anchoredReadings, anchorCount, events[], pendingReadings, lastReading }
export const getColdChain = (cargoId) => request(`/api/iot/cargo/${enc(cargoId)}`);
// -> { cargoId, seq, anchorIndex, leaf, proof[], root, payload, signature, reading, verifiedOnLedger? }
export const getReadingProof = ({ cargoId, seq, verify = true }) =>
    request(`/api/iot/cargo/${enc(cargoId)}/proof/${enc(seq)}${verify ? "?verify=true" : ""}`);
export const getDevice = (deviceId) => request(`/api/iot/devices/${enc(deviceId)}`);

export const anchorReadings = ({ cargoId }) => post(`/api/iot/cargo/${enc(cargoId)}/anchor`);
export const closeMonitoring = ({ cargoId }) => post("/api/iot/monitoring/close", { cargoId });
export const startMonitoring = ({ cargoId, deviceId, policyId }) =>
    post("/api/iot/monitoring/start", { cargoId, deviceId, policyId });
// Temperaturas en centésimas de grado (2,00 °C = 200).
export const setPolicy = ({ policyId, minTemp, maxTemp, maxExcursionSeconds }) =>
    post("/api/iot/policies", { policyId, minTemp, maxTemp, maxExcursionSeconds });
export const registerDevice = ({ deviceId, pubKey, calibrationExpiry, org }) =>
    post("/api/iot/devices", { deviceId, pubKey, calibrationExpiry, ...(org ? { org } : {}) });
export const authorizeGateway = () => post("/api/iot/gateway/authorize");
