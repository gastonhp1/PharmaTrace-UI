// Modelo de dominio de PharmaTrace en Fabric (espejo de fabric/chaincode/pharmatrace/contract/*.go).

// Organizaciones del consorcio. El rol sale del registro en la red (GET /api/orgs/:mspId);
// acá solo se fijan los nombres para mostrar.
export const ORGS = {
    LabMSP: { mspId: "LabMSP", role: "manufacturer", label: "Laboratorio", short: "Lab" },
    DistMSP: { mspId: "DistMSP", role: "distributor", label: "Droguería", short: "Dist" },
    FarmaMSP: { mspId: "FarmaMSP", role: "pharmacy", label: "Farmacia", short: "Farma" },
    RegMSP: { mspId: "RegMSP", role: "regulator", label: "Regulador", short: "Reg" },
};

export const ORG_LIST = Object.values(ORGS);
export const orgLabel = (mspId) => ORGS[mspId]?.label ?? mspId ?? "—";

export const ROLE_LABEL = {
    manufacturer: "Fabricante",
    distributor: "Droguería",
    pharmacy: "Farmacia",
    regulator: "Regulador",
};

// Cadena de custodia: Lab -> Dist -> Farma. Cada despacho va al siguiente rol.
export const NEXT_ORG = { LabMSP: "DistMSP", DistMSP: "FarmaMSP" };

// Tramo comercial según el rol del vendedor.
export const LEG_BY_OWNER = { LabMSP: "manufacturer", DistMSP: "distributor" };
export const LEG_LABEL = {
    manufacturer: "Laboratorio → Droguería",
    distributor: "Droguería → Farmacia",
};

export const BATCH_STATES = {
    REGISTERED: { label: "Registrado", color: "default" },
    IN_TRANSIT: { label: "En tránsito", color: "info" },
    IN_DISTRIBUTION: { label: "En droguería", color: "primary" },
    IN_PHARMACY: { label: "En farmacia", color: "secondary" },
    DISPENSED: { label: "Dispensado", color: "success" },
    RECALLED: { label: "Retirado", color: "error" },
};

export const CARGO_STATES = {
    OPEN: { label: "Abierto", color: "default" },
    IN_TRANSIT: { label: "En tránsito", color: "info" },
    DELIVERED: { label: "Entregado", color: "success" },
    DISSOLVED: { label: "Disuelto", color: "default" },
};

export const VERDICTS = {
    MONITORING: { label: "Monitoreando", color: "info" },
    COMPLIANT: { label: "Cumple", color: "success" },
    COMPROMISED: { label: "Comprometida", color: "error" },
};

export const batchStateLabel = (s) => BATCH_STATES[s]?.label ?? s;

// Pasos del recorrido feliz de un lote (el retiro y lo disperso se muestran aparte).
export const CUSTODY_STEPS = [
    { key: "LabMSP", label: "Laboratorio", hint: "Registrado" },
    { key: "DistMSP", label: "Droguería", hint: "En droguería" },
    { key: "FarmaMSP", label: "Farmacia", hint: "En farmacia" },
    { key: "DISPENSED", label: "Dispensado", hint: "Al paciente" },
];

// Paso activo (0..3) y si el último movimiento está pendiente de recepción.
export function custodyPosition(batch) {
    if (batch.state === "DISPENSED") return { active: 3, pending: false };
    const idx = { LabMSP: 0, DistMSP: 1, FarmaMSP: 2 }[batch.owner] ?? 0;
    return { active: idx, pending: Boolean(batch.pendingTo) };
}

// Lo que se puede hacer con un lote hoy. Es solo ayuda de UI: la regla real la aplica el chaincode.
export function batchActions(batch) {
    const done = batch.state === "DISPENSED" || batch.state === "RECALLED";
    const inCargo = Boolean(batch.cargo);
    return {
        inCargo,
        canDispatch: !done && !inCargo && !batch.pendingTo && Boolean(NEXT_ORG[batch.owner]),
        canReceive: !inCargo && Boolean(batch.pendingTo) && batch.state !== "DISPENSED",
        canDispense: batch.state === "IN_PHARMACY" && !batch.pendingTo && !inCargo,
        canRecall: !done,
        canSetTerms: !done && !batch.pendingTo && Boolean(LEG_BY_OWNER[batch.owner]),
    };
}

// ---- Formatos -----------------------------------------------------------------------------------

export function formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? iso
        : d.toLocaleString("es-AR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Grados Celsius -> "2,00 °C". La API de cadena de frío ya entrega °C (política y última lectura);
// solo las lecturas crudas de la prueba vienen en centésimas (tempCenti).
export const formatTemp = (celsius) =>
    celsius === null || celsius === undefined
        ? "—"
        : `${Number(celsius).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} °C`;

export const EVENT_LABEL = { LID_OPENED: "Tapa abierta", SHOCK: "Golpe detectado", SEAL_BROKEN: "Precinto roto" };

// "12 seconds out of range, the policy allows 5" / "seal broken at 1730000000" -> español
export function translateReason(reason) {
    if (!reason) return "";
    let m = /^(\d+) seconds out of range, the policy allows (\d+)$/.exec(reason);
    if (m) return `${formatDuration(Number(m[1]))} fuera de rango; la política tolera ${formatDuration(Number(m[2]))}`;
    m = /^seal broken at (\d+)$/.exec(reason);
    if (m) return `precinto roto el ${formatDateTime(new Date(Number(m[1]) * 1000).toISOString())}`;
    return reason;
}

// "2.5" o "2,5" -> 250 (centésimas); NaN si no es un número.
export function parseTempToCenti(text) {
    const n = Number(String(text).trim().replace(",", "."));
    return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

export function formatDuration(seconds) {
    if (!seconds) return "0 s";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h && `${h} h`, m && `${m} min`, !h && s && `${s} s`].filter(Boolean).join(" ");
}

// Días hasta el vencimiento (negativo = vencido).
export function daysToExpiry(iso) {
    if (!iso) return null;
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

export const shortHash = (hash, n = 8) => (hash && hash.length > n * 2 ? `${hash.slice(0, n)}…${hash.slice(-4)}` : hash || "—");

export const GTIN_RE = /^\d{8,14}$/;
export const PRICE_RE = /^\d+(\.\d{1,4})?$/;
export const CURRENCY_RE = /^[A-Z]{3}$/;
