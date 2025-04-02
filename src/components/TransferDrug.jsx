import React, { useState } from "react";
import { RPC_URL } from "../config.js";
import { Box, TextField, Button, Typography, Container, MenuItem, Select, FormControl, InputLabel } from "@mui/material";

const TransferDrug = () => {
    const [batchId, setBatchId] = useState("");
    const [toAddress, setToAddress] = useState("");
    const [newState, setNewState] = useState("");
    const [message, setMessage] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await fetch(`${RPC_URL}/api/transfer`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ batchId, toAddress, newState: parseInt(newState) })
            });

            const result = await response.json();
            setMessage(result.message || "✅ Drug transferred successfully!");
        } catch (error) {
            setMessage(`❌ Error: ${error.message}`);
        }
    };

    return (
        <Container maxWidth="sm">
            <Typography variant="h4" gutterBottom>Transfer Drug</Typography>
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField label="Batch ID" value={batchId} onChange={(e) => setBatchId(e.target.value)} fullWidth />
                <TextField label="Destination Address" value={toAddress} onChange={(e) => setToAddress(e.target.value)} fullWidth />
                <FormControl fullWidth>
                    <InputLabel>New State</InputLabel>
                    <Select value={newState} onChange={(e) => setNewState(e.target.value)} label="New State">
                        <MenuItem value={1}>InDistribution</MenuItem>
                        <MenuItem value={2}>InTransit</MenuItem>
                        <MenuItem value={3}>InPharmacy</MenuItem>
                        <MenuItem value={4}>Delivered</MenuItem>
                        <MenuItem value={5}>InUse</MenuItem>
                    </Select>
                </FormControl>
                <Button type="submit" variant="contained">Transfer</Button>
            </Box>
            {message && <Typography variant="body1" color="error">{message}</Typography>}
        </Container>
    );
};

export default TransferDrug;
