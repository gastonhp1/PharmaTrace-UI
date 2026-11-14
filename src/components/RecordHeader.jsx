import { Box, Stack, Typography } from "@mui/material";

const TONE = { neutral: "text.disabled", blue: "primary.main", transit: "info.main", green: "success.main", red: "error.main" };

// Rótulo de una ficha: banda de color según el estado, nombre en serif y los datos que van
// impresos en el envase (lote, vencimiento, GTIN) en una línea de pares etiqueta/valor.
export default function RecordHeader({ title, tone = "neutral", facts = [], chips }) {
    return (
        <Box sx={{ display: "flex", borderRadius: 1, overflow: "hidden", border: 1, borderColor: "divider", bgcolor: "background.paper" }}>
            <Box aria-hidden sx={{ width: 8, flexShrink: 0, bgcolor: TONE[tone] ?? TONE.neutral }} />
            <Box sx={{ p: { xs: 2, sm: 3 }, minWidth: 0, flexGrow: 1 }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ justifyContent: "space-between", alignItems: { sm: "flex-start" } }}>
                    <Typography variant="h4" component="h1" sx={{ overflowWrap: "anywhere" }}>
                        {title}
                    </Typography>
                    {chips && (
                        <Stack direction="row" spacing={1} sx={{ flexShrink: 0, flexWrap: "wrap", rowGap: 1, pt: { sm: 0.75 } }}>
                            {chips}
                        </Stack>
                    )}
                </Stack>
                {facts.length > 0 && (
                    <Box component="dl" sx={{ display: "flex", flexWrap: "wrap", columnGap: 4, rowGap: 1, m: 0, mt: 2 }}>
                        {facts.map(({ label, value, mono }) => (
                            <Box key={label} sx={{ minWidth: 0 }}>
                                <Typography component="dt" variant="caption" color="text.secondary">
                                    {label}
                                </Typography>
                                <Typography component="dd" sx={{ m: 0, fontWeight: 600, fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere", ...(mono && { fontFamily: '"IBM Plex Mono", monospace', fontWeight: 400 }) }}>
                                    {value || "—"}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>
        </Box>
    );
}
