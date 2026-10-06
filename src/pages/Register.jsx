import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Alert, Box, Button, Card, CardContent, Stack, TextField } from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import PageHeader from "../components/PageHeader.jsx";
import SubmitButton from "../components/SubmitButton.jsx";
import { useAction } from "../hooks/useAction.js";
import * as api from "../api.js";

const EMPTY = { batchId: "", drugName: "", manufacturer: "" };

export default function Register() {
    const [form, setForm] = useState(EMPTY);
    const [registered, setRegistered] = useState("");
    const [register, status, reset] = useAction(api.registerDrug);

    const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const onSubmit = async (e) => {
        e.preventDefault();
        const values = {
            batchId: form.batchId.trim(),
            drugName: form.drugName.trim(),
            manufacturer: form.manufacturer.trim(),
        };
        reset();
        const result = await register(values);
        if (result) {
            setRegistered(values.batchId);
            setForm(EMPTY);
        }
    };

    return (
        <>
            <PageHeader
                title="Registrar un lote"
                subtitle="Da de alta un lote nuevo. Queda en poder del laboratorio, que es quien lo firma."
            />

            <Card sx={{ maxWidth: 640 }}>
                <CardContent>
                    <Box component="form" onSubmit={onSubmit}>
                        <Stack spacing={2.5}>
                            <TextField
                                label="ID del lote"
                                value={form.batchId}
                                onChange={set("batchId")}
                                helperText="Tiene que ser único. Ejemplo: B-100"
                                required
                                autoFocus
                            />
                            <TextField
                                label="Medicamento"
                                value={form.drugName}
                                onChange={set("drugName")}
                                helperText="Ejemplo: Ibuprofeno 400mg"
                                required
                            />
                            <TextField
                                label="Fabricante"
                                value={form.manufacturer}
                                onChange={set("manufacturer")}
                                helperText="Ejemplo: Laboratorio X"
                                required
                            />
                            <Box>
                                <SubmitButton type="submit" loading={status.loading} startIcon={<AddCircleOutlineIcon />}>
                                    Registrar lote
                                </SubmitButton>
                            </Box>
                        </Stack>
                    </Box>
                </CardContent>
            </Card>

            {status.error && (
                <Alert severity="error" sx={{ mt: 3, maxWidth: 640 }}>
                    {status.error.message}
                </Alert>
            )}
            {status.data && (
                <Alert
                    severity="success"
                    sx={{ mt: 3, maxWidth: 640 }}
                    action={
                        <Button color="inherit" size="small" component={RouterLink} to={`/trace/${encodeURIComponent(registered)}`}>
                            Ver lote
                        </Button>
                    }
                >
                    Lote «{registered}» registrado.
                </Alert>
            )}
        </>
    );
}
