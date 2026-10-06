import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Card, CardActionArea, CardContent, Chip, Stack, Typography } from "@mui/material";
import ScienceIcon from "@mui/icons-material/Science";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import LocalPharmacyIcon from "@mui/icons-material/LocalPharmacy";
import PersonIcon from "@mui/icons-material/Person";
import SearchIcon from "@mui/icons-material/Search";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import PageHeader from "../components/PageHeader.jsx";
import AddressChip from "../components/AddressChip.jsx";
import { API_URL, pingApi } from "../api.js";
import { CHAIN, STATES } from "../domain.js";

const ACTOR_ICONS = {
    laboratory: ScienceIcon,
    distributor: LocalShippingIcon,
    warehouse: WarehouseIcon,
    pharmacy: LocalPharmacyIcon,
    patient: PersonIcon,
};

const SHORTCUTS = [
    { to: "/trace", title: "Trazar un lote", text: "Estado actual y recorrido completo.", icon: SearchIcon },
    { to: "/register", title: "Registrar un lote", text: "Da de alta un lote nuevo (lo firma el laboratorio).", icon: AddCircleOutlineIcon },
    { to: "/transfer", title: "Transferir un lote", text: "Pasalo al siguiente actor de la cadena.", icon: SwapHorizIcon },
    { to: "/cargo", title: "Cargamentos", text: "Agrupá lotes y movelos juntos.", icon: Inventory2Icon },
];

export default function Dashboard() {
    const [online, setOnline] = useState(null); // null = verificando

    const check = useCallback(async () => {
        setOnline(null);
        setOnline(await pingApi());
    }, []);

    useEffect(() => {
        check();
    }, [check]);

    return (
        <>
            <PageHeader
                title="PharmaTrace"
                subtitle="Trazabilidad de medicamentos sobre blockchain: de la fábrica al paciente."
            />

            <Card sx={{ mb: 4 }}>
                <CardContent>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                        <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                API
                            </Typography>
                            <Chip
                                size="small"
                                label={online === null ? "Verificando…" : online ? "En línea" : "Sin conexión"}
                                color={online === null ? "default" : online ? "success" : "error"}
                            />
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
                            >
                                {API_URL}
                            </Typography>
                        </Stack>
                        <Button size="small" onClick={check} disabled={online === null}>
                            Reintentar
                        </Button>
                    </Stack>
                    {online === false && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                            Levantá el backend (<code>cd backend && npm start</code>) o corregí <code>VITE_API_URL</code> en{" "}
                            <code>.env</code>. Tiene que apuntar a la API (puerto 3001), no al nodo de Hardhat.
                        </Typography>
                    )}
                </CardContent>
            </Card>

            <Typography variant="h5" gutterBottom>
                Cadena de custodia
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
                Un lote solo puede pasar al siguiente actor, y el estado lo fija el rol de quien lo recibe. Al final, el
                paciente lo marca «{STATES[5].label}».
            </Typography>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(5, 1fr)" },
                    gap: 2,
                    mb: 5,
                }}
            >
                {CHAIN.map((actor, i) => {
                    const Icon = ACTOR_ICONS[actor.key];
                    return (
                        <Card key={actor.key}>
                            <CardContent>
                                <Stack spacing={1} alignItems="flex-start">
                                    <Stack direction="row" alignItems="center" gap={1} sx={{ color: "primary.main" }}>
                                        <Icon />
                                        <Typography variant="overline" color="text.secondary">
                                            {i + 1} de {CHAIN.length}
                                        </Typography>
                                    </Stack>
                                    <Typography variant="h6">{actor.label}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {i === 0 ? "Registra los lotes" : `Estado al recibir: ${STATES[i].label}`}
                                    </Typography>
                                    <AddressChip address={actor.address} showRole={false} />
                                </Stack>
                            </CardContent>
                        </Card>
                    );
                })}
            </Box>

            <Typography variant="h5" gutterBottom>
                ¿Qué querés hacer?
            </Typography>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
                    gap: 2,
                }}
            >
                {SHORTCUTS.map((shortcut) => {
                    const Icon = shortcut.icon;
                    return (
                        <Card key={shortcut.to}>
                            <CardActionArea component={RouterLink} to={shortcut.to} sx={{ height: "100%" }}>
                                <CardContent>
                                    <Icon color="primary" sx={{ mb: 1 }} />
                                    <Typography variant="h6">{shortcut.title}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {shortcut.text}
                                    </Typography>
                                </CardContent>
                            </CardActionArea>
                        </Card>
                    );
                })}
            </Box>
        </>
    );
}
