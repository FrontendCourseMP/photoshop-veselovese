import React from 'react';
import { Box, Typography } from '@mui/material';
import { TLoadedImage } from '../types/image';

export const RightToolbar = ({ }) => {
    return (
        <Box
            sx={{
                backgroundColor: '#eee',
                display: 'flex',
                alignItems: 'start',
                p: 2,
                borderBottom: '1px solid #ccc',
                fontSize: '0.8rem',
                height: '100%',
                minWidth: '250px',
            }}
        >
            <Typography variant="caption" color="textSecondary">
                Правая панель инструментов
            </Typography>
        </Box>
    );
};