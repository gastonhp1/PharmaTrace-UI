import { useState } from "react";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import SendIcon from "@mui/icons-material/SendOutlined";
import MoveToInboxIcon from "@mui/icons-material/MoveToInboxOutlined";
import MedicationIcon from "@mui/icons-material/MedicationOutlined";
import ReportIcon from "@mui/icons-material/ReportGmailerrorredOutlined";
import VerifiedIcon from "@mui/icons-material/VerifiedOutlined";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import * as api from "../api.js";
import { useAction } from "../hooks/useAction.js";
import { NEXT_ORG, batchActions, formatUnits, hasQuantity, orgLabel } from "../domain.js";
import SubmitButton from "./SubmitButton.jsx";
import ErrorAlert from "./ErrorAlert.jsx";
import ConfirmDialog from "./ConfirmDialog.jsx";

// Acciones disponibles según el estado. La regla de verdad la aplica el chaincode: si algo no
// corresponde, el backend contesta con el motivo y se muestra acá.
export default function BatchActions({ batch, onChanged }) {
    const can = batchActions(batch);
    const [patientRef, setPatientRef] = useState("");
    const [units, setUnits] = useState("");
    const [splitId, setSplitId] = useState("");
    const [splitUnits, setSplitUnits] = useState("");
    const [reason, setReason] = useState("");
    const [releaseReason, setReleaseReason] = useState("");
    const [confirmRelease, setConfirmRelease] = useState(false);
    const [confirmRecall, setConfirmRecall] = useState(false);
    const [notice, setNotice] = useState("");

    const [dispatch, dispatchState] = useAction(api.dispatchBatch);
    const [receive, receiveState] = useAction(api.receiveBatch);
    const [dispense, dispenseState] = useAction(api.dispenseBatch);
    const [recall, recallState] = useAction(api.recallBatch);
    const [release, releaseState] = useAction(api.releaseBatch);
    const [split, splitState] = useAction(api.splitBatch);

    const states = [dispatchState, receiveState, dispenseState, recallState, releaseState, splitState];
    const error = states.find((s) => s.error)?.error;
    const busy = states.some((s) => s.loading);
    const counted = hasQuantity(batch);
    // Unidades a dispensar: vacío = todas las que quedan.
    const unitsNumber = units === "" ? undefined : Number(units);
    const unitsOk = unitsNumber === undefined || (Number.isInteger(unitsNumber) && unitsNumber >= 1 && unitsNumber <= batch.quantity);
    const splitNumber = Number(splitUnits);
    const splitOk = splitId.trim() !== "" && Number.isInteger(splitNumber) && splitNumber >= 1 && splitNumber < (batch.quantity ?? 0);
    const next = NEXT_ORG[batch.owner];

    const done = async (promise, message) => {
        const result = await promise;
        if (result) {
            setNotice(message);
            onChanged?.();
        }
    };

    const nothing = !can.canDispatch && !can.canReceive && !can.canDispense && !can.canRecall && !can.canSplit;

    return (
        <Box>
                {notice && (
                    <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice("")}>
                        {notice}
                    </Alert>
                )}
                <ErrorAlert error={error} sx={{ mb: 2 }} />

                {can.inCargo && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        El lote viaja en el cargamento {batch.cargo}: se despacha y se recibe junto con el cargamento.
                    </Alert>
                )}
                {can.quarantined && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        El lote está en cuarentena por la cadena de frío. Quien lo tiene no puede moverlo: el regulador revisa la evidencia y lo libera o lo retira del mercado.
                    </Alert>
                )}
                {nothing && !can.inCargo && <Typography color="text.secondary">Este lote ya no admite acciones.</Typography>}

                <Stack spacing={2.5}>
                    {can.canDispatch && (
                        <Box>
                            <Button
                                variant="contained"
                                startIcon={<SendIcon />}
                                disabled={busy}
                                onClick={() => done(dispatch({ batchId: batch.id, to: next }), `Despachado a ${orgLabel(next)}. Falta que lo reciba.`)}
                            >
                                Despachar a {orgLabel(next)}
                            </Button>
                        </Box>
                    )}

                    {can.canReceive && (
                        <Box>
                            <Button
                                variant="contained"
                                startIcon={<MoveToInboxIcon />}
                                disabled={busy}
                                onClick={() => done(receive({ batchId: batch.id }), `Recibido por ${orgLabel(batch.pendingTo)}.`)}
                            >
                                Recibir en {orgLabel(batch.pendingTo)}
                            </Button>
                            {batch.state === "RECALLED" && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                                    Aunque esté retirado, tiene que recibirse para cerrar el tránsito.
                                </Typography>
                            )}
                        </Box>
                    )}

                    {can.canDispense && (
                        <Stack
                            component="form"
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1.5}
                            onSubmit={(e) => {
                                e.preventDefault();
                                const message = unitsNumber === undefined ? "Dispensado. Se guardó solo el hash de la referencia." : `Dispensadas ${formatUnits(unitsNumber)}. Se guardó solo el hash de la referencia.`;
                                done(dispense({ batchId: batch.id, patientRef: patientRef.trim(), quantity: unitsNumber }), message).then(() => {
                                    setPatientRef("");
                                    setUnits("");
                                });
                            }}
                        >
                            <TextField
                                label="Referencia del paciente"
                                value={patientRef}
                                onChange={(e) => setPatientRef(e.target.value)}
                                helperText="No se guarda: el backend registra solo su hash SHA-256."
                                required
                            />
                            {counted && (
                                <TextField
                                    label="Unidades"
                                    type="number"
                                    value={units}
                                    onChange={(e) => setUnits(e.target.value)}
                                    error={!unitsOk}
                                    placeholder={`Todas (${batch.quantity})`}
                                    helperText={`Vacío: las ${batch.quantity} que quedan.`}
                                    slotProps={{ htmlInput: { min: 1, max: batch.quantity, step: 1, inputMode: "numeric" }, inputLabel: { shrink: true } }}
                                    sx={{ maxWidth: { sm: 160 } }}
                                />
                            )}
                            <Box>
                                <SubmitButton loading={dispenseState.loading} startIcon={<MedicationIcon />} disabled={!patientRef.trim() || !unitsOk || busy} sx={{ minWidth: 150, height: 56 }}>
                                    Dispensar
                                </SubmitButton>
                            </Box>
                        </Stack>
                    )}

                    {can.canSplit && (
                        <Stack
                            component="form"
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1.5}
                            onSubmit={(e) => {
                                e.preventDefault();
                                const newBatchId = splitId.trim();
                                done(
                                    split({ batchId: batch.id, newBatchId, quantity: splitNumber }),
                                    `Se pasaron ${formatUnits(splitNumber)} al lote ${newBatchId}. Ese lote ya se puede despachar por su cuenta.`
                                ).then(() => {
                                    setSplitId("");
                                    setSplitUnits("");
                                });
                            }}
                        >
                            <TextField
                                label="ID del lote nuevo"
                                value={splitId}
                                onChange={(e) => setSplitId(e.target.value)}
                                placeholder={`Ej.: ${batch.id}-FARMA1`}
                                helperText="Mismo producto, número de lote y vencimiento."
                                required
                                slotProps={{ inputLabel: { shrink: true } }}
                            />
                            <TextField
                                label="Unidades"
                                type="number"
                                value={splitUnits}
                                onChange={(e) => setSplitUnits(e.target.value)}
                                error={splitUnits !== "" && !splitOk && splitId.trim() !== ""}
                                helperText={`De 1 a ${batch.quantity - 1}.`}
                                required
                                slotProps={{ htmlInput: { min: 1, max: batch.quantity - 1, step: 1, inputMode: "numeric" } }}
                                sx={{ maxWidth: { sm: 160 } }}
                            />
                            <Box>
                                <SubmitButton loading={splitState.loading} variant="outlined" startIcon={<CallSplitIcon />} disabled={!splitOk || busy} sx={{ minWidth: 150, height: 56 }}>
                                    Dividir
                                </SubmitButton>
                            </Box>
                        </Stack>
                    )}

                    {can.canRelease && (
                        <Stack
                            component="form"
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1.5}
                            onSubmit={(e) => {
                                e.preventDefault();
                                setConfirmRelease(true);
                            }}
                        >
                            <TextField
                                label="Motivo de la liberación (regulador)"
                                value={releaseReason}
                                onChange={(e) => setReleaseReason(e.target.value)}
                                helperText="Por qué el lote sigue siendo apto. Queda en el historial."
                                required
                            />
                            <Box>
                                <Button type="submit" color="success" variant="outlined" startIcon={<VerifiedIcon />} disabled={!releaseReason.trim() || busy} sx={{ minWidth: 150, height: 56 }}>
                                    Liberar
                                </Button>
                            </Box>
                        </Stack>
                    )}

                    {can.canRecall && (
                        <Stack
                            component="form"
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1.5}
                            onSubmit={(e) => {
                                e.preventDefault();
                                setConfirmRecall(true);
                            }}
                        >
                            <TextField label="Motivo del retiro (regulador)" value={reason} onChange={(e) => setReason(e.target.value)} required />
                            <Box>
                                <Button type="submit" color="error" variant="outlined" startIcon={<ReportIcon />} disabled={!reason.trim() || busy} sx={{ minWidth: 150, height: 56 }}>
                                    Retirar
                                </Button>
                            </Box>
                        </Stack>
                    )}
                </Stack>

            <ConfirmDialog
                open={confirmRelease}
                title={`¿Liberar el lote ${batch.id} de la cuarentena?`}
                text="Lo firma el regulador: el lote vuelve a circular y puede despacharse y dispensarse."
                confirmLabel="Liberar lote"
                color="success"
                onClose={() => setConfirmRelease(false)}
                onConfirm={() => {
                    setConfirmRelease(false);
                    done(release({ batchId: batch.id, reason: releaseReason.trim() }), "Lote liberado de la cuarentena.").then(() => setReleaseReason(""));
                }}
            />
            <ConfirmDialog
                open={confirmRecall}
                title={`¿Retirar el lote ${batch.id} del mercado?`}
                text="Lo firma el regulador y es definitivo: el lote no vuelve a cambiar de estado. También se retiran los lotes que se dividieron de él y no se dispensaron, estén donde estén."
                confirmLabel="Retirar lote"
                color="error"
                onClose={() => setConfirmRecall(false)}
                onConfirm={() => {
                    setConfirmRecall(false);
                    done(recall({ batchId: batch.id, reason: reason.trim() }), "Lote retirado del mercado.").then(() => setReason(""));
                }}
            />
        </Box>
    );
}
