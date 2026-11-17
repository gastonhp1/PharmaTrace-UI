import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Chip, CircularProgress, Link, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import * as api from "../api.js";
import { useAction } from "../hooks/useAction.js";
import { ORG_LIST, SEVERITY, formatDateTime, notificationText, orgLabel } from "../domain.js";
import PageHeader from "../components/PageHeader.jsx";
import ErrorAlert from "../components/ErrorAlert.jsx";

const REFRESH_MS = 15000;

function Notification({ n }) {
    const severity = SEVERITY[n.severity] ?? SEVERITY.info;
    return (
        <Box component="li" sx={{ display: "flex", gap: 2, py: 2, borderTop: 1, borderColor: "divider", "&:first-of-type": { borderTop: 0 } }}>
            <Box aria-hidden sx={{ width: 4, flexShrink: 0, borderRadius: 1, bgcolor: `${severity.color}.main` }} />
            <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: n.severity === "critical" ? 600 : 400 }}>{notificationText(n)}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    {severity.label} · {formatDateTime(n.at)} · para {n.orgs.map(orgLabel).join(", ")}
                </Typography>
                <Stack direction="row" spacing={1.5} useFlexGap sx={{ mt: 0.75, flexWrap: "wrap" }}>
                    {n.cargoId &&
                        (n.event === "CargoDispatched" ? (
                            <Link component={RouterLink} to={`/cargo/${encodeURIComponent(n.cargoId)}`} variant="body2">
                                Cargamento {n.cargoId}
                            </Link>
                        ) : (
                            <Link component={RouterLink} to={`/coldchain/${encodeURIComponent(n.cargoId)}`} variant="body2">
                                Cadena de frío de {n.cargoId}
                            </Link>
                        ))}
                    {(n.batchIds ?? []).slice(0, 5).map((id) => (
                        <Link key={id} component={RouterLink} to={`/batches/${encodeURIComponent(id)}`} variant="body2">
                            Lote {id}
                        </Link>
                    ))}
                    {(n.batchIds ?? []).length > 5 && (
                        <Typography variant="body2" color="text.secondary">
                            y {n.batchIds.length - 5} más
                        </Typography>
                    )}
                </Stack>
            </Box>
        </Box>
    );
}

// Lo que cada organización tiene que atender. Sale de los eventos del chaincode: el backend los
// escucha y guarda los que importan (retiros, cadena de frío rota, cuarentenas, envíos en camino).
export default function Notifications() {
    const [org, setOrg] = useState("");
    const [onlyCritical, setOnlyCritical] = useState(false);
    const [load, { loading, error, data }] = useAction(api.getNotifications);

    const refresh = useCallback(() => load({ org: org || undefined, severity: onlyCritical ? "critical" : undefined }), [load, org, onlyCritical]);
    useEffect(() => {
        refresh();
        const timer = setInterval(refresh, REFRESH_MS);
        return () => clearInterval(timer);
    }, [refresh]);

    return (
        <>
            <PageHeader
                title="Avisos"
                subtitle="Lo que pasó en la red y alguien tiene que atender: retiros del mercado, cadena de frío rota, lotes en cuarentena y envíos en camino."
                actions={
                    <Button startIcon={<RefreshIcon />} onClick={refresh} disabled={loading}>
                        Actualizar
                    </Button>
                }
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2, alignItems: { sm: "center" } }}>
                <TextField select size="small" label="Organización" value={org} onChange={(e) => setOrg(e.target.value)} sx={{ minWidth: 220 }}>
                    <MenuItem value="">Todas</MenuItem>
                    {ORG_LIST.map((o) => (
                        <MenuItem key={o.mspId} value={o.mspId}>
                            {o.label}
                        </MenuItem>
                    ))}
                </TextField>
                <Chip
                    label="Solo críticos"
                    color={onlyCritical ? "error" : "default"}
                    variant={onlyCritical ? "filled" : "outlined"}
                    onClick={() => setOnlyCritical((v) => !v)}
                    aria-pressed={onlyCritical}
                />
            </Stack>
            <ErrorAlert error={error} sx={{ mb: 2 }} />
            {loading && !data && <CircularProgress aria-label="Cargando" />}
            {data && (
                <Paper variant="outlined" sx={{ px: { xs: 2, sm: 3 } }}>
                    {data.length === 0 ? (
                        <Typography color="text.secondary" sx={{ py: 3 }}>
                            No hay avisos{org ? ` para ${orgLabel(org)}` : ""}. Aparecen acá cuando algo pasa en la red mientras el backend está escuchando.
                        </Typography>
                    ) : (
                        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
                            {data.map((n) => (
                                <Notification key={n.id} n={n} />
                            ))}
                        </Box>
                    )}
                </Paper>
            )}
        </>
    );
}
