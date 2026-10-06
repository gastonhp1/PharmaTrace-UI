import { useState } from "react";
import { Chip, Tooltip } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import { actorOf, shortAddress } from "../domain.js";

// Dirección abreviada (con el nombre del actor si es uno conocido). Al hacer click se copia entera.
export default function AddressChip({ address, size = "small", color = "default", showRole = true }) {
    const [copied, setCopied] = useState(false);
    if (!address) return null;

    const actor = actorOf(address);
    const label = actor && showRole ? `${actor.label} · ${shortAddress(address)}` : shortAddress(address);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // sin permiso de portapapeles: no hay nada que hacer
        }
    };

    return (
        <Tooltip title={copied ? "¡Copiada!" : `${address} (click para copiar)`}>
            <Chip
                size={size}
                color={color}
                variant="outlined"
                label={label}
                onClick={copy}
                icon={copied ? <CheckIcon /> : <ContentCopyIcon />}
                aria-label={`Copiar dirección ${address}`}
                sx={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", maxWidth: "100%" }}
            />
        </Tooltip>
    );
}
