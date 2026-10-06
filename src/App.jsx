import { useMemo } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { CssBaseline, ThemeProvider, useMediaQuery } from "@mui/material";
import { buildTheme } from "./theme.js";
import Layout from "./components/Layout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Trace from "./pages/Trace.jsx";
import Register from "./pages/Register.jsx";
import Transfer from "./pages/Transfer.jsx";
import Cargo from "./pages/Cargo.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
    const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
    const theme = useMemo(() => buildTheme(prefersDark ? "dark" : "light"), [prefersDark]);

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Routes>
                    <Route element={<Layout />}>
                        <Route index element={<Dashboard />} />
                        <Route path="trace/:batchId?" element={<Trace />} />
                        <Route path="register" element={<Register />} />
                        <Route path="transfer" element={<Transfer />} />
                        <Route path="cargo" element={<Cargo />} />
                        <Route path="*" element={<NotFound />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
}
