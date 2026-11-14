import { Box, Typography } from "@mui/material";

// Sección de una monografía: el título va en el margen izquierdo y el contenido a la derecha,
// separada de la anterior por una regla. En pantallas chicas el título queda arriba.
export default function Section({ title, hint, children, first = false }) {
    return (
        <Box
            component="section"
            sx={{
                display: "grid",
                gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "190px minmax(0, 1fr)" },
                columnGap: 4,
                rowGap: 1.5,
                py: 3,
                borderTop: first ? 0 : 1,
                borderColor: "divider",
            }}
        >
            <Box>
                <Typography variant="h6" component="h2">
                    {title}
                </Typography>
                {hint && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, maxWidth: 260 }}>
                        {hint}
                    </Typography>
                )}
            </Box>
            <Box sx={{ minWidth: 0 }}>{children}</Box>
        </Box>
    );
}
