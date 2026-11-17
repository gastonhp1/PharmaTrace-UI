import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useOutletContext } from "react-router-dom";
import { Alert, Box, Button, Link, Paper, Stack, Typography } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import * as api from "../api.js";
import { daysToExpiry, formatExpiryShort, translateReason, whereIs } from "../domain.js";
import PageHeader from "../components/PageHeader.jsx";
import ErrorAlert from "../components/ErrorAlert.jsx";
import Section from "../components/Section.jsx";

const CHAIN = [
    { mspId: "LabMSP", label: "Laboratorio", does: "Elabora y registra los lotes" },
    { mspId: "DistMSP", label: "Droguería", does: "Distribuye a las farmacias" },
    { mspId: "FarmaMSP", label: "Farmacia", does: "Dispensa al paciente" },
];

const batchLink = (b) => `/batches/${encodeURIComponent(b.id)}`;

function Station({ org, registered, held, incoming }) {
    return (
        <Box sx={{ flex: 1, minWidth: 0, p: 2.5 }}>
            <Typography variant="h6" component="h3">
                {org.label}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                {org.does}
            </Typography>
            {registered === false ? (
                <Typography color="warning.main" sx={{ mt: 1.5, fontWeight: 600 }}>
                    Sin registrar en la red
                </Typography>
            ) : (
                <>
                    <Typography sx={{ mt: 1.5, fontFamily: (t) => t.typography.h4.fontFamily, fontSize: "2.25rem", fontWeight: 600, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                        {held ?? "–"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {held === 1 ? "lote en custodia" : "lotes en custodia"}
                        {incoming > 0 && `, ${incoming} en camino`}
                    </Typography>
                </>
            )}
        </Box>
    );
}

function BatchLine({ batch, detail, tone }) {
    return (
        <Box component="li" sx={{ py: 1.25, borderTop: 1, borderColor: "divider", "&:first-of-type": { borderTop: 0, pt: 0 } }}>
            <Link component={RouterLink} to={batchLink(batch)} underline="hover" sx={{ fontWeight: 600 }}>
                {batch.product}
            </Link>
            <Typography variant="body2" color="text.secondary">
                {batch.id}, lote {batch.lot}. {whereIs(batch)}.
            </Typography>
            <Typography variant="body2" sx={{ color: tone, fontWeight: 500 }}>
                {detail}
            </Typography>
        </Box>
    );
}

export default function Dashboard() {
    const { catalog } = useOutletContext();
    const batches = catalog.batches;
    const [registered, setRegistered] = useState({});
    const [error, setError] = useState(null);

    const loadOrgs = useCallback(async () => {
        setError(null);
        try {
            const entries = await Promise.all(
                CHAIN.map(async ({ mspId }) => {
                    try {
                        await api.getOrg(mspId);
                        return [mspId, true];
                    } catch (e) {
                        if (e.status === 404) return [mspId, false];
                        throw e;
                    }
                })
            );
            setRegistered(Object.fromEntries(entries));
        } catch (e) {
            setError(e);
        }
    }, []);
    useEffect(() => {
        loadOrgs();
    }, [loadOrgs]);

    const all = batches ?? [];
    const live = all.filter((b) => b.state !== "DISPENSED" && b.state !== "RECALLED");
    const recalled = all.filter((b) => b.state === "RECALLED");
    const quarantined = all.filter((b) => b.state === "QUARANTINED");
    const expiring = live
        .map((b) => ({ b, days: daysToExpiry(b.expiryDate) }))
        .filter(({ days }) => days !== null && days <= 90)
        .sort((x, y) => x.days - y.days);
    const missing = CHAIN.filter((o) => registered[o.mspId] === false);

    return (
        <>
            <PageHeader title="Panorama de la red" subtitle="Dónde está cada lote hoy, qué está en cuarentena, qué se retiró del mercado y qué está por vencer." />
            <ErrorAlert error={error || catalog.error} sx={{ mb: 2 }} />
            {missing.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Faltan organizaciones por registrar en la red: {missing.map((o) => `${o.label} (${o.mspId})`).join(", ")}. Las registra el regulador antes de operar.
                </Alert>
            )}

            <Paper variant="outlined" sx={{ mb: 1 }}>
                <Stack direction={{ xs: "column", md: "row" }} divider={<Box aria-hidden sx={{ display: "grid", placeItems: "center", color: "text.disabled", borderTop: { xs: 1, md: 0 }, borderColor: "divider", px: 1 }}><ArrowForwardIcon sx={{ transform: { xs: "rotate(90deg)", md: "none" }, my: { xs: 0.5, md: 0 } }} /></Box>}>
                    {CHAIN.map((org) => (
                        <Station
                            key={org.mspId}
                            org={org}
                            registered={registered[org.mspId]}
                            held={batches ? all.filter((b) => b.owner === org.mspId && b.state !== "DISPENSED").length : null}
                            incoming={all.filter((b) => b.pendingTo === org.mspId).length}
                        />
                    ))}
                </Stack>
            </Paper>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {batches ? `${all.length} lotes registrados en total, ${all.filter((b) => b.state === "DISPENSED").length} ya dispensados. ` : ""}
                El regulador (RegMSP) no tiene lotes: audita, autoriza y firma los retiros del mercado.
            </Typography>

            <Paper variant="outlined" sx={{ px: { xs: 2, sm: 3 } }}>
                <Section first title="En cuarentena" hint="Lotes que llegaron con la cadena de frío rota. No se mueven hasta que el regulador los libere o los retire.">
                    {quarantined.length === 0 ? (
                        <Typography color="text.secondary">No hay lotes en cuarentena.</Typography>
                    ) : (
                        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
                            {quarantined.map((b) => (
                                <BatchLine
                                    key={b.id}
                                    batch={b}
                                    tone="warning.main"
                                    detail={`Cargamento ${b.quarantineCargo}: ${translateReason(b.quarantineReason) || "cadena de frío rota"}`}
                                />
                            ))}
                        </Box>
                    )}
                </Section>
                <Section title="Retiros del mercado" hint="Lotes que el regulador sacó de circulación. No vuelven a cambiar de estado.">
                    {recalled.length === 0 ? (
                        <Typography color="text.secondary">No hay lotes retirados.</Typography>
                    ) : (
                        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
                            {recalled.map((b) => (
                                <BatchLine key={b.id} batch={b} tone="error.main" detail={`Motivo: ${b.recallReason || "sin especificar"}`} />
                            ))}
                        </Box>
                    )}
                </Section>
                <Section title="Próximos a vencer" hint="Lotes en circulación que vencen dentro de los próximos 90 días.">
                    {expiring.length === 0 ? (
                        <Typography color="text.secondary">Ningún lote en circulación vence en los próximos 90 días.</Typography>
                    ) : (
                        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
                            {expiring.map(({ b, days }) => (
                                <BatchLine
                                    key={b.id}
                                    batch={b}
                                    tone={days < 0 ? "error.main" : "warning.main"}
                                    detail={days < 0 ? `Vencido (${formatExpiryShort(b.expiryDate)})` : `Vence en ${days} ${days === 1 ? "día" : "días"} (${formatExpiryShort(b.expiryDate)})`}
                                />
                            ))}
                        </Box>
                    )}
                </Section>
            </Paper>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 3 }}>
                <Button component={RouterLink} to="/batches" variant="contained">
                    Abrir el vademécum de lotes
                </Button>
                <Button component={RouterLink} to="/register" variant="outlined">
                    Registrar un lote
                </Button>
            </Stack>
        </>
    );
}
