import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, MenuItem, Stack, TextField, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import SearchIcon from "@mui/icons-material/Search";
import * as api from "../api.js";
import { useAction } from "../hooks/useAction.js";
import { ORG_LIST, formatDate, formatDateTime, orgLabel, shortHash } from "../domain.js";
import PageHeader from "../components/PageHeader.jsx";
import ErrorAlert from "../components/ErrorAlert.jsx";
import StateChip from "../components/StateChip.jsx";
import ExpiryChip from "../components/ExpiryChip.jsx";
import CustodyStepper from "../components/CustodyStepper.jsx";
import BatchHistory from "../components/BatchHistory.jsx";
import BatchActions from "../components/BatchActions.jsx";
import BatchTable from "../components/BatchTable.jsx";
import TermsPanel from "../components/TermsPanel.jsx";
import { Link as RouterLink } from "react-router-dom";

function Field({ label, children }) {
    return (
        <Box>
            <Typography variant="caption" color="text.secondary">
                {label}
            </Typography>
            <Typography component="div" sx={{ wordBreak: "break-word" }}>
                {children || "—"}
            </Typography>
        </Box>
    );
}

function BatchDetail({ batchId }) {
    const [loadBatch, { loading, error, data: batch }, reset] = useAction(api.getBatch);
    const [loadHistory, historyState] = useAction(api.getBatchHistory);

    const refresh = useCallback(async () => {
        const b = await loadBatch(batchId);
        if (b) loadHistory(batchId);
    }, [batchId, loadBatch, loadHistory]);

    useEffect(() => {
        reset();
        refresh();
    }, [refresh, reset]);

    if (loading && !batch) return <CircularProgress aria-label="Cargando" />;
    if (error) return <ErrorAlert error={error} />;
    if (!batch) return null;

    return (
        <Stack spacing={3}>
            <Card>
                <CardContent>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1, mb: 2 }}>
                        <Typography variant="h5" component="h2" sx={{ mr: 1 }}>
                            {batch.product}
                        </Typography>
                        <StateChip state={batch.state} />
                        <ExpiryChip date={batch.expiryDate} />
                    </Stack>
                    <CustodyStepper batch={batch} />
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <Field label="ID del lote">{batch.id}</Field>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <Field label="Número de lote">{batch.lot}</Field>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <Field label="GTIN">{batch.gtin}</Field>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <Field label="Vencimiento">{formatDate(batch.expiryDate)}</Field>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <Field label="Fabricante">{orgLabel(batch.manufacturer)}</Field>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <Field label="Dueño actual">{orgLabel(batch.owner)}</Field>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <Field label="Cargamento">
                                {batch.cargo ? (
                                    <RouterLink to={`/cargo/${encodeURIComponent(batch.cargo)}`}>{batch.cargo}</RouterLink>
                                ) : null}
                            </Field>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <Field label="Última actualización">{formatDateTime(batch.lastUpdatedAt)}</Field>
                        </Grid>
                        {batch.patientRef && (
                            <Grid size={{ xs: 12 }}>
                                <Field label="Referencia del paciente (hash SHA-256)">
                                    <code title={batch.patientRef}>{shortHash(batch.patientRef, 12)}</code>
                                </Field>
                            </Grid>
                        )}
                        {batch.lastTxId && (
                            <Grid size={{ xs: 12 }}>
                                <Field label="Última transacción">
                                    <code title={batch.lastTxId}>{shortHash(batch.lastTxId, 12)}</code>
                                </Field>
                            </Grid>
                        )}
                    </Grid>
                </CardContent>
            </Card>

            <BatchActions batch={batch} onChanged={refresh} />
            <TermsPanel key={`${batch.id}-${batch.owner}`} batch={batch} />

            <Card>
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        Historial en la cadena
                    </Typography>
                    <ErrorAlert error={historyState.error} sx={{ mb: 2 }} />
                    {historyState.loading && !historyState.data ? <CircularProgress size={24} /> : <BatchHistory history={historyState.data} />}
                </CardContent>
            </Card>
        </Stack>
    );
}

function BatchBrowser() {
    const [org, setOrg] = useState("LabMSP");
    const [list, { loading, error, data }] = useAction(api.listBatchesByOrg);
    useEffect(() => {
        list(org);
    }, [org, list]);

    return (
        <Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2, alignItems: { sm: "center" } }}>
                <TextField select label="Lotes en poder de" value={org} onChange={(e) => setOrg(e.target.value)} sx={{ maxWidth: { sm: 320 } }}>
                    {ORG_LIST.filter((o) => o.mspId !== "RegMSP").map((o) => (
                        <MenuItem key={o.mspId} value={o.mspId}>
                            {o.label} · {o.mspId}
                        </MenuItem>
                    ))}
                </TextField>
                {data && <Chip label={`${data.length} ${data.length === 1 ? "lote" : "lotes"}`} />}
                <Button onClick={() => list(org)} disabled={loading}>
                    Actualizar
                </Button>
            </Stack>
            <ErrorAlert error={error} sx={{ mb: 2 }} />
            {loading && !data ? <CircularProgress aria-label="Cargando" /> : <BatchTable batches={data ?? []} empty={`${orgLabel(org)} no tiene lotes en este momento.`} />}
            <Alert severity="info" sx={{ mt: 2 }}>
                Un lote en tránsito sigue figurando con quien lo despachó hasta que el destino lo recibe.
            </Alert>
        </Box>
    );
}

export default function Batches() {
    const { batchId } = useParams();
    const navigate = useNavigate();
    const [query, setQuery] = useState(batchId ?? "");
    useEffect(() => setQuery(batchId ?? ""), [batchId]);

    return (
        <>
            <PageHeader title="Lotes" subtitle="Consultá un lote por su ID o mirá qué tiene cada organización." />
            <Stack
                component="form"
                direction="row"
                spacing={1.5}
                sx={{ mb: 3, maxWidth: 560 }}
                onSubmit={(e) => {
                    e.preventDefault();
                    const id = query.trim();
                    navigate(id ? `/batches/${encodeURIComponent(id)}` : "/batches");
                }}
            >
                <TextField label="Buscar lote por ID" value={query} onChange={(e) => setQuery(e.target.value)} />
                <Button type="submit" variant="contained" startIcon={<SearchIcon />} sx={{ minWidth: 120 }}>
                    Buscar
                </Button>
            </Stack>
            {batchId ? <BatchDetail batchId={batchId} /> : <BatchBrowser />}
        </>
    );
}
