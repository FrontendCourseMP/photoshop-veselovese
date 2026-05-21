import React from 'react';
import { Box, FormControl, MenuItem, Select, Typography } from '@mui/material';
import { TLoadedImage } from '../types/image';

interface StatusBarProps {
    image: TLoadedImage | null;
    viewScale?: number;
    onScaleChange?: (scale: number) => void;
}

const ZOOM_OPTIONS = [12, 25, 33, 50, 67, 75, 100, 125, 150, 200, 250, 300];

export const StatusBar: React.FC<StatusBarProps> = ({ image, viewScale = 100, onScaleChange }) => {
    const zoomOptions = ZOOM_OPTIONS.includes(viewScale)
        ? ZOOM_OPTIONS
        : [...ZOOM_OPTIONS, viewScale].sort((a, b) => a - b);

    return (
        <Box
            sx={{
                minHeight: '4rem',
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
                    {onScaleChange && (
                        <Box sx={{ display: 'flex', alignItems: 'center', }}>
                            <Typography variant="caption" sx={{ mr: 2, color: '#ccc', fontSize: '1.4rem' }}>Масштаб:</Typography>
                            <FormControl size="small" sx={{ minWidth: 80 }}>
                                <Select value={viewScale} onChange={e => onScaleChange(Number(e.target.value))} sx={{ color: '#ccc', fontSize: '1.4rem', backgroundColor: '#383838', }}>
                                    {zoomOptions.map(z => (
                                        <MenuItem key={z} value={z} sx={{ color: '#ccc', fontSize: '1.4rem', backgroundColor: '#383838', }}>{z}%</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                    )}
                </>
            ) : (
                <Typography variant="caption" sx={{ color: '#ccc', fontSize: '1.4rem' }}>
                    Нет изображения
                </Typography>
            )}
        </Box>
    );
};