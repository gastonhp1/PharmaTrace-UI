import { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from "@mui/material";
import { getApiKey, hasEmbeddedApiKey, setApiKey } from "../apiKey.js";

// Pide la clave de API (header x-api-key). Se guarda solo en esta pestaña.
export default function ApiKeyDialog({ open, onClose }) {
    const [value, setValue] = useState(getApiKey());

    const save = (event) => {
        event.preventDefault();
        setApiKey(value);
        onClose();
    };
    const clear = () => {
        setApiKey("");
        setValue("");
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { component: "form", onSubmit: save } }}>
            <DialogTitle>Clave de API</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ mb: 2 }}>
                    El backend la exige para registrar, despachar, recibir o retirar, y para leer condiciones comerciales. Es el valor de
                    <code> API_KEY </code> del backend. Se guarda solo en esta pestaña y se borra al cerrarla.
                    {hasEmbeddedApiKey() && " Este build trae una clave por defecto (VITE_API_KEY); la que cargues acá tiene prioridad."}
                </DialogContentText>
                <TextField
                    label="x-api-key"
                    type="password"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    autoFocus
                    autoComplete="off"
                />
            </DialogContent>
            <DialogActions>
                <Button color="inherit" onClick={clear}>
                    Borrar
                </Button>
                <Button onClick={onClose}>Cancelar</Button>
                <Button type="submit" variant="contained">
                    Guardar
                </Button>
            </DialogActions>
        </Dialog>
    );
}
