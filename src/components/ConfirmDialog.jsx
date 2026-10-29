import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";

export default function ConfirmDialog({ open, title, text, confirmLabel = "Confirmar", color = "primary", onConfirm, onClose }) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <DialogContentText>{text}</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button variant="contained" color={color} onClick={onConfirm} autoFocus>
                    {confirmLabel}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
