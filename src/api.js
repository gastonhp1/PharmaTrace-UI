// Cliente de la API REST del backend de PharmaTrace (backend/server.js).
//
// Todos los errores del backend llegan como `{ "error": "<motivo>" }` con un código HTTP 4xx/5xx,
// así que acá se convierten en una excepción `ApiError`: quien llama nunca tiene que revisar
// `response.ok` ni adivinar si una operación salió bien.

const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/+$/, "");
const API_KEY = import.meta.env.VITE_API_KEY || "";

export const API_URL = BASE_URL;

// Motivos de revert de los contratos (ver backend/utils/errors.js) -> mensaje para la persona.
const MESSAGES = {
    "Drug does not exist.": "El lote no existe.",
    "You are not the current owner.": "Quien firma no es el dueño actual del lote.",
    "Only the contract owner can perform this action.": "Solo el dueño del contrato (el laboratorio) puede hacer esto.",
    "Drug already registered.": "Ya existe un lote con ese ID.",
    "Invalid state transition.": "Transición de estado inválida: el lote no puede retroceder.",
    "Invalid recipient address.": "La dirección de destino no es válida.",
    "Invalid recipient role": "El destinatario no es el siguiente actor de la cadena.",
    "State does not match recipient role": "El estado no coincide con el rol del destinatario.",
    "Drug is in a cargo": "El lote está dentro de un cargamento: se mueve junto con el cargamento.",
    "Drug is already in a cargo": "El lote ya está en un cargamento.",
    "Drug is not in a cargo": "El lote no está en un cargamento.",
    "Drug must be delivered first": "El lote tiene que estar entregado antes de marcarlo en uso.",
    "Only patients can mark a drug as in use": "Solo un paciente puede marcar el lote en uso.",
    "Cargo not found": "El cargamento no existe.",
    "Cargo does not exist": "El cargamento no existe.",
    "Only owner can transfer": "Solo el dueño actual puede transferir el cargamento.",
    "Only current owner can mark delivered": "Solo el dueño actual puede marcar el cargamento como entregado.",
    "Sender does not own all drugs": "Quien firma no es dueño de todos los lotes del cargamento.",
    "Cargo already exists": "Ya existe un cargamento con ese ID.",
    "Cargo already delivered": "El cargamento ya fue entregado.",
    "Cargo must have at least one drug": "El cargamento necesita al menos un lote.",
    "Too many drugs in a cargo": "Demasiados lotes en un cargamento (máximo 100).",
    "All batches in a cargo must have the same current owner":
        "Todos los lotes del cargamento tienen que tener el mismo dueño actual.",
};

export class ApiError extends Error {
    constructor(message, { status = 0, raw = message } = {}) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.raw = raw; // texto original del backend, útil para depurar
    }
}

function friendlyMessage(status, raw) {
    if (MESSAGES[raw]) return MESSAGES[raw];
    if (raw?.startsWith("No signing key is configured")) {
        return "El backend no tiene configurada la clave del dueño actual (revisá las *_KEY de backend/.env).";
    }
    if (status === 401) return "El backend exige la clave de API (x-api-key). Configurá VITE_API_KEY en .env.";
    if (status === 503) return "El backend no tiene API_KEY configurada.";
    if (status >= 500) return `${raw || `Error ${status}`}. Es un error inesperado del backend: reintentá y, si sigue, mirá su log.`;
    return raw || `Error ${status}`;
}

async function request(path, { method = "GET", body } = {}) {
    const headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (API_KEY) headers["x-api-key"] = API_KEY;

    let response;
    try {
        response = await fetch(`${BASE_URL}${path}`, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    } catch {
        throw new ApiError(`No se pudo conectar con la API en ${BASE_URL}. ¿Está levantado el backend?`);
    }

    let data = null;
    try {
        data = await response.json();
    } catch {
        // respuesta sin cuerpo JSON
    }

    if (!response.ok) {
        const raw = data?.error ?? "";
        throw new ApiError(friendlyMessage(response.status, raw), { status: response.status, raw });
    }
    return data;
}

const enc = encodeURIComponent;

// ---- Salud -----------------------------------------------------------------------------------
// GET / responde con texto plano si el backend está arriba.
export async function pingApi() {
    try {
        const response = await fetch(`${BASE_URL}/`);
        return response.ok;
    } catch {
        return false;
    }
}

// ---- Lotes -----------------------------------------------------------------------------------
// -> { name, manufacturer, productionDate, currentState, currentOwner, inCargo, history[] }
export const traceDrug = (batchId) => request(`/api/drug/${enc(batchId)}`);

export const registerDrug = ({ batchId, drugName, manufacturer }) =>
    request("/api/register", { method: "POST", body: { batchId, drugName, manufacturer } });

export const transferDrug = ({ batchId, toAddress, newState }) =>
    request("/api/transfer", { method: "POST", body: { batchId, toAddress, newState } });

export const markInUse = (batchId) => request("/api/mark-in-use", { method: "POST", body: { batchId } });

// ---- Cargamentos -----------------------------------------------------------------------------
// -> { cargoId, batchIds[], createdBy, currentOwner, createdAt (ISO), delivered }
export const getCargo = (cargoId) => request(`/api/cargo/${enc(cargoId)}`);

export const createCargo = ({ cargoId, batchIds }) =>
    request("/api/cargo/create", { method: "POST", body: { cargoId, batchIds } });

export const transferCargo = ({ cargoId, toAddress, newState }) =>
    request("/api/cargo/transfer", { method: "POST", body: { cargoId, toAddress, newState } });

export const deliverCargo = (cargoId) => request("/api/cargo/deliver", { method: "POST", body: { cargoId } });
