import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Alert, Button, Card, CardActionArea, CardContent, Chip, Stack, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import AddBoxIcon from "@mui/icons-material/AddBoxOutlined";
import InventoryIcon from "@mui/icons-material/Inventory2Outlined";
import LocalShippingIcon from "@mui/icons-material/LocalShippingOutlined";
import AcUnitIcon from "@mui/icons-material/AcUnit";
import * as api from "../api.js";
import { ORG_LIST, ROLE_LABEL } from "../domain.js";
import PageHeader from "../components/PageHeader.jsx";
import ErrorAlert from "../components/ErrorAlert.jsx";

const SHORTCUTS = [
    { to: "/register", title: "Registrar lote", text: "El laboratorio da de alta un lote nuevo.", icon: AddBoxIcon },
    { to: "/batches", title: "Lotes", text: "Buscar, despachar, recibir, dispensar o retirar.", icon: InventoryIcon },
    { to: "/cargo", title: "Cargamentos", text: "Mover varios lotes juntos.", icon: LocalShippingIcon },
    { to: "/coldchain", title: "Cadena de frío", text: "Veredicto y pruebas de la valija IoT.", icon: AcUnitIcon },
];

// Una org consultada: { mspId, org|null, count|null }
async function loadOrg(mspId) {
    const base = ORG_LIST.find((o) => o.mspId === mspId);
    // El regulador no se registra en la red: es una identidad fija del chaincode (RegMSP).
    if (mspId === "RegMSP") return { ...base, org: { mspId, role: "regulator" }, count: null };
    let org = null;
    try {
        org = await api.getOrg(mspId);
    } catch (error) {
        if (error.status !== 404) throw error;
    }
    let count = null;
    if (org) count = ((await api.listBatchesByOrg(mspId)) ?? []).length;
    return { ...base, org, count };
}

export default function Dashboard() {
    const [orgs, setOrgs] = useState(null);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        setError(null);
        try {
            setOrgs(await Promise.all(ORG_LIST.map((o) => loadOrg(o.mspId))));
        } catch (e) {
            setError(e);
        }
    }, []);
    useEffect(() => {
        load();
    }, [load]);

    const missing = orgs?.filter((o) => !o.org) ?? [];

    return (
        <>
            <PageHeader title="Inicio" subtitle="Trazabilidad de medicamentos sobre Hyperledger Fabric: del laboratorio al paciente." />
            <ErrorAlert error={error} sx={{ mb: 2 }} />

            {missing.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Faltan organizaciones por registrar en la red: {missing.map((o) => o.mspId).join(", ")}. Las registra el regulador antes de operar.
                </Alert>
            )}

            <Typography variant="h6" sx={{ mb: 1.5 }}>
                Organizaciones
            </Typography>
            <Grid container spacing={2} sx={{ mb: 4 }}>
                {(orgs ?? ORG_LIST.map((o) => ({ ...o, loading: true }))).map((o) => (
                    <Grid key={o.mspId} size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card sx={{ height: "100%" }}>
                            <CardContent>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                    {o.label}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                                    {o.mspId}
                                </Typography>
                                <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap", rowGap: 1 }}>
                                    {o.loading ? (
                                        <Chip size="small" label="Consultando…" />
                                    ) : o.org ? (
                                        <>
                                            <Chip size="small" color="success" variant="outlined" label={ROLE_LABEL[o.org.role] ?? o.org.role} />
                                            {o.count !== null && <Chip size="small" label={`${o.count} ${o.count === 1 ? "lote" : "lotes"}`} />}
                                        </>
                                    ) : (
                                        <Chip size="small" color="warning" label="Sin registrar" />
                                    )}
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Typography variant="h6" sx={{ mb: 1.5 }}>
                Qué querés hacer
            </Typography>
            <Grid container spacing={2}>
                {SHORTCUTS.map((shortcut) => {
                    const Icon = shortcut.icon;
                    return (
                        <Grid key={shortcut.to} size={{ xs: 12, sm: 6 }}>
                            <Card>
                                <CardActionArea component={RouterLink} to={shortcut.to}>
                                    <CardContent sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                                        <Icon color="primary" fontSize="large" />
                                        <div>
                                            <Typography sx={{ fontWeight: 600 }}>{shortcut.title}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {shortcut.text}
                                            </Typography>
                                        </div>
                                    </CardContent>
                                </CardActionArea>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>
            <Button onClick={load} sx={{ mt: 3 }}>
                Actualizar
            </Button>
        </>
    );
}
