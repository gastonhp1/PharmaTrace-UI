import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Autocomplete, Box, InputAdornment, TextField, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { batchStateLabel, formatExpiryShort, matchesBatch } from "../domain.js";

// Buscador del vademécum: por producto, ID, número de lote o GTIN. Enter con texto libre abre el
// índice filtrado; elegir una sugerencia abre la ficha del lote.
export default function GlobalSearch({ batches }) {
    const navigate = useNavigate();
    const [text, setText] = useState("");

    return (
        <Autocomplete
            freeSolo
            size="small"
            options={batches ?? []}
            inputValue={text}
            value={null}
            blurOnSelect
            onInputChange={(_, value, reason) => reason !== "reset" && setText(value)}
            filterOptions={(options) => (text.trim() ? options.filter((b) => matchesBatch(b, text)).slice(0, 8) : [])}
            getOptionLabel={(option) => (typeof option === "string" ? option : option.product)}
            onChange={(_, value) => {
                if (!value) return;
                if (typeof value === "string") {
                    const q = value.trim();
                    const exact = (batches ?? []).find((b) => b.id.toLowerCase() === q.toLowerCase());
                    if (exact) navigate(`/batches/${encodeURIComponent(exact.id)}`);
                    else if (q) navigate(`/batches?q=${encodeURIComponent(q)}`);
                } else {
                    navigate(`/batches/${encodeURIComponent(value.id)}`);
                }
                setText("");
            }}
            renderOption={(props, b) => {
                const { key: _key, ...rest } = props;
                return (
                    <Box component="li" key={b.id} {...rest} sx={{ display: "block !important" }}>
                        <Typography sx={{ fontWeight: 600 }}>{b.product}</Typography>
                        <Typography variant="caption" color="text.secondary">
                            {b.id} · Lote {b.lot} · Vto. {formatExpiryShort(b.expiryDate)} · {batchStateLabel(b.state)}
                        </Typography>
                    </Box>
                );
            }}
            renderInput={(params) => (
                <TextField
                    {...params}
                    placeholder="Buscar producto, lote, GTIN o ID"
                    slotProps={{
                        htmlInput: { ...params.inputProps, "aria-label": "Buscar en el vademécum" },
                        input: {
                            ...params.InputProps,
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        },
                    }}
                />
            )}
            sx={{ width: "100%", maxWidth: 520 }}
        />
    );
}
