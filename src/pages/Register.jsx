import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Alert, Box, Button, Card, CardContent, Stack, TextField } from "@mui/material";
import * as api from "../api.js";
import { useAction } from "../hooks/useAction.js";
import { GTIN_RE } from "../domain.js";
import PageHeader from "../components/PageHeader.jsx";
import SubmitButton from "../components/SubmitButton.jsx";
import ErrorAlert from "../components/ErrorAlert.jsx";

const EMPTY = { batchId: "", gtin: "", product: "", lot: "", expiryDate: "" };

export default function Register() {
    const [form, setForm] = useState(EMPTY);
    const [created, setCreated] = useState(null);
    const [register, { loading, error }] = useAction(api.registerBatch);

    const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
    const gtinOk = GTIN_RE.test(form.gtin);
    const valid = form.batchId.trim() && gtinOk && form.product.trim() && form.lot.trim() && form.expiryDate;

    const submit = async (e) => {
        e.preventDefault();
        setCreated(null);
        const batch = await register({
            batchId: form.batchId.trim(),
            gtin: form.gtin.trim(),
            product: form.product.trim(),
            lot: form.lot.trim(),
            expiryDate: form.expiryDate,
        });
        if (batch) {
            setCreated(batch);
            setForm(EMPTY);
        }
    };

    return (
        <>
            <PageHeader title="Registrar lote" subtitle="Lo registra el laboratorio (LabMSP) y arranca con él en custodia." />
            <Card sx={{ maxWidth: 720 }}>
                <CardContent>
                    <Stack component="form" spacing={2.5} onSubmit={submit}>
                        {created && (
                            <Alert
                                severity="success"
                                action={
                                    <Button component={RouterLink} to={`/batches/${encodeURIComponent(created.id)}`} color="inherit" size="small">
                                        Ver lote
                                    </Button>
                                }
                            >
                                Lote {created.id} registrado.
                            </Alert>
                        )}
                        <ErrorAlert error={error} />
                        <TextField label="ID del lote" value={form.batchId} onChange={set("batchId")} required autoFocus helperText="Único en la red, por ejemplo LOTE-2026-001" />
                        <TextField label="GTIN" value={form.gtin} onChange={set("gtin")} required error={form.gtin !== "" && !gtinOk} helperText="Código de barras del producto: 8 a 14 dígitos" inputMode="numeric" />
                        <TextField label="Producto" value={form.product} onChange={set("product")} required />
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField label="Número de lote" value={form.lot} onChange={set("lot")} required />
                            <TextField label="Vencimiento" type="date" value={form.expiryDate} onChange={set("expiryDate")} required slotProps={{ inputLabel: { shrink: true } }} />
                        </Stack>
                        <Box>
                            <SubmitButton loading={loading} disabled={!valid}>
                                Registrar lote
                            </SubmitButton>
                        </Box>
                    </Stack>
                </CardContent>
            </Card>
        </>
    );
}
