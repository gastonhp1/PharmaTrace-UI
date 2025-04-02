import React from "react";
import { Container, Typography, Card, CardContent, Grid, Box } from "@mui/material";
import { ACTORS } from "../config/constants.js";

const ActorList = () => {
    return (
        <Container maxWidth="md">
            <Typography variant="h4" gutterBottom>
                Registered Actors
            </Typography>
            <Grid container spacing={3}>
                {Object.entries(ACTORS).map(([role, actor]) => (
                    <Grid item xs={12} sm={6} md={4} key={role}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6">{role.toUpperCase()}</Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Address: {actor.address}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Balance: {actor.balance} ETH
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Container>
    );
};

export default ActorList;
