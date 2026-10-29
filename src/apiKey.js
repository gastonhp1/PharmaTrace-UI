import { useSyncExternalStore } from "react";

// Clave de API (header x-api-key) para las escrituras. Se carga en runtime desde el botón de la
// llave del menú y vive solo en esta pestaña (sessionStorage): no queda dentro del bundle ni en
// el repo. VITE_API_KEY sigue funcionando como valor por defecto para desarrollo local.

const STORAGE_KEY = "pharmatrace.apiKey";
const fallback = import.meta.env.VITE_API_KEY || "";
const listeners = new Set();

function readStored() {
    try {
        return window.sessionStorage.getItem(STORAGE_KEY) || "";
    } catch {
        return ""; // sin sessionStorage (modo privado, bloqueado): la clave dura lo que dure la página
    }
}

let stored = readStored();

export const getApiKey = () => stored || fallback;
export const hasEmbeddedApiKey = () => Boolean(fallback);

export function setApiKey(value) {
    stored = String(value || "").trim();
    try {
        if (stored) window.sessionStorage.setItem(STORAGE_KEY, stored);
        else window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        // nada que hacer: queda solo en memoria
    }
    listeners.forEach((listener) => listener());
}

const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

// true si hay una clave cargada (la que sea). Se re-renderiza cuando cambia.
export const useHasApiKey = () => useSyncExternalStore(subscribe, () => Boolean(getApiKey()));
