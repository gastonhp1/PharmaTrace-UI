import { useCallback, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Divider,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import PageHeader from "../components/PageHeader.jsx";
import SubmitButton from "../components/SubmitButton.jsx";
import AddressChip from "../components/AddressChip.jsx";
import RecipientSelect from "../components/RecipientSelect.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { useAction } from "../hooks/useAction.js";
import * as api from "../api.js";
import { CHAIN, defaultRecipient } from "../domain.js";

const MAX_BATCHES = 100; // límite del contrato (CargoTracker)

function Field({ label, children }) {
    return (
        <Box>
            <Typography variant="caption" color="text.secondary">
                {label}
            </Typography>
            <Box sx={{ mt: 0.25 }}>{typeof children === "string" ? <Typography>{children}</Typography> : children}</Box>
        </Box>
    );
}

// "B-1, B-2\nB-3" -> ["B-1", "B-2", "B-3"] (sin vacíos ni repetidos)
const parseBatchIds = (text) => [...new Set(text.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean))];

export default function Cargo() {
    const [tab, setTab] = useState("consult");

    // Consultar / operar
    const [cargoId, setCargoId] = useState("");
    const [activeId, setActiveId] = useState("");
    const [toIndex, setToIndex] = useState("");
    const [sentTo, setSentTo] = useState(null);
    const [confirmingDeliver, setConfirmingDeliver] = useState(false);
    const [fetchCargo, found] = useAction(api.getCargo);
    const [transfer, transferred, resetTransfer] = useAction(api.transferCargo);
    const [deliver, delivered, resetDeliver] = useAction(api.deliverCargo);

    // Crear
    const [newId, setNewId] = useState("");
    const [batchesText, setBatchesText] = useState("");
    const [create, created, resetCreate] = useAction(api.createCargo);
    const batchIds = useMemo(() => parseBatchIds(batchesText), [batchesText]);

    const search = useCallback(
        async (id) => {
            setActiveId(id);
            const info = await fetchCargo(id);
            setToIndex(info ? defaultRecipient(info.currentOwner) : "");
            return info;
        },
        [fetchCargo]
    );

    const onSearch = (e) => {
        e.preventDefault();
        const id = cargoId.trim();
        if (!id) return;
        resetTransfer();
        resetDeliver();
        setSentTo(null);
        search(id);
    };

    const onTransfer = async (e) => {
        e.preventDefault();
        const recipient = CHAIN[Number(toIndex)];
        // El índice del actor en la cadena es también el estado que toman los lotes (ver domain.js).
        const result = await transfer({ cargoId: activeId, toAddress: recipient.address, newState: Number(toIndex) });
        if (result) {
            setSentTo(recipient);
            await search(activeId);
        }
    };

    const onDeliver = async () => {
        const result = await deliver(activeId);
        if (result) await search(activeId);
    };

    const onCreate = async (e) => {
        e.preventDefault();
        const id = newId.trim();
        resetCreate();
        const result = await create({ cargoId: id, batchIds });
        if (result) {
            setNewId("");
            setBatchesText("");
            setCargoId(id);
            resetTransfer();
            resetDeliver();
            setSentTo(null);
            setTab("consult");
            await search(id);
        }
    };

    const cargo = found.data;

    return (
        <>
            <PageHeader
                title="Cargamentos"
                subtitle="Agrupá varios lotes del mismo dueño y movelos juntos por la cadena."
            />

            {created.data && (
                <Alert severity="success" sx={{ mb: 3, maxWidth: 720 }}>
                    Cargamento «{created.data.cargoId}» creado con {created.data.batchIds.length}{" "}
                    {created.data.batchIds.length === 1 ? "lote" : "lotes"}.
                </Alert>
            )}

            <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 3 }} aria-label="Cargamentos">
                <Tab value="consult" label="Consultar" />
                <Tab value="create" label="Crear" />
            </Tabs>

            {tab === "consult" && (
                <Stack spacing={3} sx={{ maxWidth: 720 }}>
                    <Card>
                        <CardContent>
                            <Box
                                component="form"
                                onSubmit={onSearch}
                                sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}
                            >
                                <TextField
                                    label="ID del cargamento"
                                    value={cargoId}
                                    onChange={(e) => setCargoId(e.target.value)}
                                    required
                                />
                                <SubmitButton
                                    type="submit"
                                    variant="outlined"
                                    loading={found.loading && !cargo}
                                    loadingText="Buscando…"
                                    startIcon={<SearchIcon />}
                                    sx={{ flexShrink: 0, minWidth: 140 }}
                                >
                                    Buscar
                                </SubmitButton>
                            </Box>
                        </CardContent>
                    </Card>

                    {found.error && (
                        <Alert severity={found.error.status === 404 ? "info" : "error"}>{found.error.message}</Alert>
                    )}

                    {cargo && (
                        <>
                            <Card>
                                <CardContent>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                                        <Stack direction="row" gap={1.5} alignItems="center">
                                            <Inventory2Icon color="primary" fontSize="large" />
                                            <Box>
                                                <Typography variant="h5">{cargo.cargoId}</Typography>
                                                <Typography color="text.secondary">
                                                    {cargo.batchIds.length} {cargo.batchIds.length === 1 ? "lote" : "lotes"}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                        <Chip
                                            color={cargo.delivered ? "success" : "primary"}
                                            label={cargo.delivered ? "Entregado" : "En curso"}
                                        />
                                    </Stack>

                                    <Divider sx={{ my: 2 }} />

                                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2 }}>
                                        <Field label="Dueño actual">
                                            <AddressChip address={cargo.currentOwner} />
                                        </Field>
                                        <Field label="Creado por">
                                            <AddressChip address={cargo.createdBy} />
                                        </Field>
                                        <Field label="Creado el">{new Date(cargo.createdAt).toLocaleString("es-AR")}</Field>
                                    </Box>

                                    <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 2 }}>
                                        Lotes (click para trazar)
                                    </Typography>
                                    <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
                                        {cargo.batchIds.map((id) => (
                                            <Chip
                                                key={id}
                                                label={id}
                                                size="small"
                                                variant="outlined"
                                                clickable
                                                component={RouterLink}
                                                to={`/trace/${encodeURIComponent(id)}`}
                                            />
                                        ))}
                                    </Stack>
                                </CardContent>
                            </Card>

                            {cargo.delivered ? (
                                <Alert severity="info">
                                    Cargamento entregado: ya no se puede transferir. Sus lotes siguen por la cadena de a uno.
                                </Alert>
                            ) : (
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            Mover el cargamento
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            Todos los lotes se mueven juntos y toman el estado del receptor. Si uno falla, no se
                                            mueve ninguno.
                                        </Typography>
                                        <Box component="form" onSubmit={onTransfer}>
                                            <Stack spacing={2.5}>
                                                <RecipientSelect
                                                    ownerAddress={cargo.currentOwner}
                                                    value={toIndex}
                                                    onChange={setToIndex}
                                                />
                                                <Stack direction="row" gap={1.5} flexWrap="wrap">
                                                    <SubmitButton
                                                        type="submit"
                                                        loading={transferred.loading}
                                                        disabled={toIndex === ""}
                                                        startIcon={<SwapHorizIcon />}
                                                    >
                                                        Transferir
                                                    </SubmitButton>
                                                    <SubmitButton
                                                        variant="outlined"
                                                        color="success"
                                                        loading={delivered.loading}
                                                        startIcon={<CheckCircleOutlineIcon />}
                                                        onClick={() => setConfirmingDeliver(true)}
                                                    >
                                                        Marcar como entregado
                                                    </SubmitButton>
                                                </Stack>
                                            </Stack>
                                        </Box>
                                    </CardContent>
                                </Card>
                            )}
                        </>
                    )}

                    {transferred.error && <Alert severity="error">{transferred.error.message}</Alert>}
                    {transferred.data && sentTo && (
                        <Alert severity="success">
                            Cargamento «{activeId}» transferido a {sentTo.label}, junto con sus lotes.
                        </Alert>
                    )}
                    {delivered.error && <Alert severity="error">{delivered.error.message}</Alert>}
                    {delivered.data && <Alert severity="success">Cargamento «{activeId}» marcado como entregado.</Alert>}
                </Stack>
            )}

            {tab === "create" && (
                <Stack spacing={3} sx={{ maxWidth: 720 }}>
                    <Card>
                        <CardContent>
                            <Box component="form" onSubmit={onCreate}>
                                <Stack spacing={2.5}>
                                    <TextField
                                        label="ID del cargamento"
                                        value={newId}
                                        onChange={(e) => setNewId(e.target.value)}
                                        helperText="Tiene que ser único. Ejemplo: C-100"
                                        required
                                    />
                                    <TextField
                                        label="Lotes"
                                        value={batchesText}
                                        onChange={(e) => setBatchesText(e.target.value)}
                                        multiline
                                        minRows={4}
                                        required
                                        helperText="Uno por línea o separados por coma. Tienen que existir y ser todos del mismo dueño."
                                        error={batchIds.length > MAX_BATCHES}
                                    />
                                    <Typography
                                        variant="body2"
                                        color={batchIds.length > MAX_BATCHES ? "error" : "text.secondary"}
                                    >
                                        {batchIds.length} {batchIds.length === 1 ? "lote" : "lotes"} (máximo {MAX_BATCHES})
                                    </Typography>
                                    <Box>
                                        <SubmitButton
                                            type="submit"
                                            loading={created.loading}
                                            disabled={batchIds.length === 0 || batchIds.length > MAX_BATCHES}
                                            startIcon={<Inventory2Icon />}
                                        >
                                            Crear cargamento
                                        </SubmitButton>
                                    </Box>
                                </Stack>
                            </Box>
                        </CardContent>
                    </Card>
                    {created.error && <Alert severity="error">{created.error.message}</Alert>}
                </Stack>
            )}

            <ConfirmDialog
                open={confirmingDeliver}
                title="¿Marcar el cargamento como entregado?"
                text="Lo cierra: ya no se va a poder transferir. Los lotes se desbloquean y siguen la cadena de a uno. Queda registrado en la blockchain y no se puede deshacer."
                confirmLabel="Marcar entregado"
                onConfirm={onDeliver}
                onClose={() => setConfirmingDeliver(false)}
            />
        </>
    );
}
