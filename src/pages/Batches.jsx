import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { Box, Button, Chip, CircularProgress, InputAdornment, Link, Paper, Stack, TextField, Typography } from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import * as api from "../api.js";
import { useAction } from "../hooks/useAction.js";
import { daysToExpiry, formatDate, formatDateTime, formatExpiryShort, formatUnits, hasQuantity, indexLetter, matchesBatch, orgLabel, shortHash, whereIs } from "../domain.js";
import PageHeader from "../components/PageHeader.jsx";
import ErrorAlert from "../components/ErrorAlert.jsx";
import StateChip from "../components/StateChip.jsx";
import ExpiryChip from "../components/ExpiryChip.jsx";
import CustodyStepper from "../components/CustodyStepper.jsx";
import BatchHistory from "../components/BatchHistory.jsx";
import BatchActions from "../components/BatchActions.jsx";
import TermsPanel from "../components/TermsPanel.jsx";
import RecordHeader from "../components/RecordHeader.jsx";
import Section from "../components/Section.jsx";

const TONE = { REGISTERED: "neutral", IN_TRANSIT: "transit", IN_DISTRIBUTION: "blue", IN_PHARMACY: "green", DISPENSED: "green", RECALLED: "red", QUARANTINED: "amber" };

// ---- Monografía de un lote ----------------------------------------------------------------------

function Datum({ label, children }) {
    return (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "200px minmax(0, 1fr)" }, columnGap: 2, py: 1, borderTop: 1, borderColor: "divider", "&:first-of-type": { borderTop: 0, pt: 0 } }}>
            <Typography component="dt" variant="body2" color="text.secondary">
                {label}
            </Typography>
            <Typography component="dd" sx={{ m: 0, overflowWrap: "anywhere" }}>
                {children || "—"}
            </Typography>
        </Box>
    );
}

const batchLink = (id) => `/batches/${encodeURIComponent(id)}`;

// Lo dividido de este lote y lo que se entregó a pacientes.
function UnitsPanel({ batch, splits, dispensations }) {
    const list = splits ?? [];
    const given = dispensations ?? [];
    return (
        <>
            {list.length === 0 ? (
                <Typography color="text.secondary">
                    No se dividió. {batch.quantity >= 2 ? "Quien lo tiene puede pasar unidades a un lote nuevo para mandarlas a otro destino." : ""}
                </Typography>
            ) : (
                <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }} aria-label="Lotes divididos de este">
                    {list.map((s) => (
                        <Box component="li" key={s.id} sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center", py: 1, borderTop: 1, borderColor: "divider", "&:first-of-type": { borderTop: 0, pt: 0 } }}>
                            <Link component={RouterLink} to={batchLink(s.id)} underline="hover" sx={{ fontWeight: 600 }}>
                                {s.id}
                            </Link>
                            <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
                                {formatUnits(s.quantity)}
                                {s.dispensed ? ` (y ${s.dispensed} dispensadas)` : ""}
                            </Typography>
                            <StateChip state={s.state} />
                            <Typography variant="body2" color="text.secondary">
                                {whereIs(s)}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            )}
            {given.length > 0 && (
                <>
                    <Typography variant="subtitle2" sx={{ mt: 2.5, mb: 0.5 }}>
                        Entregas a pacientes
                    </Typography>
                    <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }} aria-label="Dispensas">
                        {given.map((d) => (
                            <Box component="li" key={d.txId} sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, py: 0.5 }}>
                                <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums", minWidth: 110 }}>
                                    {d.quantity ? formatUnits(d.quantity) : "Lote entero"}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {formatDateTime(d.at)} · {orgLabel(d.pharmacy)} · paciente <code title={d.patientRef}>{shortHash(d.patientRef, 8)}</code>
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </>
            )}
        </>
    );
}

function BatchMonograph({ batchId }) {
    const { catalog } = useOutletContext();
    const reloadCatalog = catalog.reload;
    const [loadBatch, { loading, error, data: batch }, reset] = useAction(api.getBatch);
    const [loadHistory, historyState] = useAction(api.getBatchHistory);
    const [loadSplits, splitsState] = useAction(api.getBatchSplits);
    const [loadDispensations, dispensationsState] = useAction(api.getDispensations);

    const refresh = useCallback(async () => {
        const b = await loadBatch(batchId);
        if (b) {
            loadHistory(batchId);
            loadSplits(batchId);
            loadDispensations(batchId);
        }
    }, [batchId, loadBatch, loadHistory, loadSplits, loadDispensations]);

    useEffect(() => {
        reset();
        refresh();
    }, [refresh, reset]);

    if (loading && !batch) return <CircularProgress aria-label="Cargando" />;
    if (error) return <ErrorAlert error={error} />;
    if (!batch) return null;

    // El vencimiento ya va en el rótulo; el aviso aparte solo cuando está vencido o por vencer.
    const expiryAlert = batch.state !== "DISPENSED" && (daysToExpiry(batch.expiryDate) ?? 999) <= 90;

    return (
        <>
            <RecordHeader
                title={batch.product}
                tone={TONE[batch.state]}
                chips={
                    <>
                        <StateChip state={batch.state} />
                        {expiryAlert && <ExpiryChip date={batch.expiryDate} />}
                    </>
                }
                facts={[
                    { label: "Lote", value: batch.lot },
                    { label: "Vencimiento", value: formatExpiryShort(batch.expiryDate) },
                    { label: "GTIN", value: batch.gtin },
                    { label: "ID en la red", value: batch.id },
                ]}
            />

            <Paper variant="outlined" sx={{ mt: 2, px: { xs: 2, sm: 3 } }}>
                <Section first title="Recorrido" hint="Del laboratorio al paciente. Cada tramo se cierra cuando el destino recibe.">
                    <CustodyStepper batch={batch} />
                </Section>

                <Section title="Ficha del lote">
                    <Box component="dl" sx={{ m: 0 }}>
                        <Datum label="Elaborador">{orgLabel(batch.manufacturer)}</Datum>
                        <Datum label="Unidades">
                            {hasQuantity(batch) ? (
                                <>
                                    {formatUnits(batch.quantity)} en este lote
                                    {batch.dispensed > 0 && `, ${batch.dispensed} ya dispensadas`}
                                </>
                            ) : (
                                "Sin cantidad registrada (lote anterior a las cantidades): se mueve y se dispensa entero"
                            )}
                        </Datum>
                        {batch.parentId && (
                            <Datum label="Dividido del lote">
                                <Link component={RouterLink} to={batchLink(batch.parentId)} underline="hover">
                                    {batch.parentId}
                                </Link>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                    Si el regulador retira ese lote, este se retira con él.
                                </Typography>
                            </Datum>
                        )}
                        <Datum label="En custodia de">{orgLabel(batch.owner)}</Datum>
                        <Datum label="Ubicación">{whereIs(batch)}</Datum>
                        <Datum label="Vencimiento">{formatDate(batch.expiryDate)}</Datum>
                        <Datum label="Cargamento">
                            {batch.cargo ? (
                                <Link component={RouterLink} to={`/cargo/${encodeURIComponent(batch.cargo)}`} underline="hover">
                                    {batch.cargo}
                                </Link>
                            ) : (
                                "Viaja suelto"
                            )}
                        </Datum>
                        {batch.patientRef && (
                            <Datum label={batch.dispensed > 0 && batch.state !== "DISPENSED" ? "Última referencia de paciente" : "Referencia del paciente"}>
                                <code title={batch.patientRef}>{shortHash(batch.patientRef, 12)}</code>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                    Hash SHA-256: el dato original no se guarda en la cadena.
                                </Typography>
                            </Datum>
                        )}
                        <Datum label="Última actualización">{formatDateTime(batch.lastUpdatedAt)}</Datum>
                        {batch.lastTxId && (
                            <Datum label="Última transacción">
                                <code title={batch.lastTxId}>{shortHash(batch.lastTxId, 12)}</code>
                            </Datum>
                        )}
                    </Box>
                </Section>

                {hasQuantity(batch) && (
                    <Section title="Divisiones y entregas" hint="Lotes que salieron de este al dividirlo, y las unidades entregadas a pacientes.">
                        <ErrorAlert error={splitsState.error || dispensationsState.error} sx={{ mb: 2 }} />
                        <UnitsPanel batch={batch} splits={splitsState.data} dispensations={dispensationsState.data} />
                    </Section>
                )}

                <Section title="Acciones" hint="Las firma el backend con la identidad de la organización que corresponde.">
                    <BatchActions
                        batch={batch}
                        onChanged={() => {
                            refresh();
                            reloadCatalog();
                        }}
                    />
                </Section>

                <Section title="Condiciones comerciales" hint="Precio, moneda y cantidad de cada venta. Privadas entre vendedor y comprador; en la cadena pública queda solo su hash.">
                    <TermsPanel key={`${batch.id}-${batch.owner}`} batch={batch} />
                </Section>

                <Section title="Historial en la cadena" hint="Cada movimiento es una transacción registrada en el ledger.">
                    <ErrorAlert error={historyState.error} sx={{ mb: 2 }} />
                    {historyState.loading && !historyState.data ? <CircularProgress size={24} /> : <BatchHistory history={historyState.data} />}
                </Section>
            </Paper>
        </>
    );
}

// ---- Índice alfabético --------------------------------------------------------------------------

const FILTERS = [
    { key: "all", label: "Todos", test: () => true },
    { key: "live", label: "En circulación", test: (b) => b.state !== "DISPENSED" && b.state !== "RECALLED" },
    { key: "transit", label: "En tránsito", test: (b) => Boolean(b.pendingTo) },
    { key: "expiring", label: "Por vencer", test: (b) => b.state !== "DISPENSED" && b.state !== "RECALLED" && (daysToExpiry(b.expiryDate) ?? 999) <= 90 },
    { key: "quarantined", label: "En cuarentena", test: (b) => b.state === "QUARANTINED" },
    { key: "recalled", label: "Retirados", test: (b) => b.state === "RECALLED" },
    { key: "dispensed", label: "Dispensados", test: (b) => b.state === "DISPENSED" },
];

function IndexRow({ batch }) {
    return (
        <Box
            component="li"
            sx={{
                display: "grid",
                gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1fr) 150px 190px" },
                columnGap: 3,
                rowGap: 0.5,
                alignItems: "center",
                py: 1.5,
                borderTop: 1,
                borderColor: "divider",
            }}
        >
            <Box sx={{ minWidth: 0 }}>
                <Link component={RouterLink} to={`/batches/${encodeURIComponent(batch.id)}`} underline="hover" sx={{ fontFamily: (t) => t.typography.h6.fontFamily, fontWeight: 600, fontSize: "1.08rem" }}>
                    {batch.product}
                </Link>
                <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                    {batch.id}, GTIN {batch.gtin}
                </Typography>
            </Box>
            <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
                Lote {batch.lot}
                <br />
                Vto. {formatExpiryShort(batch.expiryDate)}
            </Typography>
            <Box>
                <StateChip state={batch.state} />
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                    {whereIs(batch)}
                </Typography>
            </Box>
        </Box>
    );
}

function BatchIndex() {
    const { catalog } = useOutletContext();
    const [params, setParams] = useSearchParams();
    const query = params.get("q") ?? "";
    const [filter, setFilter] = useState("all");

    const groups = useMemo(() => {
        const test = FILTERS.find((f) => f.key === filter).test;
        const visible = (catalog.batches ?? []).filter((b) => test(b) && matchesBatch(b, query));
        const byLetter = new Map();
        for (const b of visible) {
            const letter = indexLetter(b.product);
            if (!byLetter.has(letter)) byLetter.set(letter, []);
            byLetter.get(letter).push(b);
        }
        return [...byLetter.entries()].sort(([a], [b]) => a.localeCompare(b));
    }, [catalog.batches, filter, query]);

    const total = groups.reduce((n, [, list]) => n + list.length, 0);
    const setQuery = (value) => setParams(value ? { q: value } : {}, { replace: true });

    return (
        <>
            <PageHeader title="Vademécum de lotes" subtitle="Todos los lotes de la red, ordenados por producto. Entrá a uno para ver su ficha y su recorrido." />
            <ErrorAlert error={catalog.error} sx={{ mb: 2 }} />

            <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2, alignItems: { md: "center" } }}>
                <TextField
                    size="small"
                    label="Filtrar el índice"
                    placeholder="Producto, lote, GTIN o ID"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    sx={{ maxWidth: { md: 320 } }}
                    slotProps={{ input: { startAdornment: (<InputAdornment position="start"><FilterListIcon fontSize="small" /></InputAdornment>) } }}
                />
                <Stack direction="row" role="group" aria-label="Filtrar por estado" sx={{ flexWrap: "wrap", gap: 1 }}>
                    {FILTERS.map((f) => (
                        <Chip
                            key={f.key}
                            label={f.label}
                            clickable
                            color={filter === f.key ? "primary" : "default"}
                            variant={filter === f.key ? "filled" : "outlined"}
                            aria-pressed={filter === f.key}
                            onClick={() => setFilter(f.key)}
                        />
                    ))}
                </Stack>
            </Stack>

            {catalog.loading && !catalog.batches ? (
                <CircularProgress aria-label="Cargando" />
            ) : total === 0 ? (
                <Paper variant="outlined" sx={{ p: 3 }}>
                    <Typography sx={{ fontWeight: 600 }}>{catalog.batches?.length ? "Ningún lote coincide con el filtro." : "Todavía no hay lotes registrados."}</Typography>
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                        {catalog.batches?.length ? "Probá con otro texto o quitá el filtro de estado." : "El laboratorio registra el primero."}
                    </Typography>
                    {catalog.batches?.length ? (
                        <Button onClick={() => { setQuery(""); setFilter("all"); }}>Quitar filtros</Button>
                    ) : (
                        <Button component={RouterLink} to="/register" variant="contained">Registrar un lote</Button>
                    )}
                </Paper>
            ) : (
                <>
                    <Stack direction="row" component="nav" aria-label="Ir a una letra" sx={{ flexWrap: "wrap", gap: 0.5, mb: 1 }}>
                        {groups.map(([letter]) => (
                            <Button key={letter} size="small" href={`#letra-${letter}`} sx={{ minWidth: 36, fontFamily: (t) => t.typography.h6.fontFamily, fontSize: "1rem" }}>
                                {letter}
                            </Button>
                        ))}
                        <Typography variant="body2" color="text.secondary" sx={{ ml: "auto", alignSelf: "center" }}>
                            {total} {total === 1 ? "lote" : "lotes"}
                        </Typography>
                    </Stack>
                    <Paper variant="outlined" sx={{ px: { xs: 2, sm: 3 }, pb: 1 }}>
                        {groups.map(([letter, list]) => (
                            <Box key={letter} component="section" id={`letra-${letter}`} sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "56px minmax(0, 1fr)" }, scrollMarginTop: 140, borderTop: 1, borderColor: "divider", "&:first-of-type": { borderTop: 0 } }}>
                                <Typography component="h2" aria-label={`Letra ${letter}`} sx={{ fontFamily: (t) => t.typography.h4.fontFamily, fontSize: "2rem", fontWeight: 600, color: "primary.main", lineHeight: 1, pt: 2 }}>
                                    {letter}
                                </Typography>
                                <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, "& > li:first-of-type": { borderTop: { sm: 0 } } }}>
                                    {list.map((b) => (
                                        <IndexRow key={b.id} batch={b} />
                                    ))}
                                </Box>
                            </Box>
                        ))}
                    </Paper>
                </>
            )}
        </>
    );
}

export default function Batches() {
    const { batchId } = useParams();
    if (!batchId) return <BatchIndex />;
    return (
        <>
            <Button component={RouterLink} to="/batches" startIcon={<ArrowBackIcon />} sx={{ mb: 1.5, ml: -1 }}>
                Vademécum de lotes
            </Button>
            <BatchMonograph batchId={batchId} />
        </>
    );
}
