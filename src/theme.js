import { alpha, createTheme } from "@mui/material/styles";

// Vademécum: papel blanco sobre un gris azulado frío, tinta azul noche y azul de vademécum como
// color de marca. El verde es el de la cruz de farmacia (conforme), el rojo queda reservado para
// retiros del mercado y el ámbar para vencimientos.
const LIGHT = {
    ink: "#16283A",
    inkSoft: "#4C6076",
    paper: "#FFFFFF",
    ground: "#F1F4F8",
    rule: "#D3DCE6",
    blue: "#1D4E89",
    green: "#1B7F4E",
    red: "#B3261E",
    amber: "#9A6200",
    transit: "#2B6CB0",
};
const DARK = {
    ink: "#E6EDF5",
    inkSoft: "#9DB0C4",
    paper: "#15202C",
    ground: "#0D151E",
    rule: "#2A3A4B",
    blue: "#8DB9F2",
    green: "#63C794",
    red: "#F28B82",
    amber: "#E5B45A",
    transit: "#7FB2EA",
};

export const SERIF = '"Source Serif 4 Variable", "Source Serif 4", Georgia, "Times New Roman", serif';
export const SANS = '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif';
export const MONO = '"IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

export function buildTheme(mode) {
    const c = mode === "dark" ? DARK : LIGHT;
    return createTheme({
        palette: {
            mode,
            primary: { main: c.blue },
            secondary: { main: c.green },
            success: { main: c.green },
            error: { main: c.red },
            warning: { main: c.amber },
            info: { main: c.transit },
            text: { primary: c.ink, secondary: c.inkSoft },
            divider: c.rule,
            background: { default: c.ground, paper: c.paper },
        },
        shape: { borderRadius: 6 },
        typography: {
            fontFamily: SANS,
            h4: { fontFamily: SERIF, fontWeight: 600, fontSize: "2rem", lineHeight: 1.15, letterSpacing: "-0.01em" },
            h5: { fontFamily: SERIF, fontWeight: 600, fontSize: "1.5rem", lineHeight: 1.2 },
            h6: { fontFamily: SERIF, fontWeight: 600, fontSize: "1.2rem", lineHeight: 1.3 },
            subtitle1: { fontWeight: 600 },
            subtitle2: { fontWeight: 600 },
            body2: { lineHeight: 1.5 },
            caption: { fontSize: "0.78rem", lineHeight: 1.4 },
            button: { textTransform: "none", fontWeight: 600 },
        },
        components: {
            MuiCssBaseline: {
                styleOverrides: {
                    code: { fontFamily: MONO, fontSize: "0.86em" },
                    "a:focus-visible, button:focus-visible": { outline: `2px solid ${c.blue}`, outlineOffset: 2 },
                },
            },
            MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 4 } } },
            MuiCard: {
                defaultProps: { variant: "outlined" },
                styleOverrides: { root: { borderColor: c.rule, borderRadius: 6 } },
            },
            MuiAppBar: { defaultProps: { elevation: 0, color: "default" } },
            MuiTextField: { defaultProps: { fullWidth: true } },
            MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 4, backgroundColor: c.paper } } },
            MuiChip: { styleOverrides: { root: { borderRadius: 4, fontWeight: 500 } } },
            MuiAlert: {
                styleOverrides: {
                    root: { borderRadius: 4, alignItems: "center" },
                    standardError: { border: `1px solid ${alpha(c.red, 0.35)}` },
                    standardSuccess: { border: `1px solid ${alpha(c.green, 0.35)}` },
                    standardInfo: { border: `1px solid ${alpha(c.transit, 0.3)}` },
                    standardWarning: { border: `1px solid ${alpha(c.amber, 0.4)}` },
                },
            },
            MuiTableCell: { styleOverrides: { head: { fontWeight: 600, color: c.inkSoft } } },
            MuiTooltip: { styleOverrides: { tooltip: { fontSize: "0.78rem" } } },
        },
    });
}
