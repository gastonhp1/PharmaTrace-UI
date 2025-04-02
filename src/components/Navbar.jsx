import React from "react";
import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
import { Link } from "react-router-dom";

const Navbar = () => {
    return (
        <AppBar position="static">
            <Toolbar>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    PharmaTrace
                </Typography>
                <Box>
                    <Button color="inherit" component={Link} to="/">Actor List</Button>
                    <Button color="inherit" component={Link} to="/register">Register Drug</Button>
                    <Button color="inherit" component={Link} to="/transfer">Transfer Drug</Button>
                    <Button color="inherit" component={Link} to="/trace">Trace Drug</Button>
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Navbar;
