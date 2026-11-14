import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { Alert, Box, Button, Card, CardContent, CircularProgress, Link, Paper, Stack, TextField, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SendIcon from "@mui/icons-material/SendOutlined";
import MoveToInboxIcon from "@mui/icons-material/MoveToInboxOutlined";
import * as api from "../api.js";
import { useAction } from "../hooks/useAction.js";
import { NEXT_ORG, formatDateTime, formatExpiryShort, orgLabel } from "../domain.js";
import PageHeader from "../components/PageHeader.jsx";
import ErrorAlert from "../components/ErrorAlert.jsx";
import StateChip from "../components/StateChip.jsx";
import RecordHeader from "../components/RecordHeader.jsx";
import Section from "../components/Section.jsx";
import SubmitButton from "../components/SubmitButton.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

const parseIds = (text) => [...new Set(text.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean))];

function CreateCargo({ onCreated }) {
    const [cargoId, setCargoId] = useState("");
    const [ids, setIds] = useState("");
    const [create, { loading, error }] = useAction(api.createCargo);
    const list = parseIds(ids);

    return (
        <Card sx={{ mb: 3 }}>
            <CardContent>
                <Typography variant="h6" sx={{ mb: 0.5 }}>
                    Armar un cargamento
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Agrupa lotes de un mismo dueño para despacharlos y recibirlos juntos.
                </Typography>
                <Stack
                    component="form"
                    spacing={2}
                    onSubmit={async (e) => {
                        e.preventDefault();
                        const cargo = await create({ cargoId: cargoId.trim(), batchIds: list });
                        if (cargo) {
                            setCargoId("");
                            setIds("");
                            onCreated(cargo.id);
                        }
                    }}
                >
                    <ErrorAlert error={error} />
                    <TextField label="ID del cargamento" value={cargoId} onChange={(e) => setCargoId(e.target.value)} required />
                    <TextField
                        label="IDs de los lotes"
                        value={ids}
                        onChange={(e) => setIds(e.target.value)}
                        multiline
                        minRows={2}
                        required
                        helperText={list.length ? `${list.length} ${list.length === 1 ? "lote" : "lotes"}` : "Separados por coma, espacio o salto de línea"}
                    />
                    <Box>
                        <SubmitButton loading={loading} disabled={!cargoId.trim() || list.length === 0}>
                            Crear cargamento
                        </SubmitButton>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
}

function CargoDetail({ cargoId }) {
    const { catalog } = useOutletContext();
    const reloadCatalog = catalog.reload;
    const byId = new Map((catalog.batches ?? []).map((b) => [b.id, b]));
    const [load, { loading, error, data: cargo }, reset] = useAction(api.getCargo);
    const [dispatch, dispatchState] = useAction(api.dispatchCargo);
    const [receive, receiveState] = useAction(api.receiveCargo);
    const [dissolve, dissolveState] = useAction(api.dissolveCargo);
    const [notice, setNotice] = useState("");
    const [confirmDissolve, setConfirmDissolve] = useState(false);

    const refresh = useCallback(() => load(cargoId), [cargoId, load]);
    useEffect(() => {
        reset();
        setNotice("");
        refresh();
    }, [refresh, reset]);

    if (loading && !cargo) return <CircularProgress aria-label="Cargando" />;
    if (error) return <ErrorAlert error={error} />;
    if (!cargo) return null;

    const next = NEXT_ORG[cargo.owner];
    const busy = dispatchState.loading || receiveState.loading || dissolveState.loading;
    const actionError = dispatchState.error || receiveState.error || dissolveState.error;
    const run = async (promise, message) => {
        if (await promise) {
            setNotice(message);
            refresh();
            reloadCatalog();
        }
    };

    const tone = { OPEN: "neutral", IN_TRANSIT: "transit", DELIVERED: "green", DISSOLVED: "neutral" }[cargo.state];
    const finished = cargo.state === "DELIVERED" || cargo.state === "DISSOLVED";

    return (
        <>
            <RecordHeader
                title={`Cargamento ${cargo.id}`}
                tone={tone}
                chips={<StateChip kind="cargo" state={cargo.state} />}
                facts={[
                    { label: "En custodia de", value: orgLabel(cargo.owner) },
                    { label: "Destino", value: cargo.pendingTo ? orgLabel(cargo.pendingTo) : "Sin despachar" },
                    { label: "Armado", value: formatDateTime(cargo.createdAt) },
                    { label: "Última actualización", value: formatDateTime(cargo.updatedAt) },
                ]}
            />
            <Paper variant="outlined" sx={{ mt: 2, px: { xs: 2, sm: 3 } }}>
                <Section first title="Contenido" hint="Los lotes de un cargamento se despachan y se reciben juntos.">
                    <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
                        {(cargo.batchIds ?? []).map((id) => {
                            const b = byId.get(id);
                            return (
                                <Box component="li" key={id} sx={{ py: 1, borderTop: 1, borderColor: "divider", "&:first-of-type": { borderTop: 0, pt: 0 } }}>
                                    <Link component={RouterLink} to={`/batches/${encodeURIComponent(id)}`} underline="hover" sx={{ fontWeight: 600 }}>
                                        {b?.product ?? id}
                                    </Link>
                                    <Typography variant="body2" color="text.secondary">
                                        {b ? `${id}, lote ${b.lot}, vto. ${formatExpiryShort(b.expiryDate)}` : id}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>
                </Section>
                <Section title="Cadena de frío" hint="Si el cargamento viaja con una valija IoT, acá está su veredicto.">
                    <Button component={RouterLink} to={`/coldchain/${encodeURIComponent(cargo.id)}`} variant="outlined">
                        Ver la cadena de frío de {cargo.id}
                    </Button>
                </Section>
                <Section title="Acciones">
                    {notice && (
                        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice("")}>
                            {notice}
                        </Alert>
                    )}
                    <ErrorAlert error={actionError} sx={{ mb: 2 }} />
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ flexWrap: "wrap", rowGap: 1.5 }}>
                        {cargo.state === "OPEN" && next && (
                            <Button
                                variant="contained"
                                startIcon={<SendIcon />}
                                disabled={busy}
                                onClick={() => run(dispatch({ cargoId: cargo.id, to: next }), `Cargamento despachado a ${orgLabel(next)}: todos sus lotes viajan juntos.`)}
                            >
                                Despachar a {orgLabel(next)}
                            </Button>
                        )}
                        {cargo.state === "IN_TRANSIT" && (
                            <Button
                                variant="contained"
                                startIcon={<MoveToInboxIcon />}
                                disabled={busy}
                                onClick={() => run(receive({ cargoId: cargo.id }), `Recibido por ${orgLabel(cargo.pendingTo)}.`)}
                            >
                                Recibir en {orgLabel(cargo.pendingTo)}
                            </Button>
                        )}
                        {cargo.state === "OPEN" && (
                            <Button color="inherit" variant="outlined" disabled={busy} onClick={() => setConfirmDissolve(true)}>
                                Disolver cargamento
                            </Button>
                        )}
                    </Stack>
                    {finished && <Typography color="text.secondary">Este cargamento ya terminó: no admite más acciones.</Typography>}
                </Section>
            </Paper>

            <ConfirmDialog
                open={confirmDissolve}
                title={`¿Disolver el cargamento ${cargo.id}?`}
                text="Los lotes quedan sueltos otra vez. Es definitivo: el cargamento no se puede reabrir."
                confirmLabel="Disolver"
                onClose={() => setConfirmDissolve(false)}
                onConfirm={() => {
                    setConfirmDissolve(false);
                    run(dissolve({ cargoId: cargo.id }), "Cargamento disuelto. Los lotes quedaron sueltos.");
                }}
            />
        </>
    );
}

export default function Cargo() {
    const { cargoId } = useParams();
    const navigate = useNavigate();
    const [query, setQuery] = useState(cargoId ?? "");
    useEffect(() => setQuery(cargoId ?? ""), [cargoId]);
    const go = (id) => navigate(id ? `/cargo/${encodeURIComponent(id)}` : "/cargo");

    return (
        <>
            <PageHeader title="Cargamentos" subtitle="Varios lotes que se mueven juntos por la cadena." />
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
            {cargoId ? <CargoDetail cargoId={cargoId} /> : <CreateCargo onCreated={go} />}
        </>
    );
}
