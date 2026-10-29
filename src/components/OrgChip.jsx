import { Chip } from "@mui/material";
import { ORGS } from "../domain.js";

// Chip con el nombre de la org y su MSP (LabMSP -> "Laboratorio · LabMSP").
export default function OrgChip({ mspId, showMsp = true, ...props }) {
    if (!mspId) return <Chip size="small" label="—" variant="outlined" {...props} />;
    const org = ORGS[mspId];
    return <Chip size="small" variant="outlined" label={org && showMsp ? `${org.label} · ${mspId}` : org?.label ?? mspId} {...props} />;
}
