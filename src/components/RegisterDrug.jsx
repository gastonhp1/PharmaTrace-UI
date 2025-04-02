import React, { useState } from "react";
import { RPC_URL } from "../config.js";
import { Box, TextField, Button, Typography, Container } from "@mui/material";

const RegisterDrug = () => {
    const [batchId, setBatchId] = useState("");
    const [drugName, setDrugName] = useState("");
    const [manufacturer, setManufacturer] = useState("");
    const [message, setMessage] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await fetch(`${RPC_URL}/api/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ batchId, drugName, manufacturer })
            });

            const result = await response.json();
            setMessage(result.message || "✅ Drug registered successfully!");
        } catch (error) {
            setMessage(`❌ Error: ${error.message}`);
        }
    };

    return (
        <Container maxWidth="sm">
            <Typography variant="h4" gutterBottom>Register Drug</Typography>
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField label="Batch ID" value={batchId} onChange={(e) => setBatchId(e.target.value)} fullWidth />
                <TextField label="Drug Name" value={drugName} onChange={(e) => setDrugName(e.target.value)} fullWidth />
                <TextField label="Manufacturer" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} fullWidth />
                <Button type="submit" variant="contained">Register</Button>
            </Box>
            {message && <Typography variant="body1" color="error">{message}</Typography>}
        </Container>
    );
};

export default RegisterDrug;
