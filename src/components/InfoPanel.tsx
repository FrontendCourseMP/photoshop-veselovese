import React from 'react';
import { Box, Stack, Typography, } from '@mui/material';

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
        <Box sx={{ color: '#ccc', fontSize: '1.4rem', width: '100%' }}>
            <Typography variant="subtitle2" sx={{ mb: '0.8rem', fontWeight: 'bold', fontSize: '1.4rem' }}>
                Информация о цвете
            </Typography>

            {colorData ? (
                <Stack spacing={1} sx={{ fontSize: '1.2rem', color: '#ccc' }}>
                    <Box>
                        <Typography sx={{ fontSize: '1.2rem' }}>Координаты:</Typography>
                        <Typography sx={{ fontSize: '1.2rem' }}>
                            X: {colorData.x}, Y: {colorData.y}
                        </Typography>
                    </Box>

                    <Box>
                        <Typography sx={{ fontSize: '1.2rem' }}>RGB (0-255):</Typography>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                            <Box
                                sx={{
                                    width: 20, height: 20,
                                    backgroundColor: `rgb(${colorData.r},${colorData.g},${colorData.b})`,
                                    border: '1px solid #ccc'
                                }}
                            />
                            <Typography sx={{ fontSize: '1.2rem' }}>
                                R:{colorData.r} G:{colorData.g} B:{colorData.b}
                            </Typography>
                        </Box>
                    </Box>

                    <Box>
                        <Typography sx={{ fontSize: '1.2rem' }}>CIELAB:</Typography>
                        <Typography sx={{ fontSize: '1.2rem' }}>
                            L: {colorData.L}, A: {colorData.A}, B: {colorData.B}
                        </Typography>
                    </Box>
                </Stack>
            ) : (
                <Typography variant="caption" sx={{ fontSize: '1.2rem', color: '#ccc' }}>
                    Выберите инструмент "Пипетка" и кликните по изображению
                </Typography>
            )}
        </Box>
    );
};