import { Chip } from "@mui/material";
import { BATCH_STATES, CARGO_STATES, VERDICTS } from "../domain.js";

const TABLES = { batch: BATCH_STATES, cargo: CARGO_STATES, verdict: VERDICTS };

export default function StateChip({ kind = "batch", state, ...props }) {
    const info = TABLES[kind][state];
    return <Chip size="small" color={info?.color ?? "default"} label={info?.label ?? state ?? "—"} {...props} />;
}
