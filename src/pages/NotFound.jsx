import { Link as RouterLink } from "react-router-dom";
import { Button, Typography } from "@mui/material";
import PageHeader from "../components/PageHeader.jsx";

export default function NotFound() {
    return (
        <>
            <PageHeader title="Página no encontrada" />
            <Typography color="text.secondary" sx={{ mb: 2 }}>
                Esa dirección no existe en PharmaTrace.
            </Typography>
            <Button variant="contained" component={RouterLink} to="/">
                Volver al inicio
            </Button>
        </>
    );
}
