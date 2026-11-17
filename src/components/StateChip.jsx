import { Box, Chip } from "@mui/material";
import { BATCH_STATES, CARGO_STATES, VERDICTS } from "../domain.js";

const TABLES = { batch: BATCH_STATES, cargo: CARGO_STATES, verdict: VERDICTS };
// Los estados que piden atención van llenos; el resto, con contorno y un punto de color.
const FILLED = new Set(["RECALLED", "QUARANTINED", "COMPROMISED"]);

export default function StateChip({ kind = "batch", state, ...props }) {
    const info = TABLES[kind][state];
    const color = info?.color ?? "default";
    if (FILLED.has(state)) return <Chip size="small" color={color} label={info?.label ?? state} {...props} />;
    return (
        <Chip
            size="small"
            variant="outlined"
            label={info?.label ?? state ?? "—"}
            icon={<Box component="span" sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color === "default" ? "text.disabled" : `${color}.main`, ml: "8px !important" }} />}
            {...props}
        />
    );
}
