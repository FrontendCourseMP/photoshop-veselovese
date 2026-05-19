import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, FormControl, InputLabel, Select, MenuItem,
    Checkbox, FormControlLabel, Box, Typography, Slider,
    Switch
} from '@mui/material';

type ChannelKey = 'master' | 'r' | 'g' | 'b' | 'a';

interface LevelsConfig {
    black: number;
    white: number;
    midtone: number;
}

interface LevelsDialogProps {
    open: boolean;
    onClose: () => void;
    onApply: (newImageData: ImageData) => void;
    onPreviewChange: (data: ImageData | null) => void;
    originalData: ImageData | null;
}

const defaultConfig: LevelsConfig = { black: 0, white: 255, midtone: 128 };

export const LevelsDialog: React.FC<LevelsDialogProps> = ({
    open, onClose, onApply, onPreviewChange, originalData
}) => {
    const [channel, setChannel] = useState<ChannelKey>('master');
    const [logScale, setLogScale] = useState(false);
    const [previewEnabled, setPreviewEnabled] = useState(true);
    const [settings, setSettings] = useState<Record<ChannelKey, LevelsConfig>>({
        master: { ...defaultConfig },
        r: { ...defaultConfig },
        g: { ...defaultConfig },
        b: { ...defaultConfig },
        a: { ...defaultConfig }
    });

    const histogramCanvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number | null>(null);

    const settingsRef = useRef(settings);
    useEffect(() => { settingsRef.current = settings; }, [settings]);

    // Расчет гистограммы
    const histogramData = useMemo(() => {
        if (!originalData) return new Array(256).fill(0);
        const hist = new Array(256).fill(0);
        const data = originalData.data;
        for (let i = 0; i < data.length; i += 4) {
            let val: number;
            if (channel === 'master') {
                val = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
            } else if (channel === 'a') {
                val = data[i + 3];
            } else {
                val = data[i + (channel === 'r' ? 0 : channel === 'g' ? 1 : 2)];
            }
            hist[Math.round(val)]++;
        }
        return hist;
    }, [originalData, channel]);

    // Отрисовка гистограммы
    useEffect(() => {
        if (!open || !histogramCanvasRef.current || histogramData.length === 0) return;

        const canvas = histogramCanvasRef.current;
        if (!canvas || histogramData.length === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const rafId = requestAnimationFrame(() => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const maxVal = Math.max(...histogramData);
            const scaleX = canvas.width / 255;
            const scaleY = canvas.height / (logScale ? Math.log1p(maxVal) : maxVal || 1);
            const divisor = logScale ? Math.log1p(maxVal || 1) : (maxVal || 1);


            ctx.fillStyle = '#aaa';
            histogramData.forEach((count, i) => {
                const height = logScale ? Math.log1p(count) : count;
                const h = (height / divisor) * canvas.height;
                ctx.fillRect(i * scaleX, canvas.height - h, scaleX, Math.max(0, h));
            });
        });
        return () => cancelAnimationFrame(rafId);

    }, [open, histogramData, logScale]);

    // Генерация LUT
    const createLUT = useCallback((black: number, white: number, gamma: number) => {
        const lut = new Uint8Array(256);
        const range = Math.max(1, white - black);
        const invGamma = 1 / Math.max(0.01, gamma);
        for (let i = 0; i < 256; i++) {
            if (i <= black) lut[i] = 0;
            else if (i >= white) lut[i] = 255;
            else lut[i] = Math.round(255 * Math.pow((i - black) / range, invGamma));
        }
        return lut;
    }, []);

    const calculateGammaFromMidtone = useCallback((black: number, midtone: number, white: number): number => {
        const range = white - black;
        const midPos = midtone - black;
        if (range <= 0 || midPos <= 0 || midPos >= range) return 1.0;
        // Формула: гамма, при которой середина диапазона отображается в 0.5
        const gamma = Math.log(0.5) / Math.log(midPos / range);
        return Math.max(0.1, Math.min(9.9, gamma));
    }, []);

    // Применение уровней к данным - предпросмотр
    const applyPreview = useCallback((currentSettings?: Record<ChannelKey, LevelsConfig>) => {
        if (!originalData || !previewEnabled) {
            onPreviewChange(null);
            return;
        }

        const cfg = currentSettings || settingsRef.current;

        const isAllDefault = (c: LevelsConfig) => c.black === 0 && c.white === 255 && c.midtone === 128;
        if (Object.values(cfg).every(isAllDefault)) {
            onPreviewChange(null);
            return;
        }

        const getLUT = (c: LevelsConfig) => {
            const gamma = calculateGammaFromMidtone(c.black, c.midtone, c.white);
            return createLUT(c.black, c.white, gamma);
        };

        const masterLUT = channel === 'master' ? getLUT(cfg.master) : null;
        const rLUT = channel === 'master' ? masterLUT : getLUT(cfg.r);
        const gLUT = channel === 'master' ? masterLUT : getLUT(cfg.g);
        const bLUT = channel === 'master' ? masterLUT : getLUT(cfg.b);
        const aLUT = channel === 'a' ? getLUT(cfg.a) : null;

        const newData = new ImageData(new Uint8ClampedArray(originalData.data), originalData.width, originalData.height);
        const data = newData.data;
        for (let i = 0; i < data.length; i += 4) {
            if (rLUT) data[i] = rLUT[data[i]];
            if (gLUT) data[i + 1] = gLUT[data[i + 1]];
            if (bLUT) data[i + 2] = bLUT[data[i + 2]];
            if (aLUT) data[i + 3] = aLUT[data[i + 3]];
        }
        onPreviewChange(newData);
    }, [originalData, previewEnabled, channel, createLUT, calculateGammaFromMidtone]);

    // Обработчики ползунков с throttling
    const updateSetting = useCallback((key: keyof LevelsConfig, value: number) => {
        setSettings(prev => {
            const current = prev[channel];
            let updated = { ...current };
            console.log(updated);
            console.log('Updating', channel, key, value);

            if (key === 'black') {
                updated.black = Math.min(value, current.midtone - 1);
            } else if (key === 'white') {
                updated.white = Math.max(value, current.midtone + 1);
            } else if (key === 'midtone') {
                updated.midtone  = Math.max(current.black + 1, Math.min(value, current.white - 1));
            }

            return { ...prev, [channel]: updated };
        });

        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
        }
        rafRef.current = requestAnimationFrame(() => applyPreview());
    }, [channel, applyPreview]);

    const handleReset = () => {
        const resetCfg = {
            master: { ...defaultConfig }, r: { ...defaultConfig }, g: { ...defaultConfig }, b: { ...defaultConfig }, a: { ...defaultConfig }
        };
        setSettings(resetCfg);

        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => applyPreview(resetCfg));
    };

    const handleApply = () => {
        if (!originalData) {
            onClose();
            return;
        }

        const cfg = settingsRef.current[channel];

        const isDefault = cfg.black === 0 && cfg.white === 255 && cfg.midtone === 128;
        const allChannelsDefault = Object.values(settingsRef.current).every(
            (c: LevelsConfig) => c.black === 0 && c.white === 255 && c.midtone === 128
        );

        if (allChannelsDefault) {
            // Просто применяем оригинальные данные без LUT
            onApply(new ImageData(new Uint8ClampedArray(originalData.data), originalData.width, originalData.height));
            onClose();
            return;
        }

        const getLUT = (c: LevelsConfig) => {
            const gamma = calculateGammaFromMidtone(c.black, c.midtone, c.white);
            return createLUT(c.black, c.white, gamma);
        };

        const masterLUT = channel === 'master' ? getLUT(settingsRef.current.master) : null;
        const rLUT = channel === 'master' ? masterLUT : getLUT(settingsRef.current.r);
        const gLUT = channel === 'master' ? masterLUT : getLUT(settingsRef.current.g);
        const bLUT = channel === 'master' ? masterLUT : getLUT(settingsRef.current.b);
        const aLUT = channel === 'a' ? getLUT(settingsRef.current.a) : null;

        const newData = new ImageData(new Uint8ClampedArray(originalData.data), originalData.width, originalData.height);
        const data = newData.data;

        for (let i = 0; i < data.length; i += 4) {
            if (rLUT) data[i] = rLUT[data[i]];
            if (gLUT) data[i + 1] = gLUT[data[i + 1]];
            if (bLUT) data[i + 2] = bLUT[data[i + 2]];
            if (aLUT) data[i + 3] = aLUT[data[i + 3]];
        }

        onApply(newData);
        onClose();
    };

    // Сброс превью при закрытии или отмене
    useEffect(() => {
        if (!open) {
            onPreviewChange(null);
            setPreviewEnabled(true);
            setSettings({
                master: { ...defaultConfig }, r: { ...defaultConfig }, g: { ...defaultConfig }, b: { ...defaultConfig }, a: { ...defaultConfig }
            });
            setChannel('master');
        }
    }, [open]);

    if (!open) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth sx={{ '& .MuiDialog-paper': { bgcolor: '#2d2d2d', color: '#eee' } }}>
            <DialogTitle sx={{ color: '#fff', fontWeight: 'bold' }}>Коррекция "Уровни" (Levels)</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 120, bgcolor: '#3c3c3c', borderRadius: 1 }}>
                        <InputLabel sx={{ color: '#ccc' }}>Канал</InputLabel>
                        <Select value={channel} label="Канал" onChange={(e) => setChannel(e.target.value as ChannelKey)} sx={{ color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: '#555' } }}>
                            <MenuItem value="master">Master (RGB)</MenuItem>
                            <MenuItem value="r">Красный (R)</MenuItem>
                            <MenuItem value="g">Зеленый (G)</MenuItem>
                            <MenuItem value="b">Синий (B)</MenuItem>
                            <MenuItem value="a">Альфа (A)</MenuItem>
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
                        max={255}
                        onChange={(_, v) => updateSetting('black', v as number)}
                        sx={{ color: '#fff', '& .MuiSlider-thumb': { width: 12, height: 12 } }}
                    />

                    <Typography variant="body2" sx={{ mb: 0.5, color: '#aaa', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Полутона (Gamma)</span>
                    </Typography>
                    <Slider
                        value={settings[channel].midtone}
                        min={0}
                        max={255}
                        onChange={(_, v) => updateSetting('midtone', v as number)}
                        sx={{ color: '#fff', '& .MuiSlider-thumb': { width: 14, height: 14 } }}
                    />

                    <Typography variant="body2" sx={{ mb: 0.5, color: '#aaa' }}>Точка белого</Typography>
                    <Slider
                        value={settings[channel].white}
                        min={0}
                        max={255}
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