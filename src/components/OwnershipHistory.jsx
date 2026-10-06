import { Step, StepLabel, Stepper, Typography } from "@mui/material";
import AddressChip from "./AddressChip.jsx";
import { actorOf } from "../domain.js";

// Historial de dueños de un lote, del primero al actual.
export default function OwnershipHistory({ history }) {
    if (!history?.length) {
        return <Typography color="text.secondary">Sin movimientos registrados.</Typography>;
    }

    return (
        <Stepper orientation="vertical" activeStep={history.length - 1}>
            {history.map((address, i) => (
                <Step key={`${address}-${i}`} completed={i < history.length - 1}>
                    <StepLabel
                        optional={<AddressChip address={address} />}
                        slotProps={{ label: { sx: { fontWeight: i === history.length - 1 ? 700 : 400 } } }}
                    >
                        {i === history.length - 1 ? "Dueño actual" : `Paso ${i + 1}`}
                        {actorOf(address) ? ` — ${actorOf(address).label}` : ""}
                    </StepLabel>
                </Step>
            ))}
        </Stepper>
    );
}
