import { Alert, Step, StepLabel, Stepper } from "@mui/material";
import { CUSTODY_STEPS, custodyPosition, orgLabel } from "../domain.js";

// Recorrido del lote: Laboratorio -> Droguería -> Farmacia -> Dispensado.
export default function CustodyStepper({ batch }) {
    const { active, pending } = custodyPosition(batch);
    const recalled = batch.state === "RECALLED";
    return (
        <>
            <Stepper activeStep={active} alternativeLabel sx={{ mb: 2 }}>
                {CUSTODY_STEPS.map((step, i) => (
                    <Step key={step.key} completed={i < active || batch.state === "DISPENSED"}>
                        <StepLabel error={recalled && i === active} optional={i === active && pending ? "recepción pendiente" : undefined}>
                            {step.label}
                        </StepLabel>
                    </Step>
                ))}
            </Stepper>
            {pending && (
                <Alert severity="info" sx={{ mb: 1 }}>
                    En tránsito hacia {orgLabel(batch.pendingTo)}: falta que la reciba.
                </Alert>
            )}
            {recalled && (
                <Alert severity="error" sx={{ mb: 1 }}>
                    Retirado del mercado{batch.recallReason ? `: ${batch.recallReason}` : ""}. No puede cambiar de estado.
                </Alert>
            )}
        </>
    );
}
