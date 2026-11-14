import { useCallback, useEffect, useState } from "react";
import * as api from "../api.js";

// Las tres orgs que pueden tener lotes en custodia. Un lote en tránsito sigue figurando con quien
// lo despachó, así que la unión de las tres listas es el catálogo completo, sin repetidos.
const HOLDERS = ["LabMSP", "DistMSP", "FarmaMSP"];

// Catálogo de todos los lotes de la red: { batches, loading, error, reload }.
export function useCatalog() {
    const [state, setState] = useState({ batches: null, loading: true, error: null });

    const reload = useCallback(async () => {
        setState((prev) => ({ ...prev, loading: true }));
        const results = await Promise.allSettled(HOLDERS.map((msp) => api.listBatchesByOrg(msp)));
        const ok = results.filter((r) => r.status === "fulfilled");
        if (ok.length === 0) {
            setState({ batches: null, loading: false, error: results[0].reason });
            return;
        }
        const batches = ok.flatMap((r) => r.value ?? []);
        batches.sort((a, b) => a.product.localeCompare(b.product, "es") || a.id.localeCompare(b.id));
        setState({ batches, loading: false, error: null });
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    return { ...state, reload };
}
