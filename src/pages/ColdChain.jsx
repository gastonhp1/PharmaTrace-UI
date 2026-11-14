import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import {
    Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip, CircularProgress, Link, Paper, Stack, TextField, Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import * as api from "../api.js";
import { useAction } from "../hooks/useAction.js";
import { EVENT_LABEL, formatDateTime, formatDuration, formatTemp, parseTempToCenti, translateReason } from "../domain.js";
import PageHeader from "../components/PageHeader.jsx";
import ErrorAlert from "../components/ErrorAlert.jsx";
import StateChip from "../components/StateChip.jsx";
import RecordHeader from "../components/RecordHeader.jsx";
import Section from "../components/Section.jsx";
import SubmitButton from "../components/SubmitButton.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

function Stat({ label, children }) {
    return (
        <Box>
            <Typography variant="caption" color="text.secondary">
                {label}
            </Typography>
            <Typography component="div" sx={{ wordBreak: "break-word" }}>
                {children ?? "—"}
            </Typography>
        </Box>
    );
}

function ProofLookup({ cargoId, anchored }) {
    const [seq, setSeq] = useState("");
    const [lookup, { loading, error, data }] = useAction(api.getReadingProof);
    const seqOk = /^\d+$/.test(seq);
    return (
        <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: "70ch" }}>
                Cada lectura firmada por la valija queda anclada en la cadena dentro de un árbol de Merkle. Con su número se pide la prueba y se verifica contra lo anclado.
                {anchored ? ` Hay ${anchored} lecturas ancladas.` : ""}
            </Typography>
            <Stack
                component="form"
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                onSubmit={(e) => {
                    e.preventDefault();
                    lookup({ cargoId, seq: Number(seq), verify: true });
                }}
            >
                <TextField label="Número de lectura (seq)" value={seq} onChange={(e) => setSeq(e.target.value)} inputMode="numeric" error={seq !== "" && !seqOk} sx={{ maxWidth: { sm: 280 } }} />
                <Box>
                    <SubmitButton loading={loading} disabled={!seqOk} sx={{ minWidth: 140, height: 56 }}>
                        Verificar
                    </SubmitButton>
                </Box>
            </Stack>
            <ErrorAlert error={error} sx={{ mt: 2 }} />
            {data && (
                <Stack spacing={1.5} sx={{ mt: 2 }}>
                    <Alert severity={data.verifiedOnLedger ? "success" : "error"}>
                        {data.verifiedOnLedger
                            ? `La lectura ${data.seq} está anclada en la cadena (ancla ${data.anchorIndex}) y su prueba es válida.`
                            : `La prueba de la lectura ${data.seq} NO coincide con lo anclado.`}
                    </Alert>
                    {data.reading && (
                        <Typography variant="body2">
                            {formatDateTime(new Date(data.reading.ts * 1000).toISOString())}, {formatTemp(data.reading.tempCenti / 100)}, {data.reading.humCenti / 100} % de humedad
                            {data.reading.flags & 0x04 ? ", precinto roto" : ""}
                            {data.reading.flags & 0x01 ? ", tapa abierta" : ""}
                            {data.reading.flags & 0x02 ? ", golpe" : ""}
                        </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all" }}>
                        Raíz: <code>{data.root}</code>
                        <br />
                        Hoja: <code>{data.leaf}</code> ({data.proof?.length ?? 0} pasos de prueba)
                    </Typography>
                </Stack>
            )}
        </>
    );
}

// Termómetro horizontal: la banda verde es el rango de la política y la marca, la última lectura.
function TempGauge({ value, min, max }) {
    const span = max - min;
    const lo = min - span * 0.75;
    const hi = max + span * 0.75;
    const pct = (v) => `${Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100))}%`;
    const inRange = value >= min && value <= max;
    return (
        <Box role="img" aria-label={`Última lectura ${formatTemp(value)}; rango permitido de ${formatTemp(min)} a ${formatTemp(max)}`} sx={{ maxWidth: 520 }}>
            <Box sx={{ position: "relative", height: 14, borderRadius: 7, bgcolor: "action.hover", border: 1, borderColor: "divider" }}>
                <Box sx={{ position: "absolute", top: 0, bottom: 0, left: pct(min), right: `calc(100% - ${pct(max)})`, bgcolor: "success.main", opacity: 0.35 }} />
                <Box sx={{ position: "absolute", top: -5, bottom: -5, left: pct(value), width: 4, ml: "-2px", borderRadius: 2, bgcolor: inRange ? "success.main" : "error.main" }} />
            </Box>
            <Box sx={{ position: "relative", height: 20, mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ position: "absolute", left: pct(min), transform: "translateX(-50%)", whiteSpace: "nowrap" }}>
                    {formatTemp(min)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ position: "absolute", left: pct(max), transform: "translateX(-50%)", whiteSpace: "nowrap" }}>
                    {formatTemp(max)}
                </Typography>
            </Box>
        </Box>
    );
}

function Status({ cargoId }) {
    const [load, { loading, error, data: s }, reset] = useAction(api.getColdChain);
    const [anchor, anchorState] = useAction(api.anchorReadings);
    const [close, closeState] = useAction(api.closeMonitoring);
    const [notice, setNotice] = useState("");
    const [confirmClose, setConfirmClose] = useState(false);

    const refresh = useCallback(() => load(cargoId), [cargoId, load]);
    useEffect(() => {
        reset();
        setNotice("");
        refresh();
    }, [refresh, reset]);

    if (loading && !s) return <CircularProgress aria-label="Cargando" />;
    if (error) return <ErrorAlert error={error} />;
    if (!s) return null;

    const last = s.lastReading;
    const busy = anchorState.loading || closeState.loading;
    const act = async (promise, message) => {
        if (await promise) {
            setNotice(message);
            refresh();
        }
    };
    const tone = { MONITORING: "transit", COMPLIANT: "green", COMPROMISED: "red" }[s.verdict];
    const lastInRange = last && s.policy ? last.tempC >= s.policy.minTempC && last.tempC <= s.policy.maxTempC : true;

    return (
        <>
            {/* Fuera de la sección de acciones: al cerrar el monitoreo esa sección desaparece. */}
            {notice && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice("")}>
                    {notice}
                </Alert>
            )}
            <RecordHeader
                title={`Cadena de frío de ${s.cargoId}`}
                tone={tone}
                chips={
                    <>
                        <StateChip kind="verdict" state={s.verdict} />
                        {s.closed && <Chip size="small" variant="outlined" label="Monitoreo cerrado" />}
                    </>
                }
                facts={[
                    { label: "Valija", value: s.deviceId },
                    { label: "Política", value: s.policy?.id },
                    { label: "Rango permitido", value: s.policy ? `${formatTemp(s.policy.minTempC)} a ${formatTemp(s.policy.maxTempC)}` : null },
                    { label: "Inicio", value: formatDateTime(s.startedAt) },
                ]}
            />

            <Paper variant="outlined" sx={{ mt: 2, px: { xs: 2, sm: 3 } }}>
                <Section first title="Veredicto">
                    {s.verdict === "COMPROMISED" && <Alert severity="error">Cadena de frío comprometida: {translateReason(s.reason) || "sin detalle"}</Alert>}
                    {s.verdict === "COMPLIANT" && <Alert severity="success">El cargamento cumplió la política durante todo el recorrido.</Alert>}
                    {s.verdict === "MONITORING" && <Alert severity="info">En monitoreo: hasta ahora cumple la política. El veredicto queda firme al cerrar.</Alert>}
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <Stat label="Tiempo fuera de rango">{formatDuration(s.excursionSeconds)}</Stat>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <Stat label="Tolerado por la política">{s.policy ? formatDuration(s.policy.maxExcursionSeconds) : null}</Stat>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <Stat label="Lecturas ancladas">{s.anchoredReadings}</Stat>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <Stat label="Pendientes de anclar">{s.pendingReadings}</Stat>
                        </Grid>
                    </Grid>
                    <Box sx={{ mt: 2 }}>
                        <Link component={RouterLink} to={`/cargo/${encodeURIComponent(s.cargoId)}`} underline="hover">
                            Ver el cargamento {s.cargoId}
                        </Link>
                    </Box>
                </Section>

                {last && (
                    <Section title="Última lectura" hint={`Lectura número ${last.seq}, tomada el ${formatDateTime(last.timestamp)}`}>
                        <Typography sx={{ fontFamily: (t) => t.typography.h4.fontFamily, fontSize: "2.5rem", fontWeight: 600, lineHeight: 1, mb: 1.5, color: lastInRange ? "text.primary" : "error.main", fontVariantNumeric: "tabular-nums" }}>
                            {formatTemp(last.tempC)}
                        </Typography>
                        {s.policy && <TempGauge value={last.tempC} min={s.policy.minTempC} max={s.policy.maxTempC} />}
                        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, mt: 1.5 }}>
                            {last.humidityPct !== undefined && <Chip size="small" variant="outlined" label={`Humedad ${last.humidityPct} %`} />}
                            <Chip size="small" color={last.sealBroken ? "error" : "success"} variant="outlined" label={last.sealBroken ? "Precinto roto" : "Precinto íntegro"} />
                            <Chip size="small" color={last.lidOpened ? "warning" : "default"} variant="outlined" label={last.lidOpened ? "Tapa abierta" : "Tapa cerrada"} />
                            <Chip size="small" color={last.shock ? "warning" : "default"} variant="outlined" label={last.shock ? "Golpe detectado" : "Sin golpes"} />
                        </Stack>
                    </Section>
                )}

                {s.events?.length > 0 && (
                    <Section title="Eventos" hint="Avisos de la valija que quedaron registrados en la cadena.">
                        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
                            {s.events.map((ev, i) => (
                                <Typography component="li" key={i} sx={{ py: 0.75, borderTop: i ? 1 : 0, borderColor: "divider" }}>
                                    <Box component="span" sx={{ fontWeight: 600 }}>
                                        {EVENT_LABEL[ev.kind] ?? ev.kind}
                                    </Box>{" "}
                                    <Box component="span" sx={{ color: "text.secondary" }}>
                                        {formatDateTime(new Date(ev.timestamp * 1000).toISOString())}
                                    </Box>
                                </Typography>
                            ))}
                        </Box>
                    </Section>
                )}

                {!s.closed && (
                    <Section title="Acciones">
                        <ErrorAlert error={anchorState.error || closeState.error} sx={{ mb: 2 }} />
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                            <Button variant="outlined" disabled={busy || !s.pendingReadings} onClick={() => act(anchor({ cargoId: s.cargoId }), "Lecturas ancladas en la cadena.")}>
                                Anclar lecturas pendientes ({s.pendingReadings})
                            </Button>
                            <Button variant="contained" color="primary" disabled={busy} onClick={() => setConfirmClose(true)}>
                                Cerrar monitoreo
                            </Button>
                        </Stack>
                    </Section>
                )}

                <Section title="Prueba de una lectura">
                    <ProofLookup cargoId={s.cargoId} anchored={s.anchoredReadings} />
                </Section>
            </Paper>

            <ConfirmDialog
                open={confirmClose}
                title="¿Cerrar el monitoreo?"
                text="Ancla lo que quede pendiente y fija el veredicto. Después de cerrar no se puede reabrir ni agregar lecturas."
                confirmLabel="Cerrar monitoreo"
                onClose={() => setConfirmClose(false)}
                onConfirm={() => {
                    setConfirmClose(false);
                    act(close({ cargoId: s.cargoId }), "Monitoreo cerrado: el veredicto es definitivo.");
                }}
            />
        </>
    );
}

function Setup({ onStarted }) {
    const [policy, setPolicy] = useState({ policyId: "", min: "2", max: "8", excursion: "1800" });
    const [monitor, setMonitor] = useState({ cargoId: "", deviceId: "", policyId: "" });
    const [device, setDevice] = useState({ deviceId: "", pubKey: "", calibrationExpiry: "", org: "" });
    const [notice, setNotice] = useState("");

    const [savePolicy, policyState] = useAction(api.setPolicy);
    const [start, startState] = useAction(api.startMonitoring);
    const [saveDevice, deviceState] = useAction(api.registerDevice);
    const [authorize, authState] = useAction(api.authorizeGateway);

    const min = parseTempToCenti(policy.min);
    const max = parseTempToCenti(policy.max);
    const policyOk = policy.policyId.trim() && Number.isFinite(min) && Number.isFinite(max) && min < max && /^\d+$/.test(policy.excursion);
    const pubKeyOk = /^[0-9a-fA-F]{128}$/.test(device.pubKey.trim());
    const calibration = device.calibrationExpiry ? Math.floor(new Date(`${device.calibrationExpiry}T23:59:59Z`).getTime() / 1000) : NaN;
    const deviceOk = device.deviceId.trim() && pubKeyOk && Number.isFinite(calibration);

    return (
        <Stack spacing={1}>
            <Typography variant="h6" sx={{ mb: 1 }}>
                Configuración (operador)
            </Typography>
            {notice && (
                <Alert severity="success" onClose={() => setNotice("")}>
                    {notice}
                </Alert>
            )}

            <Accordion variant="outlined" disableGutters>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>Iniciar monitoreo de un cargamento</AccordionSummary>
                <AccordionDetails>
                    <Stack
                        component="form"
                        spacing={2}
                        onSubmit={async (e) => {
                            e.preventDefault();
                            const ok = await start({ cargoId: monitor.cargoId.trim(), deviceId: monitor.deviceId.trim(), policyId: monitor.policyId.trim() });
                            if (ok) {
                                setNotice(`Monitoreo iniciado para ${monitor.cargoId.trim()}.`);
                                onStarted(monitor.cargoId.trim());
                            }
                        }}
                    >
                        <ErrorAlert error={startState.error} />
                        <TextField label="ID del cargamento" value={monitor.cargoId} onChange={(e) => setMonitor({ ...monitor, cargoId: e.target.value })} required />
                        <TextField label="ID de la valija" value={monitor.deviceId} onChange={(e) => setMonitor({ ...monitor, deviceId: e.target.value })} required />
                        <TextField label="ID de la política" value={monitor.policyId} onChange={(e) => setMonitor({ ...monitor, policyId: e.target.value })} required />
                        <Box>
                            <SubmitButton loading={startState.loading} disabled={!monitor.cargoId.trim() || !monitor.deviceId.trim() || !monitor.policyId.trim()}>
                                Iniciar monitoreo
                            </SubmitButton>
                        </Box>
                    </Stack>
                </AccordionDetails>
            </Accordion>

            <Accordion variant="outlined" disableGutters>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>Crear política de temperatura</AccordionSummary>
                <AccordionDetails>
                    <Stack
                        component="form"
                        spacing={2}
                        onSubmit={async (e) => {
                            e.preventDefault();
                            const ok = await savePolicy({ policyId: policy.policyId.trim(), minTemp: min, maxTemp: max, maxExcursionSeconds: Number(policy.excursion) });
                            if (ok) setNotice(`Política ${policy.policyId.trim()} creada. No se puede modificar: para cambiarla se crea otra.`);
                        }}
                    >
                        <ErrorAlert error={policyState.error} />
                        <TextField label="ID de la política" value={policy.policyId} onChange={(e) => setPolicy({ ...policy, policyId: e.target.value })} required helperText="Por ejemplo VACUNA-2-8" />
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField label="Mínima (°C)" value={policy.min} onChange={(e) => setPolicy({ ...policy, min: e.target.value })} inputMode="decimal" required />
                            <TextField label="Máxima (°C)" value={policy.max} onChange={(e) => setPolicy({ ...policy, max: e.target.value })} inputMode="decimal" required error={Number.isFinite(min) && Number.isFinite(max) && min >= max} />
                            <TextField label="Excursión tolerada (s)" value={policy.excursion} onChange={(e) => setPolicy({ ...policy, excursion: e.target.value })} inputMode="numeric" required helperText="Segundos fuera de rango" />
                        </Stack>
                        <Box>
                            <SubmitButton loading={policyState.loading} disabled={!policyOk}>
                                Crear política
                            </SubmitButton>
                        </Box>
                    </Stack>
                </AccordionDetails>
            </Accordion>

            <Accordion variant="outlined" disableGutters>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>Registrar valija</AccordionSummary>
                <AccordionDetails>
                    <Stack
                        component="form"
                        spacing={2}
                        onSubmit={async (e) => {
                            e.preventDefault();
                            const ok = await saveDevice({
                                deviceId: device.deviceId.trim(),
                                pubKey: device.pubKey.trim().toLowerCase(),
                                calibrationExpiry: calibration,
                                org: device.org.trim() || undefined,
                            });
                            if (ok) setNotice(`Valija ${device.deviceId.trim()} registrada.`);
                        }}
                    >
                        <ErrorAlert error={deviceState.error} />
                        <TextField label="ID de la valija" value={device.deviceId} onChange={(e) => setDevice({ ...device, deviceId: e.target.value })} required />
                        <TextField
                            label="Clave pública (P-256, X‖Y en hex)"
                            value={device.pubKey}
                            onChange={(e) => setDevice({ ...device, pubKey: e.target.value })}
                            required
                            error={device.pubKey !== "" && !pubKeyOk}
                            helperText="128 caracteres hexadecimales (64 bytes)"
                            multiline
                        />
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField label="Calibración vigente hasta" type="date" value={device.calibrationExpiry} onChange={(e) => setDevice({ ...device, calibrationExpiry: e.target.value })} required slotProps={{ inputLabel: { shrink: true } }} />
                            <TextField label="Org (opcional)" value={device.org} onChange={(e) => setDevice({ ...device, org: e.target.value })} helperText="MSP dueño de la valija" />
                        </Stack>
                        <Box>
                            <SubmitButton loading={deviceState.loading} disabled={!deviceOk}>
                                Registrar valija
                            </SubmitButton>
                        </Box>
                    </Stack>
                </AccordionDetails>
            </Accordion>

            <Accordion variant="outlined" disableGutters>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>Autorizar el gateway</AccordionSummary>
                <AccordionDetails>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        El gateway del backend es quien ancla las lecturas; el regulador tiene que autorizar su identidad una vez.
                    </Typography>
                    <ErrorAlert error={authState.error} sx={{ mb: 2 }} />
                    <Button variant="outlined" disabled={authState.loading} onClick={async () => (await authorize()) && setNotice("Gateway autorizado.")}>
                        Autorizar gateway
                    </Button>
                </AccordionDetails>
            </Accordion>
        </Stack>
    );
}

export default function ColdChain() {
    const { cargoId } = useParams();
    const navigate = useNavigate();
    const [query, setQuery] = useState(cargoId ?? "");
    useEffect(() => setQuery(cargoId ?? ""), [cargoId]);
    const go = (id) => navigate(id ? `/coldchain/${encodeURIComponent(id)}` : "/coldchain");

    return (
        <>
            <PageHeader title="Cadena de frío" subtitle="Veredicto de la valija IoT: temperatura, precinto y lecturas ancladas en la cadena." />
            <Stack
                component="form"
                direction="row"
                spacing={1.5}
                sx={{ mb: 3, maxWidth: 560 }}
                onSubmit={(e) => {
                    e.preventDefault();
                    go(query.trim());
                }}
            >
                <TextField label="Buscar cargamento por ID" value={query} onChange={(e) => setQuery(e.target.value)} />
                <Button type="submit" variant="contained" startIcon={<SearchIcon />} sx={{ minWidth: 120 }}>
                    Buscar
                </Button>
            </Stack>
            {cargoId ? <Status cargoId={cargoId} /> : <Setup onStarted={go} />}
        </>
    );
}
