import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, FormControl, InputLabel, Select, MenuItem,
    Checkbox, FormControlLabel, Box, Typography, Slider,
    Switch
} from '@mui/material';
import { ChannelKey } from '../types/channel';
import {
    LevelsSettings,
    createDefaultSettings,
    applyLevelsToImageData,
    calculateHistogram,
    updateLevelSetting as updateLevelSettingUtil
} from '../utils/levels';

interface LevelsDialogProps {
    open: boolean;
    onClose: () => void;
    onApply: (newImageData: ImageData) => void;
    onPreviewChange: (data: ImageData | null) => void;
    originalData: ImageData | null;
    maxValue: number;
    availableChannelKeys: ChannelKey[];
}

export const LevelsDialog: React.FC<LevelsDialogProps> = ({
    open, onClose, onApply, onPreviewChange, originalData, maxValue, availableChannelKeys
}) => {
    const [channel, setChannel] = useState<ChannelKey>('master');
    const [logScale, setLogScale] = useState(false);
    const [previewEnabled, setPreviewEnabled] = useState(true);
    const [settings, setSettings] = useState<LevelsSettings>(() =>
        createDefaultSettings(255)
    );

    const histogramCanvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number | null>(null);
    const settingsRef = useRef(settings);

    useEffect(() => { settingsRef.current = settings; }, [settings]);

    const applyPreview = useCallback(() => {
        if (!originalData || !previewEnabled) {
            onPreviewChange(null);
            return;
        }
        const result = applyLevelsToImageData(originalData, settingsRef.current, channel, maxValue);
        onPreviewChange(result);
    }, [originalData, previewEnabled, channel, maxValue]);

    const updateSetting = useCallback((key: keyof LevelsSettings['master'], value: number) => {
        setSettings(prev => updateLevelSettingUtil(prev, channel, key, value));

        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => applyPreview());
    }, [channel, applyPreview]);

    const handleReset = () => {
        const resetCfg = createDefaultSettings(maxValue);
        setSettings(resetCfg);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => applyPreview());
    };

    const handleApply = () => {
        const result = applyLevelsToImageData(originalData!, settingsRef.current, channel, maxValue);
        if (result) {
            onApply(result);
        } else {
            // Если изменений нет, просто применяем оригинал
            onApply(new ImageData(
                new Uint8ClampedArray(originalData!.data),
                originalData!.width,
                originalData!.height
            ));
        }
        onClose();
    };

    // Расчет гистограммы
    const histogramData = useMemo(() => {
        if (!originalData) return new Array(256).fill(0);
        return calculateHistogram(originalData, channel, maxValue);
    }, [originalData, channel, maxValue]);

    useEffect(() => {
        if (!open || !originalData || histogramData.every(v => v === 0)) return;

        let animationFrameId: number;

        const drawHistogram = () => {
            const canvas = histogramCanvasRef.current;

            if (!canvas) {
                animationFrameId = requestAnimationFrame(drawHistogram);
                return;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const maxVal = Math.max(...histogramData);
            if (maxVal === 0) return;

            const scaleX = canvas.width / 255;
            const divisor = logScale ? Math.log1p(maxVal) : maxVal;

            ctx.fillStyle = '#aaa';
            for (let i = 0; i <= maxValue; i++) {
                const count = histogramData[i] || 0;
                const height = logScale ? Math.log1p(count) : count;
                const h = (height / divisor) * canvas.height;
                ctx.fillRect(i * scaleX, canvas.height - h, scaleX, Math.max(0, h));
            }

            ctx.fillStyle = '#666';
            ctx.font = '10px sans-serif';
            ctx.fillText('0', 2, canvas.height - 2);
            ctx.fillText(String(Math.round(maxValue / 2)), canvas.width / 2 - 10, canvas.height - 2);
            ctx.fillText(String(maxValue), canvas.width - 20, canvas.height - 2);
        };

        drawHistogram();

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [open, histogramData, logScale, originalData, maxValue]);

    // Сброс превью при закрытии или отмене
    useEffect(() => {
        if (!open) {
            onPreviewChange(null);
            setPreviewEnabled(true);
            setSettings(createDefaultSettings(maxValue));
            setChannel('master');
        }
    }, [open, maxValue]);

    if (!open) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth sx={{ '& .MuiDialog-paper': { bgcolor: '#2d2d2d', color: '#eee' } }}>
            <DialogTitle sx={{ color: '#fff', fontWeight: 'bold' }}>Коррекция "Уровни" (Levels)</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 120, bgcolor: '#3c3c3c', borderRadius: 1 }}>
                        <InputLabel sx={{ color: '#ccc' }}>Канал</InputLabel>
                        <Select
                            value={channel}
                            label="Канал"
                            onChange={(e) => setChannel(e.target.value as ChannelKey)}
                            sx={{ color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: '#555' } }}
                        >
                            {availableChannelKeys.includes('master') && (
                                <MenuItem value="master">Master (RGB)</MenuItem>
                            )}
                            {availableChannelKeys.includes('r') && (
                                <MenuItem value="r">Красный (R)</MenuItem>
                            )}
                            {availableChannelKeys.includes('g') && (
                                <MenuItem value="g">Зеленый (G)</MenuItem>
                            )}
                            {availableChannelKeys.includes('b') && (
                                <MenuItem value="b">Синий (B)</MenuItem>
                            )}
                            {availableChannelKeys.includes('gray') && (
                                <MenuItem value="gray">Grayscale (G)</MenuItem>
                            )}
                            {availableChannelKeys.includes('a') && (
                                <MenuItem value="a">Альфа (A)</MenuItem>
                            )}
                        </Select>
                    </FormControl>
                    <FormControlLabel control={<Switch checked={logScale} onChange={(e) => setLogScale(e.target.checked)} />} label="Логарифмическая шкала" />
                    <FormControlLabel control={<Checkbox checked={previewEnabled} onChange={(e) => { setPreviewEnabled(e.target.checked); if (!e.target.checked) onPreviewChange(null); else applyPreview(); }} />} label="Предпросмотр" />
                </Box>

                <Box sx={{ width: '100%', height: 150, bgcolor: '#1a1a1a', borderRadius: 2, overflow: 'hidden', mb: 2, position: 'relative' }}>
                    <canvas ref={histogramCanvasRef} width={600} height={150} style={{ width: '100%', height: '100%' }} />
                </Box>

                <Box sx={{ px: 1, mt: 2 }}>
                    <Typography variant="body2" sx={{ mb: 0.5, color: '#aaa' }}>Точка черного</Typography>
                    <Slider
                        value={settings[channel].black}
                        min={0}
                        max={maxValue}
                        onChange={(_, v) => updateSetting('black', v as number)}
                        sx={{ color: '#fff', '& .MuiSlider-thumb': { width: 12, height: 12 } }}
                    />

                    <Typography variant="body2" sx={{ mb: 0.5, color: '#aaa', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Полутона (Gamma)</span>
                    </Typography>
                    <Slider
                        value={settings[channel].midtone}
                        min={0}
                        max={maxValue}
                        onChange={(_, v) => updateSetting('midtone', v as number)}
                        sx={{ color: '#fff', '& .MuiSlider-thumb': { width: 14, height: 14 } }}
                    />

                    <Typography variant="body2" sx={{ mb: 0.5, color: '#aaa' }}>Точка белого</Typography>
                    <Slider
                        value={settings[channel].white}
                        min={0}
                        max={maxValue}
                        onChange={(_, v) => updateSetting('white', v as number)}
                        sx={{ color: '#fff', '& .MuiSlider-thumb': { width: 12, height: 12 } }}
                    />
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={handleReset} sx={{ color: '#aaa' }}>Сброс</Button>
                <Button onClick={onClose} sx={{ color: '#f44336' }}>Отмена</Button>
                <Button onClick={handleApply} variant="contained" sx={{ bgcolor: '#2196f3' }}>Применить</Button>
            </DialogActions>
        </Dialog>
    );
};