import { ACTORS } from "./config/actor-info.js";

// Estados de un lote, en el orden del enum `State` de DrugTracker.sol.
export const STATES = [
    { key: "Registered", label: "Registrado" },
    { key: "InDistribution", label: "En distribución" },
    { key: "InTransit", label: "En tránsito" },
    { key: "InPharmacy", label: "En farmacia" },
    { key: "Delivered", label: "Entregado" },
    { key: "InUse", label: "En uso" },
];

// Actores en el orden en que un lote viaja por la cadena.
// El índice de cada actor coincide con el estado que toma un lote al llegar a él
// (el contrato exige `newState == rol del receptor - 1`): Distribuidor -> 1, Depósito -> 2,
// Farmacia -> 3, Paciente -> 4. Un lote solo puede pasar al *siguiente* actor.
export const CHAIN = [
    { key: "laboratory", label: "Laboratorio" },
    { key: "distributor", label: "Distribuidor" },
    { key: "warehouse", label: "Depósito" },
    { key: "pharmacy", label: "Farmacia" },
    { key: "patient", label: "Paciente" },
].map((actor) => ({ ...actor, address: ACTORS[actor.key]?.address ?? "" }));

export const stateIndex = (stateKey) => STATES.findIndex((s) => s.key === stateKey);

export const stateLabel = (stateKey) => STATES.find((s) => s.key === stateKey)?.label ?? stateKey;

const sameAddress = (a, b) => Boolean(a) && Boolean(b) && a.toLowerCase() === b.toLowerCase();

// Posición del actor en la cadena, o -1 si la dirección no es de ningún actor conocido.
export const chainIndexOf = (address) => CHAIN.findIndex((actor) => sameAddress(actor.address, address));

export const actorOf = (address) => CHAIN.find((actor) => sameAddress(actor.address, address)) ?? null;

// Valor inicial del selector de destinatario: el siguiente actor de la cadena ("" si no hay).
export function defaultRecipient(ownerAddress) {
    const i = chainIndexOf(ownerAddress);
    return i >= 0 && i < CHAIN.length - 1 ? String(i + 1) : "";
}

export const shortAddress = (address) =>
    address && address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address ?? "";
