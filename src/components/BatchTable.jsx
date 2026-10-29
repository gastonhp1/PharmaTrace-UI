import { Link as RouterLink } from "react-router-dom";
import { Link, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import StateChip from "./StateChip.jsx";
import ExpiryChip from "./ExpiryChip.jsx";
import OrgChip from "./OrgChip.jsx";

export default function BatchTable({ batches, empty = "No hay lotes para mostrar." }) {
    if (!batches?.length) return <Typography color="text.secondary">{empty}</Typography>;
    return (
        <TableContainer component={Paper} variant="outlined">
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Lote</TableCell>
                        <TableCell>Producto</TableCell>
                        <TableCell>Estado</TableCell>
                        <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Vencimiento</TableCell>
                        <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Cargamento</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {batches.map((b) => (
                        <TableRow key={b.id} hover>
                            <TableCell>
                                <Link component={RouterLink} to={`/batches/${encodeURIComponent(b.id)}`} underline="hover" sx={{ fontWeight: 600 }}>
                                    {b.id}
                                </Link>
                            </TableCell>
                            <TableCell>
                                {b.product}
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                    Lote {b.lot}
                                </Typography>
                            </TableCell>
                            <TableCell>
                                <StateChip state={b.state} />
                                {b.pendingTo && <OrgChip mspId={b.pendingTo} showMsp={false} sx={{ ml: 0.5 }} label={`→ ${b.pendingTo}`} />}
                            </TableCell>
                            <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                                <ExpiryChip date={b.expiryDate} />
                            </TableCell>
                            <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                                {b.cargo ? (
                                    <Link component={RouterLink} to={`/cargo/${encodeURIComponent(b.cargo)}`} underline="hover">
                                        {b.cargo}
                                    </Link>
                                ) : (
                                    "—"
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
