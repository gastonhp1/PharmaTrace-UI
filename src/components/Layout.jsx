import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
    AppBar, Box, Chip, Container, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Tooltip, Typography, useMediaQuery, useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import VpnKeyIcon from "@mui/icons-material/VpnKeyOutlined";
import HubIcon from "@mui/icons-material/HubOutlined";
import MenuBookIcon from "@mui/icons-material/MenuBookOutlined";
import NoteAddIcon from "@mui/icons-material/NoteAddOutlined";
import LocalShippingIcon from "@mui/icons-material/LocalShippingOutlined";
import AcUnitIcon from "@mui/icons-material/AcUnit";
import { checkApi, API_URL } from "../api.js";
import { useHasApiKey } from "../apiKey.js";
import { useCatalog } from "../hooks/useCatalog.js";
import ApiKeyDialog from "./ApiKeyDialog.jsx";
import GlobalSearch from "./GlobalSearch.jsx";

const NAV = [
    { to: "/", label: "Panorama", icon: HubIcon, end: true },
    { to: "/batches", label: "Vademécum de lotes", icon: MenuBookIcon },
    { to: "/register", label: "Registrar lote", icon: NoteAddIcon },
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

function Brand() {
    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexShrink: 0 }}>
            <Box component="svg" viewBox="0 0 32 32" aria-hidden sx={{ width: 30, height: 30 }}>
                <rect width="32" height="32" rx="6" fill="currentColor" style={{ color: "var(--brand)" }} />
                <path d="M13 6h6v7h7v6h-7v7h-6v-7H6v-6h7z" fill="#fff" />
            </Box>
            <Box sx={{ lineHeight: 1 }}>
                <Typography component="div" sx={{ fontFamily: (t) => t.typography.h6.fontFamily, fontWeight: 600, fontSize: "1.2rem", lineHeight: 1.1 }}>
                    PharmaTrace
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", sm: "block" }, lineHeight: 1.2 }}>
                    Vademécum de trazabilidad
                </Typography>
            </Box>
        </Box>
    );
}

function NavList({ onNavigate }) {
    return (
        <List component="nav" aria-label="Secciones" sx={{ px: 0, py: 1.5 }}>
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
                        sx={{
                            pl: 2.5,
                            borderLeft: 3,
                            borderColor: "transparent",
                            "&.active": { borderColor: "primary.main", bgcolor: "action.hover", color: "primary.main", "& .MuiListItemIcon-root": { color: "primary.main" } },
                            "&.active .MuiListItemText-primary": { fontWeight: 600 },
                        }}
                    >
                        <ListItemIcon sx={{ minWidth: 38 }}>
                            <Icon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={label} />
                    </ListItemButton>
                );
            })}
        </List>
    );
}

const DRAWER_WIDTH = 248;

export default function Layout() {
    const theme = useTheme();
    const desktop = useMediaQuery(theme.breakpoints.up("md"));
    const { pathname } = useLocation();
    const [open, setOpen] = useState(false);
    const [keyOpen, setKeyOpen] = useState(false);
    const [health, setHealth] = useState({ state: "checking" });
    const hasKey = useHasApiKey();
    const catalog = useCatalog();
    const reloadCatalog = catalog.reload;

    const refresh = useCallback(async () => setHealth(await checkApi()), []);
    useEffect(() => {
        refresh();
        const id = setInterval(refresh, 30000);
        return () => clearInterval(id);
    }, [refresh]);

    // El catálogo se vuelve a pedir al cambiar de pantalla: así el buscador y el índice ven lo
    // que se acaba de registrar o mover.
    useEffect(() => {
        reloadCatalog();
    }, [pathname, reloadCatalog]);

    const status = HEALTH[health.state] ?? HEALTH.error;
    const search = <GlobalSearch batches={catalog.batches} />;

    return (
        <Box sx={{ display: "flex", minHeight: "100vh", "--brand": theme.palette.primary.main }}>
            <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
                <Toolbar sx={{ gap: { xs: 1, sm: 2 } }}>
                    {!desktop && (
                        <IconButton edge="start" aria-label="Abrir menú" onClick={() => setOpen(true)}>
                            <MenuIcon />
                        </IconButton>
                    )}
                    <Brand />
                    <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center", minWidth: 0, px: { md: 2 } }}>{desktop && search}</Box>
                    <Tooltip title={health.message || API_URL}>
                        <Chip size="small" variant="outlined" color={status.color} label={status.label} onClick={refresh} />
                    </Tooltip>
                    <Tooltip title={hasKey ? "Clave de API cargada" : "Cargar la clave de API (necesaria para escribir)"}>
                        <IconButton aria-label="Clave de API" color={hasKey ? "primary" : "warning"} onClick={() => setKeyOpen(true)}>
                            <VpnKeyIcon />
                        </IconButton>
                    </Tooltip>
                </Toolbar>
                {!desktop && <Toolbar variant="dense" sx={{ pb: 1 }}>{search}</Toolbar>}
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
                {!desktop && <Toolbar variant="dense" sx={{ pb: 1 }} />}
                <Container maxWidth="lg" sx={{ py: { xs: 2.5, sm: 4 } }}>
                    {health.state === "offline" && (
                        <Typography color="error" role="status" sx={{ mb: 2 }}>
                            No se pudo conectar con la API en {API_URL}. Las pantallas van a fallar hasta que el backend esté levantado.
                        </Typography>
                    )}
                    <Outlet context={{ openApiKey: () => setKeyOpen(true), health, catalog }} />
                </Container>
            </Box>

            {keyOpen && <ApiKeyDialog open onClose={() => setKeyOpen(false)} />}
        </Box>
    );
}
