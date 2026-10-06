import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";

// Confirmación para acciones que no se pueden deshacer en la blockchain.
export default function ConfirmDialog({ open, title, text, confirmLabel = "Confirmar", onConfirm, onClose }) {
    return (
        <Dialog open={open} onClose={onClose} aria-labelledby="confirm-title">
            <DialogTitle id="confirm-title">{title}</DialogTitle>
            <DialogContent>
                <DialogContentText>{text}</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button
                    variant="contained"
                    autoFocus
                    onClick={() => {
                        onClose();
                        onConfirm();
                    }}
                >
                    {confirmLabel}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
