import { Box, Checkbox, Typography, Divider, Stack } from '@mui/material';
import { ChannelConfig } from '../types/channel';

interface ChannelsPanelProps {
    originalData: ImageData | null;
    channels: ChannelConfig[];
    visibleState: Record<string, boolean>;
    onToggleChannel: (key: string) => void;
}

export const ChannelsPanel: React.FC<ChannelsPanelProps> = ({ originalData, channels, visibleState, onToggleChannel }) => {
    const createThumbnail = (channelIndex: number): string | null => {
        if (!originalData) return null;

        const size = 60;
        const canvas = document.createElement('canvas');
        canvas.width = originalData.width;
        canvas.height = originalData.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const tempImageData = new ImageData(
            new Uint8ClampedArray(originalData.data),
            originalData.width,
            originalData.height
        );

        // Рисуем в градациях серого для превью
        for (let i = 0; i < tempImageData.data.length; i += 4) {
            const val = tempImageData.data[i + channelIndex];
            tempImageData.data[i] = val;
            tempImageData.data[i + 1] = val;
            tempImageData.data[i + 2] = val;
        }

        ctx.putImageData(tempImageData, 0, 0);

        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = size;
        thumbCanvas.height = size;
        const thumbCtx = thumbCanvas.getContext('2d');
        if (!thumbCtx) return null;

        thumbCtx.drawImage(canvas, 0, 0, size, size);
        return thumbCanvas.toDataURL();
    };

    if (channels.length === 0) {
        return (
            <Box sx={{ width: 200, p: 2, color: '#777' }}>
                Загрузите изображение...
            </Box>
        );
    }

    return (
        <Box sx={{ width: 200, backgroundColor: '#f5f5f5', borderRight: '1px solid #ddd', p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>Каналы</Typography>
            <Stack spacing={1}>
                {channels.map((ch) => (
                    <Box
                        key={ch.key}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            p: 1,
                            borderRadius: 1,
                            '&:hover': { backgroundColor: '#e0e0e0' },
                            cursor: 'pointer'
                        }}
                        onClick={() => onToggleChannel(ch.key)}
                    >
                        <Checkbox
                            checked={visibleState[ch.key] ?? false}
                            size="small"
                            sx={{ p: 0.5 }}
                            onClick={(e) => e.stopPropagation()}
                        />

                        <Box
                            component="img"
                            src={createThumbnail(ch.index) || ''}
                            sx={{ width: 40, height: 40, mr: 2, borderRadius: 0.5, border: '1px solid #ccc' }}
                        />

                        <Typography variant="caption" sx={{ fontSize: '0.8rem' }}>
                            {ch.label}
                        </Typography>
                    </Box>
                ))}
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" color="textSecondary">
                Снимите галочку, чтобы скрыть канал.
            </Typography>
        </Box>
    );
};