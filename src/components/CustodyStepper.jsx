import { Alert, Box, Link, Typography } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import { Link as RouterLink } from "react-router-dom";
import { CUSTODY_STEPS, custodyPosition, orgLabel, translateReason } from "../domain.js";

// Recorrido del lote: Laboratorio -> Droguería -> Farmacia -> Dispensado, como una línea con
// cuatro estaciones. El tramo en tránsito se dibuja punteado.
export default function CustodyStepper({ batch }) {
    const { active, pending } = custodyPosition(batch);
    const recalled = batch.state === "RECALLED";
    const dispensed = batch.state === "DISPENSED";
    const quarantined = batch.state === "QUARANTINED";
    const accent = recalled ? "error.main" : quarantined ? "warning.main" : "primary.main";
    const coldChainLink = batch.quarantineCargo && (
        <Link component={RouterLink} to={`/coldchain/${encodeURIComponent(batch.quarantineCargo)}`} color="inherit">
            cargamento {batch.quarantineCargo}
        </Link>
    );

    return (
        <>
            <Box component="ol" aria-label="Recorrido del lote" sx={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", listStyle: "none", m: 0, p: 0, mb: 2 }}>
                {CUSTODY_STEPS.map((step, i) => {
                    const done = i < active || dispensed;
                    const current = i === active && !dispensed;
                    const inTransitNext = pending && i === active + 1;
                    const reached = done || current;
                    return (
                        <Box component="li" key={step.key} aria-current={current ? "step" : undefined} sx={{ position: "relative", textAlign: "center", px: 0.5 }}>
                            {i > 0 && (
                                <Box
                                    aria-hidden
                                    sx={{
                                        position: "absolute",
                                        top: 13,
                                        right: "50%",
                                        width: "100%",
                                        borderTop: 2,
                                        borderTopStyle: inTransitNext ? "dashed" : "solid",
                                        borderColor: reached || inTransitNext ? accent : "divider",
                                    }}
                                />
                            )}
                            <Box
                                sx={{
                                    position: "relative",
                                    width: 28,
                                    height: 28,
                                    mx: "auto",
                                    borderRadius: "50%",
                                    display: "grid",
                                    placeItems: "center",
                                    border: 2,
                                    borderColor: reached ? accent : "divider",
                                    bgcolor: done ? accent : "background.paper",
                                    color: done ? "background.paper" : accent,
                                }}
                            >
                                {done ? <CheckIcon sx={{ fontSize: 16 }} /> : current && <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: accent }} />}
                            </Box>
                            <Typography variant="body2" sx={{ mt: 0.75, fontWeight: reached ? 600 : 400, color: reached ? "text.primary" : "text.secondary" }}>
                                {step.label}
                            </Typography>
                            {inTransitNext && (
                                <Typography variant="caption" color="text.secondary">
                                    falta recibir
                                </Typography>
                            )}
                        </Box>
                    );
                })}
            </Box>
            {pending && (
                <Alert severity="info" sx={{ mb: 1 }}>
                    En tránsito hacia {orgLabel(batch.pendingTo)}: falta que la reciba.
                </Alert>
            )}
            {recalled && (
                <Alert severity="error" sx={{ mb: 1 }}>
                    Retirado del mercado{batch.recallReason ? `: ${batch.recallReason}` : ""}. No puede cambiar de estado.
                </Alert>
            )}
            {quarantined && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                    En cuarentena: viajó en el {coldChainLink} y la cadena de frío se rompió
                    {batch.quarantineReason ? ` (${translateReason(batch.quarantineReason)})` : ""}. No se puede despachar ni dispensar hasta que el regulador lo libere o lo retire.
                </Alert>
            )}
            {!quarantined && !recalled && batch.releaseReason && (
                <Alert severity="info" sx={{ mb: 1 }}>
                    Estuvo en cuarentena por la cadena de frío del {coldChainLink} y el regulador lo liberó: {batch.releaseReason}
                </Alert>
            )}
        </>
    );
}
