import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { Alert, Box, Button, Card, CardContent, Chip, Divider, Stack, TextField, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import PageHeader from "../components/PageHeader.jsx";
import SubmitButton from "../components/SubmitButton.jsx";
import AddressChip from "../components/AddressChip.jsx";
import RecipientSelect from "../components/RecipientSelect.jsx";
import { useAction } from "../hooks/useAction.js";
import * as api from "../api.js";
import { CHAIN, defaultRecipient, stateLabel } from "../domain.js";

// Qué impide transferir este lote ahora mismo (o null si se puede).
function blockedReason(info, batchId) {
    if (info.inCargo) {
        return {
            severity: "warning",
            text: "Este lote está dentro de un cargamento: se mueve junto con el cargamento, no solo.",
            action: { to: "/cargo", label: "Ir a Cargamentos" },
        };
    }
    if (info.currentState === "InUse") {
        return { severity: "info", text: "El lote ya está en uso: terminó su recorrido por la cadena." };
    }
    if (info.currentState === "Delivered") {
        return {
            severity: "info",
            text: "El lote ya está con el paciente. Lo único que falta es marcarlo en uso.",
            action: { to: `/trace/${encodeURIComponent(batchId)}`, label: "Ir a la trazabilidad" },
        };
    }
    return null;
}

export default function Transfer() {
    const [params] = useSearchParams();
    const initialBatch = params.get("batch") ?? "";

    const [batchId, setBatchId] = useState(initialBatch);
    const [activeBatch, setActiveBatch] = useState(""); // el lote que se consultó (y sobre el que se opera)
    const [toIndex, setToIndex] = useState("");
    const [sentTo, setSentTo] = useState(null);
    const [lookup, found] = useAction(api.traceDrug);
    const [transfer, done, resetDone] = useAction(api.transferDrug);

    const search = useCallback(
        async (id) => {
            setActiveBatch(id);
            const info = await lookup(id);
            setToIndex(info ? defaultRecipient(info.currentOwner) : "");
            return info;
        },
        [lookup]
    );

    useEffect(() => {
        if (initialBatch) search(initialBatch);
    }, [initialBatch, search]);

    const onSearch = (e) => {
        e.preventDefault();
        const id = batchId.trim();
        if (!id) return;
        resetDone();
        setSentTo(null);
        search(id);
    };

    const onTransfer = async (e) => {
        e.preventDefault();
        const recipient = CHAIN[Number(toIndex)];
        // El índice del actor en la cadena es también el estado que toma el lote (ver domain.js).
        const result = await transfer({ batchId: activeBatch, toAddress: recipient.address, newState: Number(toIndex) });
        if (result) {
            setSentTo(recipient);
            await search(activeBatch);
        }
    };

    const info = found.data;
    const blocked = info ? blockedReason(info, activeBatch) : null;

    return (
        <>
            <PageHeader
                title="Transferir un lote"
                subtitle="Pasá un lote al siguiente actor de la cadena. Lo firma su dueño actual."
            />

            <Stack spacing={3} sx={{ maxWidth: 720 }}>
                <Card>
                    <CardContent>
                        <Box
                            component="form"
                            onSubmit={onSearch}
                            sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}
                        >
                            <TextField
                                label="ID del lote"
                                value={batchId}
                                onChange={(e) => setBatchId(e.target.value)}
                                required
                                autoFocus={!initialBatch}
                            />
                            <SubmitButton
                                type="submit"
                                variant="outlined"
                                loading={found.loading && !info}
                                loadingText="Buscando…"
                                startIcon={<SearchIcon />}
                                sx={{ flexShrink: 0, minWidth: 140 }}
                            >
                                Buscar
                            </SubmitButton>
                        </Box>
                    </CardContent>
                </Card>

                {found.error && <Alert severity={found.error.status === 404 ? "info" : "error"}>{found.error.message}</Alert>}

                {info && (
                    <Card>
                        <CardContent>
                            <Stack spacing={2}>
                                <Box>
                                    <Typography variant="h6">{info.name}</Typography>
                                    <Typography color="text.secondary">Lote {activeBatch}</Typography>
                                </Box>
                                <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
                                    <Chip color="primary" label={stateLabel(info.currentState)} />
                                    <Typography variant="body2" color="text.secondary">
                                        en poder de
                                    </Typography>
                                    <AddressChip address={info.currentOwner} />
                                </Stack>

                                <Divider />

                                {blocked ? (
                                    <Alert
                                        severity={blocked.severity}
                                        action={
                                            blocked.action && (
                                                <Button color="inherit" size="small" component={RouterLink} to={blocked.action.to}>
                                                    {blocked.action.label}
                                                </Button>
                                            )
                                        }
                                    >
                                        {blocked.text}
                                    </Alert>
                                ) : (
                                    <Box component="form" onSubmit={onTransfer}>
                                        <Stack spacing={2.5}>
                                            <RecipientSelect
                                                ownerAddress={info.currentOwner}
                                                value={toIndex}
                                                onChange={setToIndex}
                                            />
                                            <Box>
                                                <SubmitButton
                                                    type="submit"
                                                    loading={done.loading}
                                                    disabled={toIndex === ""}
                                                    startIcon={<SwapHorizIcon />}
                                                >
                                                    Transferir
                                                </SubmitButton>
                                            </Box>
                                        </Stack>
                                    </Box>
                                )}
                            </Stack>
                        </CardContent>
                    </Card>
                )}

                {done.error && <Alert severity="error">{done.error.message}</Alert>}
                {done.data && sentTo && (
                    <Alert
                        severity="success"
                        action={
                            <Button
                                color="inherit"
                                size="small"
                                component={RouterLink}
                                to={`/trace/${encodeURIComponent(activeBatch)}`}
                            >
                                Ver lote
                            </Button>
                        }
                    >
                        Lote «{activeBatch}» transferido a {sentTo.label}.
                    </Alert>
                )}
            </Stack>
        </>
    );
}
