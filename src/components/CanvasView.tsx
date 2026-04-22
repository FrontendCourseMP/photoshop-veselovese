import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { TLoadedImage } from '../types/image';

interface CanvasViewProps {
    image: TLoadedImage | null;
}

export const CanvasView: React.FC<CanvasViewProps> = ({ image }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (image && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                canvas.width = image.width;
                canvas.height = image.height;
                ctx.putImageData(image.pixelData, 0, 0);
            }
        }
    }, [image]);

    return (
        <Box
            sx={{
                flexGrow: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#1e1e1e',
                overflow: 'hidden',
                height: '100%',
                maxHeight: 'calc(100vh - 4.8rem - 3.2rem)',
            }}
        >
            {image && (
                <canvas
                    ref={canvasRef}
                    style={{
                        boxShadow: '0 0 10px rgba(0,0,0,0.5)',
                        maxWidth: 'calc(100% - 2.4rem*2)',
                        maxHeight: 'calc(100% - 2.4rem*2',
                        width: 'auto',
                        height: 'auto'
                    }}
                />
            )}
            {!image && (
                <Typography variant="caption" sx={{ color: '#ccc', fontSize: '1.6rem' }}>Загрузите изображение через кнопку меню "Открыть"</Typography>
            )}
        </Box>
    );
};