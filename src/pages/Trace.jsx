import { useEffect, useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { Alert, Box, Button, Card, CardContent, Chip, Divider, Stack, TextField, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import MedicationIcon from "@mui/icons-material/Medication";
import PageHeader from "../components/PageHeader.jsx";
import SubmitButton from "../components/SubmitButton.jsx";
import AddressChip from "../components/AddressChip.jsx";
import StateStepper from "../components/StateStepper.jsx";
import OwnershipHistory from "../components/OwnershipHistory.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { useAction } from "../hooks/useAction.js";
import * as api from "../api.js";
import { stateLabel } from "../domain.js";

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

export default function Trace() {
    const { batchId } = useParams();
    const navigate = useNavigate();
    const [input, setInput] = useState(batchId ?? "");
    const [confirming, setConfirming] = useState(false);
    const [load, trace] = useAction(api.traceDrug);
    const [markInUse, mark, resetMark] = useAction(api.markInUse);

    useEffect(() => {
        setInput(batchId ?? "");
        resetMark();
        if (batchId) load(batchId);
    }, [batchId, load, resetMark]);

    const onSubmit = (e) => {
        e.preventDefault();
        const id = input.trim();
        if (!id) return;
        if (id === batchId) load(id);
        else navigate(`/trace/${encodeURIComponent(id)}`);
    };

    const onMarkInUse = async () => {
        const result = await markInUse(batchId);
        if (result) load(batchId);
    };

    const info = trace.data;
    const canTransfer = info && !info.inCargo && !["Delivered", "InUse"].includes(info.currentState);
    const canMarkInUse = info && !info.inCargo && info.currentState === "Delivered";

    return (
        <>
            <PageHeader title="Trazar un lote" subtitle="Consultá el estado actual y el recorrido completo de un lote." />

            <Card>
                <CardContent>
                    <Box
                        component="form"
                        onSubmit={onSubmit}
                        sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}
                    >
                        <TextField
                            label="ID del lote"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            required
                            autoFocus={!batchId}
                        />
                        <SubmitButton
                            type="submit"
                            loading={trace.loading}
                            loadingText="Buscando…"
                            startIcon={<SearchIcon />}
                            sx={{ flexShrink: 0, minWidth: 140 }}
                        >
                            Trazar
                        </SubmitButton>
                    </Box>
                </CardContent>
            </Card>

            {trace.error && (
                <Alert severity={trace.error.status === 404 ? "info" : "error"} sx={{ mt: 3 }}>
                    {trace.error.message}
                </Alert>
            )}

            {info && (
                <Stack spacing={3} sx={{ mt: 3 }}>
                    <Card>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                                <Stack direction="row" gap={1.5} alignItems="center">
                                    <MedicationIcon color="primary" fontSize="large" />
                                    <Box>
                                        <Typography variant="h5">{info.name}</Typography>
                                        <Typography color="text.secondary">Lote {batchId}</Typography>
                                    </Box>
                                </Stack>
                                <Stack direction="row" gap={1} flexWrap="wrap">
                                    <Chip color="primary" label={stateLabel(info.currentState)} />
                                    {info.inCargo && (
                                        <Chip icon={<Inventory2Icon />} color="warning" variant="outlined" label="En un cargamento" />
                                    )}
                                </Stack>
                            </Stack>

                            <Divider sx={{ my: 2 }} />

                            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2 }}>
                                <Field label="Fabricante">{info.manufacturer}</Field>
                                <Field label="Fecha de producción">{info.productionDate}</Field>
                                <Field label="Dueño actual">
                                    <AddressChip address={info.currentOwner} />
                                </Field>
                            </Box>

                            {(canTransfer || canMarkInUse) && (
                                <Stack direction="row" gap={1} sx={{ mt: 3 }} flexWrap="wrap">
                                    {canTransfer && (
                                        <Button
                                            variant="outlined"
                                            startIcon={<SwapHorizIcon />}
                                            component={RouterLink}
                                            to={`/transfer?batch=${encodeURIComponent(batchId)}`}
                                        >
                                            Transferir
                                        </Button>
                                    )}
                                    {canMarkInUse && (
                                        <SubmitButton loading={mark.loading} onClick={() => setConfirming(true)}>
                                            Marcar en uso
                                        </SubmitButton>
                                    )}
                                </Stack>
                            )}
                            {mark.error && (
                                <Alert severity="error" sx={{ mt: 2 }}>
                                    {mark.error.message}
                                </Alert>
                            )}
                            {mark.data && (
                                <Alert severity="success" sx={{ mt: 2 }}>
                                    Lote marcado como «{stateLabel("InUse")}».
                                </Alert>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Estado en la cadena
                            </Typography>
                            <StateStepper currentState={info.currentState} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Historial de dueños
                            </Typography>
                            <OwnershipHistory history={info.history} />
                        </CardContent>
                    </Card>
                </Stack>
            )}

            <ConfirmDialog
                open={confirming}
                title="¿Marcar el lote en uso?"
                text="Lo firma el paciente dueño del lote y queda registrado en la blockchain: no se puede deshacer."
                confirmLabel="Marcar en uso"
                onConfirm={onMarkInUse}
                onClose={() => setConfirming(false)}
            />
        </>
    );
}
