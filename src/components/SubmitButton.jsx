import { Button, CircularProgress } from "@mui/material";

export default function SubmitButton({ loading, children, startIcon, ...props }) {
    return (
        <Button
            type="submit"
            variant="contained"
            disabled={loading || props.disabled}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : startIcon}
            {...props}
        >
            {children}
        </Button>
    );
}
