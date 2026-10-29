import { useState } from "react";
import { Alert, Box, Button, Card, CardContent, MenuItem, Stack, TextField, Typography } from "@mui/material";
import * as api from "../api.js";
import { useAction } from "../hooks/useAction.js";
import { CURRENCY_RE, LEG_BY_OWNER, LEG_LABEL, NEXT_ORG, PRICE_RE, orgLabel } from "../domain.js";
import SubmitButton from "./SubmitButton.jsx";
import ErrorAlert from "./ErrorAlert.jsx";

// Condiciones comerciales: viven en una colección privada, solo las ven el vendedor y el comprador.
// Cualquiera puede verificar si unas condiciones coinciden con el hash público, sin ver las reales.
export default function TermsPanel({ batch }) {
    const leg = LEG_BY_OWNER[batch.owner];
    const buyer = NEXT_ORG[batch.owner];
    const canSet = Boolean(leg) && !batch.pendingTo && batch.state !== "DISPENSED" && batch.state !== "RECALLED";

    const [form, setForm] = useState({ unitPrice: "", currency: "ARS", quantity: "" });
    const [readLeg, setReadLeg] = useState("manufacturer");
    const [readAs, setReadAs] = useState("LabMSP");
    const [notice, setNotice] = useState("");

    const [save, saveState] = useAction(api.setTerms);
    const [read, readState] = useAction(api.readTerms);
    const [verify, verifyState] = useAction(api.verifyTerms);

    const set = (field) => (e) => setForm((f) => ({ ...f, [field]: field === "currency" ? e.target.value.toUpperCase() : e.target.value }));

    const priceOk = PRICE_RE.test(form.unitPrice);
    const currencyOk = CURRENCY_RE.test(form.currency);
    const qtyOk = /^[1-9]\d*$/.test(form.quantity);
    const formOk = priceOk && currencyOk && qtyOk;
    const payload = { batchId: batch.id, unitPrice: form.unitPrice, currency: form.currency, quantity: Number(form.quantity) };

    const readLegSeller = readLeg === "manufacturer" ? "LabMSP" : "DistMSP";
    const readLegBuyer = readLeg === "manufacturer" ? "DistMSP" : "FarmaMSP";

    return (
        <Card>
            <CardContent>
                <Typography variant="h6">Condiciones comerciales</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Precio, moneda y cantidad de cada venta. Son privadas entre vendedor y comprador; en la cadena pública queda solo su hash.
                </Typography>

                {canSet ? (
                    <Stack
                        component="form"
                        spacing={2}
                        onSubmit={async (e) => {
                            e.preventDefault();
                            const ok = await save({ ...payload, buyer });
                            if (ok) setNotice(`Condiciones guardadas para el tramo ${LEG_LABEL[leg]}.`);
                        }}
                    >
                        <Typography variant="subtitle2">
                            Tramo actual: {LEG_LABEL[leg]} (vende {orgLabel(batch.owner)}, compra {orgLabel(buyer)})
                        </Typography>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField label="Precio unitario" value={form.unitPrice} onChange={set("unitPrice")} error={form.unitPrice !== "" && !priceOk} helperText="Hasta 4 decimales, con punto: 1234.50" inputMode="decimal" required />
                            <TextField label="Moneda" value={form.currency} onChange={set("currency")} error={!currencyOk} helperText="Código de 3 letras" slotProps={{ htmlInput: { maxLength: 3 } }} required />
                            <TextField label="Cantidad" value={form.quantity} onChange={set("quantity")} error={form.quantity !== "" && !qtyOk} helperText="Unidades (entero)" inputMode="numeric" required />
                        </Stack>
                        <ErrorAlert error={saveState.error} />
                        {notice && <Alert severity="success">{notice}</Alert>}
                        <Box>
                            <SubmitButton loading={saveState.loading} disabled={!formOk}>
                                Guardar condiciones
                            </SubmitButton>
                        </Box>
                    </Stack>
                ) : (
                    <Alert severity="info" sx={{ mb: 1 }}>
                        {batch.pendingTo
                            ? "El lote está en tránsito: las condiciones se cargan cuando el dueño actual lo tiene."
                            : "Este lote no tiene un tramo comercial abierto."}
                    </Alert>
                )}

                <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
                    Leer o verificar un tramo
                </Typography>
                <Stack spacing={2}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField select label="Tramo" value={readLeg} onChange={(e) => setReadLeg(e.target.value)}>
                            {Object.entries(LEG_LABEL).map(([k, v]) => (
                                <MenuItem key={k} value={k}>
                                    {v}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField select label="Leer como" value={readAs} onChange={(e) => setReadAs(e.target.value)}>
                            {["LabMSP", "DistMSP", "FarmaMSP", "RegMSP"].map((m) => (
                                <MenuItem key={m} value={m}>
                                    {orgLabel(m)} · {m}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Stack>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                        <Button variant="outlined" disabled={readState.loading} onClick={() => read({ batchId: batch.id, leg: readLeg, as: readAs })}>
                            Leer condiciones
                        </Button>
                        <Button
                            variant="outlined"
                            disabled={verifyState.loading || !formOk}
                            onClick={() => verify({ ...payload, leg: readLeg, seller: readLegSeller, buyer: readLegBuyer })}
                        >
                            Verificar con los valores de arriba
                        </Button>
                    </Stack>
                    <ErrorAlert error={readState.error || verifyState.error} />
                    {readState.data && (
                        <Alert severity="success" icon={false}>
                            <Typography variant="body2">
                                {readState.data.unitPrice} {readState.data.currency} × {readState.data.quantity} u. — {orgLabel(readState.data.seller)} → {orgLabel(readState.data.buyer)}
                            </Typography>
                        </Alert>
                    )}
                    {verifyState.data && (
                        <Alert severity={verifyState.data.matches ? "success" : "warning"}>
                            {verifyState.data.matches ? "Los valores coinciden con lo registrado." : "Los valores NO coinciden con lo registrado."}
                        </Alert>
                    )}
                </Stack>
            </CardContent>
        </Card>
    );
}
