import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import {
    Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Link, Stack, TextField, Typography,
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
        <Card>
            <CardContent>
                <Typography variant="h6">Prueba de una lectura</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Cada lectura firmada por la valija se ancla en la cadena dentro de un árbol de Merkle. Con su número se pide la prueba y se verifica contra lo anclado.
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
                    <TextField label="Número de lectura (seq)" value={seq} onChange={(e) => setSeq(e.target.value)} inputMode="numeric" error={seq !== "" && !seqOk} />
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
                                {formatDateTime(new Date(data.reading.ts * 1000).toISOString())} · {formatTemp(data.reading.tempCenti / 100)} · {data.reading.humCenti / 100} % humedad
                                {data.reading.flags & 0x04 ? " · precinto roto" : ""}
                                {data.reading.flags & 0x01 ? " · tapa abierta" : ""}
                                {data.reading.flags & 0x02 ? " · golpe" : ""}
                            </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all" }}>
                            Raíz: <code>{data.root}</code>
                            <br />
                            Hoja: <code>{data.leaf}</code> · {data.proof?.length ?? 0} pasos de prueba
                        </Typography>
                    </Stack>
                )}
            </CardContent>
        </Card>
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

    return (
        <Stack spacing={3}>
            {/* Fuera de la tarjeta de acciones: al cerrar el monitoreo esa tarjeta desaparece. */}
            {notice && (
                <Alert severity="success" onClose={() => setNotice("")}>
                    {notice}
                </Alert>
            )}
            <Card>
                <CardContent>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1, mb: 2 }}>
                        <Typography variant="h5" component="h2" sx={{ mr: 1 }}>
                            Cargamento {s.cargoId}
                        </Typography>
                        <StateChip kind="verdict" state={s.verdict} />
                        {s.closed && <Chip size="small" variant="outlined" label="Monitoreo cerrado" />}
                    </Stack>
                    {s.verdict === "COMPROMISED" && s.reason && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            Cadena de frío comprometida: {translateReason(s.reason)}
                        </Alert>
                    )}
                    {s.verdict === "COMPLIANT" && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            El cargamento cumplió la política durante todo el recorrido.
                        </Alert>
                    )}
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <Stat label="Valija">{s.deviceId}</Stat>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <Stat label="Política">{s.policy?.id}</Stat>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <Stat label="Rango permitido">{s.policy ? `${formatTemp(s.policy.minTempC)} a ${formatTemp(s.policy.maxTempC)}` : null}</Stat>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <Stat label="Fuera de rango tolerado">{s.policy ? formatDuration(s.policy.maxExcursionSeconds) : null}</Stat>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <Stat label="Tiempo fuera de rango">{formatDuration(s.excursionSeconds)}</Stat>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <Stat label="Lecturas ancladas">{s.anchoredReadings}</Stat>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <Stat label="Pendientes de anclar">{s.pendingReadings}</Stat>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                            <Stat label="Inicio">{formatDateTime(s.startedAt)}</Stat>
                        </Grid>
                    </Grid>
                    <Box sx={{ mt: 2 }}>
                        <Link component={RouterLink} to={`/cargo/${encodeURIComponent(s.cargoId)}`} underline="hover">
                            Ver el cargamento →
                        </Link>
                    </Box>
                </CardContent>
            </Card>

            {last && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" sx={{ mb: 1.5 }}>
                            Última lectura
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 6, md: 3 }}>
                                <Stat label="Temperatura">{formatTemp(last.tempC)}</Stat>
                            </Grid>
                            <Grid size={{ xs: 6, md: 3 }}>
                                <Stat label="Humedad">{last.humidityPct !== undefined ? `${last.humidityPct} %` : null}</Stat>
                            </Grid>
                            <Grid size={{ xs: 6, md: 3 }}>
                                <Stat label="Momento">{formatDateTime(last.timestamp)}</Stat>
                            </Grid>
                            <Grid size={{ xs: 6, md: 3 }}>
                                <Stat label="Número (seq)">{last.seq}</Stat>
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
                                    <Chip size="small" color={last.sealBroken ? "error" : "success"} variant="outlined" label={last.sealBroken ? "Precinto roto" : "Precinto íntegro"} />
                                    <Chip size="small" color={last.lidOpened ? "warning" : "default"} variant="outlined" label={last.lidOpened ? "Tapa abierta" : "Tapa cerrada"} />
                                    <Chip size="small" color={last.shock ? "warning" : "default"} variant="outlined" label={last.shock ? "Golpe detectado" : "Sin golpes"} />
                                </Stack>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            )}

            {s.events?.length > 0 && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" sx={{ mb: 1 }}>
                            Eventos
                        </Typography>
                        <Stack spacing={0.75} component="ul" sx={{ m: 0, pl: 2.5 }}>
                            {s.events.map((ev, i) => (
                                <Typography component="li" key={i} variant="body2">
                                    {EVENT_LABEL[ev.kind] ?? ev.kind} — {formatDateTime(new Date(ev.timestamp * 1000).toISOString())}
                                </Typography>
                            ))}
                        </Stack>
                    </CardContent>
                </Card>
            )}

            {!s.closed && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" sx={{ mb: 1.5 }}>
                            Acciones
                        </Typography>
                        <ErrorAlert error={anchorState.error || closeState.error} sx={{ mb: 2 }} />
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                            <Button variant="outlined" disabled={busy || !s.pendingReadings} onClick={() => act(anchor({ cargoId: s.cargoId }), "Lecturas ancladas en la cadena.")}>
                                Anclar lecturas pendientes ({s.pendingReadings})
                            </Button>
                            <Button variant="contained" color="primary" disabled={busy} onClick={() => setConfirmClose(true)}>
                                Cerrar monitoreo
                            </Button>
                        </Stack>
                    </CardContent>
                </Card>
            )}

            <ProofLookup cargoId={s.cargoId} anchored={s.anchoredReadings} />

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
        </Stack>
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
