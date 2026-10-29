import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
    AppBar, Box, Chip, Container, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Drawer, Toolbar, Tooltip, Typography, useMediaQuery, useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import DashboardIcon from "@mui/icons-material/SpaceDashboardOutlined";
import InventoryIcon from "@mui/icons-material/Inventory2Outlined";
import AddBoxIcon from "@mui/icons-material/AddBoxOutlined";
import LocalShippingIcon from "@mui/icons-material/LocalShippingOutlined";
import AcUnitIcon from "@mui/icons-material/AcUnit";
import MedicationIcon from "@mui/icons-material/MedicationOutlined";
import { checkApi, API_URL } from "../api.js";
import { useHasApiKey } from "../apiKey.js";
import ApiKeyDialog from "./ApiKeyDialog.jsx";

const NAV = [
    { to: "/", label: "Inicio", icon: DashboardIcon, end: true },
    { to: "/batches", label: "Lotes", icon: InventoryIcon },
    { to: "/register", label: "Registrar lote", icon: AddBoxIcon },
    { to: "/cargo", label: "Cargamentos", icon: LocalShippingIcon },
    { to: "/coldchain", label: "Cadena de frío", icon: AcUnitIcon },
];

const HEALTH = {
    checking: { label: "Verificando API…", color: "default" },
    ok: { label: "API en línea", color: "success" },
    "ledger-down": { label: "Sin red Fabric", color: "warning" },
    offline: { label: "API sin conexión", color: "error" },
    error: { label: "API con errores", color: "warning" },
};

function NavList({ onNavigate }) {
    return (
        <List sx={{ px: 1 }}>
            {NAV.map((item) => {
                const { to, label, end } = item;
                const Icon = item.icon;
                return (
                    <ListItemButton
                        key={to}
                        component={NavLink}
                        to={to}
                        end={end}
                        onClick={onNavigate}
                        sx={{ borderRadius: 2, mb: 0.5, "&.active": { bgcolor: "action.selected", color: "primary.main", "& .MuiListItemIcon-root": { color: "primary.main" } } }}
                    >
                        <ListItemIcon sx={{ minWidth: 40 }}>
                            <Icon />
                        </ListItemIcon>
                        <ListItemText primary={label} />
                    </ListItemButton>
                );
            })}
        </List>
    );
}

const DRAWER_WIDTH = 240;

export default function Layout() {
    const theme = useTheme();
    const desktop = useMediaQuery(theme.breakpoints.up("md"));
    const [open, setOpen] = useState(false);
    const [keyOpen, setKeyOpen] = useState(false);
    const [health, setHealth] = useState({ state: "checking" });
    const hasKey = useHasApiKey();

    const refresh = useCallback(async () => setHealth(await checkApi()), []);
    useEffect(() => {
        refresh();
        const id = setInterval(refresh, 30000);
        return () => clearInterval(id);
    }, [refresh]);

    const status = HEALTH[health.state] ?? HEALTH.error;

    return (
        <Box sx={{ display: "flex", minHeight: "100vh" }}>
            <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
                <Toolbar sx={{ gap: 1 }}>
                    {!desktop && (
                        <IconButton edge="start" aria-label="Abrir menú" onClick={() => setOpen(true)}>
                            <MenuIcon />
                        </IconButton>
                    )}
                    <MedicationIcon color="primary" />
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1, minWidth: 0 }} noWrap>
                        PharmaTrace
                    </Typography>
                    <Tooltip title={health.message || API_URL}>
                        <Chip size="small" color={status.color} label={status.label} onClick={refresh} />
                    </Tooltip>
                    <Tooltip title={hasKey ? "Clave de API cargada" : "Cargar la clave de API (necesaria para escribir)"}>
                        <IconButton aria-label="Clave de API" color={hasKey ? "primary" : "warning"} onClick={() => setKeyOpen(true)}>
                            <VpnKeyIcon />
                        </IconButton>
                    </Tooltip>
                </Toolbar>
            </AppBar>

            <Drawer
                variant={desktop ? "permanent" : "temporary"}
                open={desktop || open}
                onClose={() => setOpen(false)}
                ModalProps={{ keepMounted: true }}
                sx={{ width: desktop ? DRAWER_WIDTH : 0, flexShrink: 0, "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" } }}
            >
                <Toolbar />
                <NavList onNavigate={() => setOpen(false)} />
            </Drawer>

            <Box component="main" sx={{ flexGrow: 1, minWidth: 0 }}>
                <Toolbar />
                <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
                    {health.state === "offline" && (
                        <Typography color="error" role="status" sx={{ mb: 2 }}>
                            No se pudo conectar con la API en {API_URL}. Las pantallas van a fallar hasta que el backend esté levantado.
                        </Typography>
                    )}
                    <Outlet context={{ openApiKey: () => setKeyOpen(true), health }} />
                </Container>
            </Box>

            {keyOpen && <ApiKeyDialog open onClose={() => setKeyOpen(false)} />}
        </Box>
    );
}
