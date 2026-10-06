import { createTheme } from "@mui/material/styles";

export function buildTheme(mode) {
    const dark = mode === "dark";
    return createTheme({
        palette: {
            mode,
            primary: { main: dark ? "#4fd1c5" : "#0f766e" },
            secondary: { main: dark ? "#a5b4fc" : "#4f46e5" },
            background: dark ? { default: "#0b1114", paper: "#121a1e" } : { default: "#f4f7f8", paper: "#ffffff" },
        },
        shape: { borderRadius: 12 },
        typography: {
            fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
            h4: { fontWeight: 700, letterSpacing: "-0.01em" },
            h5: { fontWeight: 700 },
            h6: { fontWeight: 600 },
            button: { textTransform: "none", fontWeight: 600 },
        },
        components: {
            MuiButton: { defaultProps: { disableElevation: true } },
            MuiCard: { defaultProps: { variant: "outlined" } },
            MuiAppBar: { defaultProps: { elevation: 0, color: "default" } },
            MuiTextField: { defaultProps: { fullWidth: true } },
        },
    });
}
