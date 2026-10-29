import { Chip } from "@mui/material";
import { daysToExpiry, formatDate } from "../domain.js";

export default function ExpiryChip({ date }) {
    const days = daysToExpiry(date);
    if (days === null) return <Chip size="small" variant="outlined" label={date || "—"} />;
    if (days < 0) return <Chip size="small" color="error" label={`Vencido · ${formatDate(date)}`} />;
    if (days <= 90) return <Chip size="small" color="warning" label={`Vence en ${days} d · ${formatDate(date)}`} />;
    return <Chip size="small" variant="outlined" label={`Vence ${formatDate(date)}`} />;
}
