import React from 'react';
import { Box, Stack, Typography, Divider } from '@mui/material';

interface ColorData {
    x: number;
    y: number;
    r: number;
    g: number;
    b: number;
    L?: number;
    A?: number;
    B?: number;
}

interface InfoPanelProps {
    colorData: ColorData | null;
}

export const InfoPanel: React.FC<InfoPanelProps> = ({ colorData }) => {
    return (
        <Box sx={{ width: 250, backgroundColor: '#f5f5f5', borderLeft: '1px solid #ddd', p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                Информация
            </Typography>

            {colorData ? (
                <Stack spacing={1} sx={{ fontSize: '0.9rem' }}>
                    <Box>
                        <Typography variant="caption" color="textSecondary">Координаты:</Typography>
                        <Typography variant="body2">X: {colorData.x}, Y: {colorData.y}</Typography>
                    </Box>

                    <Divider />

                    <Box>
                        <Typography variant="caption" color="textSecondary">RGB (0-255):</Typography>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                            <Box
                                sx={{
                                    width: 20, height: 20,
                                    backgroundColor: `rgb(${colorData.r},${colorData.g},${colorData.b})`,
                                    border: '1px solid #ccc'
                                }}
                            />
                            <Typography variant="body2">
                                R:{colorData.r} G:{colorData.g} B:{colorData.b}
                            </Typography>
                        </Box>
                    </Box>

                    <Divider />

                    <Box>
                        <Typography variant="caption" color="textSecondary">CIELAB:</Typography>
                        <Typography variant="body2">
                            L: {colorData.L}, A: {colorData.A}, B: {colorData.B}
                        </Typography>
                    </Box>
                </Stack>
            ) : (
                <Typography variant="caption" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                    Выберите инструмент "Пипетка" и кликните по изображению.
                </Typography>
            )}
        </Box>
    );
};