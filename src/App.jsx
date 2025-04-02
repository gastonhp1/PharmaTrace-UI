import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import ActorList from "./components/ActorList";
import RegisterDrug from "./components/RegisterDrug";
import TransferDrug from "./components/TransferDrug";
import TraceDrug from "./components/TraceDrug";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";

const theme = createTheme({
    palette: {
        primary: { main: "#1976d2" },
        secondary: { main: "#dc004e" },
        background: { default: "#f4f6f8" },
    },
    typography: { fontFamily: "Roboto, sans-serif" },
});

const App = () => {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
                <Navbar />
                <Routes>
                    <Route path="/" element={<ActorList />} />
                    <Route path="/register" element={<RegisterDrug />} />
                    <Route path="/transfer" element={<TransferDrug />} />
                    <Route path="/trace" element={<TraceDrug />} />
                </Routes>
            </Router>
        </ThemeProvider>
    );
};

export default App;
