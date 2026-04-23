import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { TLoadedImage } from '../types/image';
import { ChannelConfig } from '../types/channel';

interface CanvasViewProps {
    originalData: ImageData | null;
    visibleChannels: Record<string, boolean>;
    availableChannels: ChannelConfig[];
    activeTool: 'cursor' | 'eyedropper';
    onPixelPicked?: (x: number, y: number, r: number, g: number, b: number) => void;
}

export const CanvasView: React.FC<CanvasViewProps> = ({
    originalData,
    visibleChannels,
    availableChannels,
    activeTool,
    onPixelPicked
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!originalData || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = originalData.width;
        canvas.height = originalData.height;

        const newBuffer = new Uint8ClampedArray(originalData.data);
        const len = newBuffer.length;

        availableChannels.forEach(ch => {
            if (ch.key === 'gray') return;

            if (!visibleChannels[ch.key]) {
                for (let i = ch.index; i < len; i += 4) {
                    newBuffer[i] = 0;
                }
            }
        });

        const grayChannel = availableChannels.find(ch => ch.key === 'gray');
        if (grayChannel) {
            if (!visibleChannels['gray']) {
                for (let i = 0; i < len; i += 4) {
                    newBuffer[i] = 0;       // R
                    newBuffer[i + 1] = 0;   // G
                    newBuffer[i + 2] = 0;   // B
                }
            }
        }

        const alphaChannel = availableChannels.find(ch => ch.key === 'a');
        if (alphaChannel) {
            if (!visibleChannels['a']) {
                // Делаем пиксели непрозрачными (255)
                for (let i = 3; i < len; i += 4) {
                    newBuffer[i] = 255;
                }
            }
        }

        const renderedImageData = new ImageData(newBuffer, originalData.width, originalData.height);
        ctx.putImageData(renderedImageData, 0, 0);

    }, [originalData, visibleChannels, availableChannels]);

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (activeTool !== 'eyedropper' || !originalData || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = Math.floor((e.clientX - rect.left) * scaleX);
        const y = Math.floor((e.clientY - rect.top) * scaleY);

        if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;

        const index = (y * canvas.width + x) * 4;

        const r = originalData.data[index];
        const g = originalData.data[index + 1];
        const b = originalData.data[index + 2];

        onPixelPicked?.(x, y, r, g, b);
    };

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
            {originalData && (
                <canvas
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    style={{
                        boxShadow: '0 0 10px rgba(0,0,0,0.5)',
                        maxWidth: 'calc(100% - 2.4rem*2)',
                        maxHeight: 'calc(100% - 2.4rem*2)',
                        width: 'auto',
                        height: 'auto'
                    }}
                />
            )}
            {!originalData && (
                <Typography variant="caption" sx={{ color: '#ccc', fontSize: '1.6rem', textAlign: 'center' }}>Загрузите изображение через кнопку меню "Открыть"</Typography>
            )}
        </Box>
    );
};