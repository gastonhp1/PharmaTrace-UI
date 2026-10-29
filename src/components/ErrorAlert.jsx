import { Alert } from "@mui/material";

export default function ErrorAlert({ error, sx }) {
    if (!error) return null;
    return (
        <Alert severity="error" sx={sx} role="alert">
            {error.message || String(error)}
        </Alert>
    );
}
