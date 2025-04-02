import React, { useState } from "react";
import { RPC_URL } from "../config.js";
import { Container, Typography, TextField, Button, Box, Card, CardContent, Divider } from "@mui/material";

const TraceDrug = () => {
    const [batchId, setBatchId] = useState("");
    const [drugInfo, setDrugInfo] = useState(null);
    const [history, setHistory] = useState([]);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setDrugInfo(null);
        setHistory([]);

        try {
            const response = await fetch(`${RPC_URL}/api/drug/${batchId}`);
            const result = await response.json();

            if (result.error) {
                setError(result.error);
            } else {
                setDrugInfo(result.drugInfo);
                setHistory(result.history);
            }
        } catch (err) {
            setError(`❌ Error fetching drug trace: ${err.message}`);
        }
    };

    return (
        <Container maxWidth="md">
            <Typography variant="h4" gutterBottom>
                Trace Drug
            </Typography>
            <Box component="form" onSubmit={handleSubmit} sx={{ mb: 3 }}>
                <TextField
                    label="Batch ID"
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                    fullWidth
                    margin="normal"
                />
                <Button type="submit" variant="contained" fullWidth>
                    Trace Drug
                </Button>
            </Box>

            {error && (
                <Typography color="error" gutterBottom>
                    {error}
                </Typography>
            )}

            {drugInfo && (
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h5" gutterBottom>Drug Info</Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Typography><strong>Name:</strong> {drugInfo.name}</Typography>
                        <Typography><strong>Manufacturer:</strong> {drugInfo.manufacturer}</Typography>
                        <Typography><strong>Production Date:</strong> {drugInfo.productionDate}</Typography>
                        <Typography><strong>Current State:</strong> {drugInfo.currentState}</Typography>
                        <Typography><strong>Current Owner:</strong> {drugInfo.currentOwner}</Typography>
                    </CardContent>
                </Card>
            )}

            {history.length > 0 && (
                <Card>
                    <CardContent>
                        <Typography variant="h5" gutterBottom>Transfer History</Typography>
                        <Divider sx={{ mb: 2 }} />
                        {history.map((entry, index) => (
                            <Typography key={index}>{index + 1}. {entry}</Typography>
                        ))}
                    </CardContent>
                </Card>
            )}
        </Container>
    );
};

export default TraceDrug;
