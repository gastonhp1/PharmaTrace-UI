import React from "react";
import {
    Timeline,
    TimelineItem,
    TimelineSeparator,
    TimelineDot,
    TimelineConnector,
    TimelineContent,
    TimelineOppositeContent,
} from "@mui/lab";
import { Paper, Typography } from "@mui/material";

function TransferTimeline({ history }) {
    return (
        <Paper elevation={3} sx={{ mt: 4, p: 2 }}>
            <Typography variant="h6" gutterBottom>📚 Transfer History</Typography>
            <Timeline position="alternate">
                {history.map((addr, i) => (
                    <TimelineItem key={i}>
                        <TimelineOppositeContent>Step {i + 1}</TimelineOppositeContent>
                        <TimelineSeparator>
                            <TimelineDot color="primary" />
                            {i < history.length - 1 && <TimelineConnector />}
                        </TimelineSeparator>
                        <TimelineContent>
                            <Typography>{addr}</Typography>
                        </TimelineContent>
                    </TimelineItem>
                ))}
            </Timeline>
        </Paper>
    );
}

export default TransferTimeline;
