import { Button, CircularProgress } from "@mui/material";

// Botón que se bloquea mientras la operación está en curso. Una transacción on-chain tarda en
// confirmarse, y sin esto es fácil mandar la misma operación dos veces.
export default function SubmitButton({
    loading = false,
    loadingText = "Procesando…",
    disabled = false,
    startIcon,
    children,
    ...props
}) {
    return (
        <Button
            variant="contained"
            disabled={disabled || loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : startIcon}
            {...props}
        >
            {loading ? loadingText : children}
        </Button>
    );
}
