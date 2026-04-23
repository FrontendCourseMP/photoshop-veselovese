import React from 'react';
import { Box, Typography } from '@mui/material';
import { TLoadedImage } from '../types/image';

interface StatusBarProps {
    image: TLoadedImage | null;
}

export const StatusBar: React.FC<StatusBarProps> = ({ image }) => {
    return (
        <Box
            sx={{
                minHeight: '3.2rem',
                backgroundColor: '#383838',
                display: 'flex',
                alignItems: 'center',
                px: 2,
                justifyContent: 'space-between',
                borderTop: '1px solid #ccc',
            }}
        >
            {image ? (
                <>
                    <Typography variant="caption" sx={{ mr: 2, color: '#ccc', fontSize: '1.4rem' }}>
                        {image.fileName}
                    </Typography>
                    <Typography variant="caption" sx={{ mr: 2, color: '#ccc', fontSize: '1.4rem' }}>
                        Размер: {image.width} x {image.height} px
                    </Typography>
                    <Typography variant="caption" sx={{ mr: 2, color: '#ccc', fontSize: '1.4rem' }}>
                        Формат: {image.format}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#ccc', fontSize: '1.4rem' }}>
                        Глубина цвета: {image.bitDepth} бит
                    </Typography>
                </>
            ) : (
                <Typography variant="caption" sx={{ color: '#ccc', fontSize: '1.4rem' }}>
                    Нет изображения
                </Typography>
            )}
        </Box>
    );
};