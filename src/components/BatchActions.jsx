import { useState } from "react";
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";
import SendIcon from "@mui/icons-material/SendOutlined";
import MoveToInboxIcon from "@mui/icons-material/MoveToInboxOutlined";
import MedicationIcon from "@mui/icons-material/MedicationOutlined";
import ReportIcon from "@mui/icons-material/ReportGmailerrorredOutlined";
import * as api from "../api.js";
import { useAction } from "../hooks/useAction.js";
import { NEXT_ORG, batchActions, orgLabel } from "../domain.js";
import SubmitButton from "./SubmitButton.jsx";
import ErrorAlert from "./ErrorAlert.jsx";
import ConfirmDialog from "./ConfirmDialog.jsx";

// Acciones disponibles según el estado. La regla de verdad la aplica el chaincode: si algo no
// corresponde, el backend contesta con el motivo y se muestra acá.
export default function BatchActions({ batch, onChanged }) {
    const can = batchActions(batch);
    const [patientRef, setPatientRef] = useState("");
    const [reason, setReason] = useState("");
    const [confirmRecall, setConfirmRecall] = useState(false);
    const [notice, setNotice] = useState("");

    const [dispatch, dispatchState] = useAction(api.dispatchBatch);
    const [receive, receiveState] = useAction(api.receiveBatch);
    const [dispense, dispenseState] = useAction(api.dispenseBatch);
    const [recall, recallState] = useAction(api.recallBatch);

    const error = dispatchState.error || receiveState.error || dispenseState.error || recallState.error;
    const busy = dispatchState.loading || receiveState.loading || dispenseState.loading || recallState.loading;
    const next = NEXT_ORG[batch.owner];

    const done = async (promise, message) => {
        const result = await promise;
        if (result) {
            setNotice(message);
            onChanged?.();
        }
    };

    const nothing = !can.canDispatch && !can.canReceive && !can.canDispense && !can.canRecall;

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" sx={{ mb: 1.5 }}>
                    Acciones
                </Typography>
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
                                done(dispense({ batchId: batch.id, patientRef: patientRef.trim() }), "Dispensado. Se guardó solo el hash de la referencia.").then(() => setPatientRef(""));
                            }}
                        >
                            <TextField
                                label="Referencia del paciente"
                                value={patientRef}
                                onChange={(e) => setPatientRef(e.target.value)}
                                helperText="No se guarda: el backend registra solo su hash SHA-256."
                                required
                            />
                            <Box>
                                <SubmitButton loading={dispenseState.loading} startIcon={<MedicationIcon />} disabled={!patientRef.trim() || busy} sx={{ minWidth: 150, height: 56 }}>
                                    Dispensar
                                </SubmitButton>
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
            </CardContent>

            <ConfirmDialog
                open={confirmRecall}
                title={`¿Retirar el lote ${batch.id} del mercado?`}
                text="Lo firma el regulador y es definitivo: el lote no vuelve a cambiar de estado."
                confirmLabel="Retirar lote"
                color="error"
                onClose={() => setConfirmRecall(false)}
                onConfirm={() => {
                    setConfirmRecall(false);
                    done(recall({ batchId: batch.id, reason: reason.trim() }), "Lote retirado del mercado.").then(() => setReason(""));
                }}
            />
        </Card>
    );
}
