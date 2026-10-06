import { FormControl, FormHelperText, InputLabel, MenuItem, Select } from "@mui/material";
import { CHAIN, STATES, chainIndexOf } from "../domain.js";

// Selector de destinatario para transferir un lote o un cargamento.
//
// El contrato solo deja pasar al *siguiente* actor de la cadena, y el estado resultante lo fija
// el rol del receptor. Por eso la persona elige a quién se lo manda y el estado se deriva solo:
// el valor del select es el índice del actor en CHAIN, que es también el `newState` a enviar.
// Si el dueño actual no es un actor conocido, no se puede saber cuál es el siguiente y se
// habilitan todos (si no corresponde, el contrato lo rechaza con un mensaje claro).
export default function RecipientSelect({ ownerAddress, value, onChange, disabled = false }) {
    const ownerIndex = chainIndexOf(ownerAddress);
    const known = ownerIndex >= 0;

    return (
        <FormControl fullWidth required disabled={disabled}>
            <InputLabel id="recipient-label">Destinatario</InputLabel>
            <Select
                labelId="recipient-label"
                label="Destinatario"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
                {CHAIN.slice(1).map((actor, i) => {
                    const index = i + 1;
                    return (
                        <MenuItem key={actor.key} value={String(index)} disabled={known && index !== ownerIndex + 1}>
                            {actor.label} (pasa a «{STATES[index].label}»)
                        </MenuItem>
                    );
                })}
            </Select>
            <FormHelperText>
                {known
                    ? "Solo se puede pasar al siguiente actor de la cadena."
                    : "No se reconoce al dueño actual entre los actores configurados: se habilitan todos."}
            </FormHelperText>
        </FormControl>
    );
}
