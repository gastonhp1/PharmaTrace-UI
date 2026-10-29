import { Box, Chip, Stack, Typography } from "@mui/material";
import { batchStateLabel, formatDateTime, orgLabel, shortHash } from "../domain.js";

// Qué pasó en cada versión del lote, a partir de la diferencia con la anterior.
function describe(entry, prev) {
    const b = entry.batch;
    if (entry.isDelete || !b) return "Eliminado";
    if (!prev?.batch) return `Registrado por ${orgLabel(b.manufacturer)}`;
    const p = prev.batch;
    if (b.state === "RECALLED") return `Retirado del mercado${b.recallReason ? `: ${b.recallReason}` : ""}`;
    if (b.state === "DISPENSED") return "Dispensado al paciente";
    if (b.pendingTo && b.pendingTo !== p.pendingTo) return `Despachado de ${orgLabel(b.owner)} a ${orgLabel(b.pendingTo)}`;
    if (b.owner !== p.owner) return `Recibido por ${orgLabel(b.owner)}`;
    if (b.cargo && b.cargo !== p.cargo) return `Agregado al cargamento ${b.cargo}`;
    if (!b.cargo && p.cargo) return `Salió del cargamento ${p.cargo}`;
    return `Estado: ${batchStateLabel(b.state)}`;
}

export default function BatchHistory({ history }) {
    if (!history?.length) return <Typography color="text.secondary">Sin movimientos registrados.</Typography>;
    const entries = [...history];
    return (
        <Stack component="ol" spacing={0} sx={{ listStyle: "none", m: 0, p: 0 }} aria-label="Historial del lote">
            {entries.map((entry, i) => {
                const last = i === entries.length - 1;
                return (
                    <Box component="li" key={entry.txId} sx={{ display: "flex", gap: 2, pb: last ? 0 : 2.5 }}>
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", pt: 0.5 }}>
                            <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: last ? "primary.main" : "divider", border: 2, borderColor: last ? "primary.main" : "text.disabled", flexShrink: 0 }} />
                            {!last && <Box sx={{ flexGrow: 1, width: 2, bgcolor: "divider", mt: 0.5 }} />}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 600 }}>{describe(entry, entries[i - 1])}</Typography>
                            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", alignItems: "center", rowGap: 0.5 }}>
                                <Typography variant="body2" color="text.secondary">
                                    {formatDateTime(entry.timestamp)}
                                </Typography>
                                <Chip size="small" variant="outlined" label={`tx ${shortHash(entry.txId, 6)}`} title={entry.txId} sx={{ fontFamily: "monospace" }} />
                            </Stack>
                        </Box>
                    </Box>
                );
            })}
        </Stack>
    );
}
