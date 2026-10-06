import { useCallback, useState } from "react";

const IDLE = { loading: false, error: null, data: null };

// Envuelve una función async de la API y expone { loading, error, data }.
//
//   const [run, { loading, error, data }, reset] = useAction(api.traceDrug);
//
// `run(...args)` devuelve el resultado, o `null` si falló (el error queda en `error`).
// Mientras carga conserva el `data` anterior para que la pantalla no parpadee al refrescar.
export function useAction(fn) {
    const [state, setState] = useState(IDLE);

    const run = useCallback(
        async (...args) => {
            setState((prev) => ({ ...prev, loading: true, error: null }));
            try {
                const data = await fn(...args);
                setState({ loading: false, error: null, data });
                return data;
            } catch (error) {
                setState({ loading: false, error, data: null });
                return null;
            }
        },
        [fn]
    );

    const reset = useCallback(() => setState(IDLE), []);

    return [run, state, reset];
}
