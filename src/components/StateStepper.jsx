import { Step, StepLabel, Stepper, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { STATES, stateIndex } from "../domain.js";

// Progreso de un lote por los 6 estados. Horizontal en pantallas anchas, vertical en el celular.
export default function StateStepper({ currentState }) {
    const theme = useTheme();
    const narrow = useMediaQuery(theme.breakpoints.down("md"));
    const current = stateIndex(currentState);
    // En el último estado (En uso) la cadena terminó: se marcan todos los pasos como completos.
    const activeStep = current === STATES.length - 1 ? STATES.length : current;

    return (
        <Stepper activeStep={activeStep} alternativeLabel={!narrow} orientation={narrow ? "vertical" : "horizontal"}>
            {STATES.map((state) => (
                <Step key={state.key}>
                    <StepLabel>{state.label}</StepLabel>
                </Step>
            ))}
        </Stepper>
    );
}
