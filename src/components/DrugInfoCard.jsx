import React, { useState } from "react";
import { fetchDrugInfo } from "../services/api";
import { TextField, Button, Typography, Paper } from "@mui/material";

const DrugInfoCard = () => {
    const [batchId, setBatchId] = useState("");
    const [drugInfo, setDrugInfo] = useState(null);
    const [error, setError] = useState(null);

    const handleFetch = async () => {
        try {
            const data = await fetchDrugInfo(batchId);
            setDrugInfo(data);
            setError(null);
        } catch (err) {
            setError("Failed to fetch drug info.");
            console.error(err);
        }
    };

    return (
        <Paper elevation={3} sx={{ padding: 2, marginTop: 2 }}>
            <Typography variant="h4">Trace Drug</Typography>
            <TextField
                label="Batch ID"
                variant="outlined"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                fullWidth
                sx={{ marginBottom: 2 }}
            />
            <Button variant="contained" onClick={handleFetch}>
                Fetch Drug Info
            </Button>

            {error && <Typography color="error">{error}</Typography>}

            {drugInfo && (
                <div>
                    <Typography variant="h5">Drug Info</Typography>
                    <Typography>Name: {drugInfo.name}</Typography>
                    <Typography>Manufacturer: {drugInfo.manufacturer}</Typography>
                    <Typography>Production Date: {drugInfo.productionDate}</Typography>
                    <Typography>Current Owner: {drugInfo.currentOwner}</Typography>
                    <Typography variant="h6">Transfer History:</Typography>
                    <ul>
                        {drugInfo.history.map((addr, index) => (
                            <li key={index}>{addr}</li>
                        ))}
                    </ul>
                </div>
            )}
        </Paper>
    );
};

export default DrugInfoCard;
