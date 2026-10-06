import { AppBar, Box, Container, Tab, Tabs, Toolbar, Typography } from "@mui/material";
import MedicationIcon from "@mui/icons-material/Medication";
import { Link, Outlet, useLocation } from "react-router-dom";

const NAV = [
    { to: "/", label: "Inicio" },
    { to: "/trace", label: "Trazar" },
    { to: "/register", label: "Registrar" },
    { to: "/transfer", label: "Transferir" },
    { to: "/cargo", label: "Cargamentos" },
];

export default function Layout() {
    const { pathname } = useLocation();
    const active = NAV.find((item) => item.to !== "/" && pathname.startsWith(item.to))?.to ?? (pathname === "/" ? "/" : false);

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
            <AppBar position="sticky" sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
                <Container maxWidth="lg">
                    <Toolbar disableGutters sx={{ gap: 2, flexWrap: "wrap" }}>
                        <Box
                            component={Link}
                            to="/"
                            sx={{ display: "flex", alignItems: "center", gap: 1, color: "primary.main", textDecoration: "none" }}
                        >
                            <MedicationIcon />
                            <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
                                PharmaTrace
                            </Typography>
                        </Box>
                        <Tabs
                            value={active}
                            variant="scrollable"
                            scrollButtons="auto"
                            allowScrollButtonsMobile
                            sx={{ flexGrow: 1, minWidth: 0 }}
                            aria-label="Navegación principal"
                        >
                            {NAV.map((item) => (
                                <Tab key={item.to} component={Link} to={item.to} value={item.to} label={item.label} />
                            ))}
                        </Tabs>
                    </Toolbar>
                </Container>
            </AppBar>
            <Container maxWidth="lg" component="main" sx={{ py: 4 }}>
                <Outlet />
            </Container>
        </Box>
    );
}
