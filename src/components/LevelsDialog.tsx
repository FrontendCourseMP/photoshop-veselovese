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
    gamma: number;
}

interface LevelsDialogProps {
    open: boolean;
    onClose: () => void;
    onApply: (newImageData: ImageData) => void;
    onPreviewChange: (data: ImageData | null) => void;
    originalData: ImageData | null;
}

const defaultConfig: LevelsConfig = { black: 0, white: 255, gamma: 128 };

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

    // Применение уровней к данным (предпросмотр)
    const applyPreview = useCallback(() => {
        if (!originalData || !previewEnabled) {
            onPreviewChange(null);
            return;
        }

        const cfg = settings[channel];
        const range = Math.max(1, cfg.white - cfg.black);
        const midPos = cfg.gamma - cfg.black;
        let gamma = midPos === 0 || midPos === range ? 1.0 : Math.log(0.5) / Math.log(midPos / range);
        gamma = Math.max(0.1, Math.min(9.9, gamma));

        const createLUTForChannel = (black: number, white: number) => {
            const r = Math.max(1, white - black);
            const m = cfg.gamma - black;
            const g = Math.max(0.1, Math.min(9.9, m === 0 || m === r ? 1.0 : Math.log(0.5) / Math.log(m / r)));
            const invGamma = 1 / g;
            const lut = new Uint8Array(256);
            for (let i = 0; i < 256; i++) {
                if (i <= black) {
                    lut[i] = 0;
                } else if (i >= white) {
                    lut[i] = 255;
                }
                else {
                    lut[i] = Math.round(255 * Math.pow((i - black) / r, invGamma));
                }
            }
            return lut;
        };

        const masterLUT = channel === 'master' ? createLUTForChannel(cfg.black, cfg.white) : null;

        const rLUT = channel === 'master' ? masterLUT : channel === 'r' ? createLUTForChannel(settings.r.black, settings.r.white) : null;
        const gLUT = channel === 'master' ? masterLUT : channel === 'g' ? createLUTForChannel(settings.g.black, settings.g.white) : null;
        const bLUT = channel === 'master' ? masterLUT : channel === 'b' ? createLUTForChannel(settings.b.black, settings.b.white) : null;
        const aLUT = channel === 'a' ? createLUTForChannel(settings.a.black, settings.a.white) : null;

        const newData = new ImageData(new Uint8ClampedArray(originalData.data), originalData.width, originalData.height);
        const data = newData.data;

        for (let i = 0; i < data.length; i += 4) {
            if (rLUT) data[i] = rLUT[data[i]];
            if (gLUT) data[i + 1] = gLUT[data[i + 1]];
            if (bLUT) data[i + 2] = bLUT[data[i + 2]];
            if (aLUT) data[i + 3] = aLUT[data[i + 3]];
        }
        onPreviewChange(newData);
    }, [originalData, previewEnabled, settings, channel, createLUT, onPreviewChange]);

    // Обработчики ползунков с throttling
    const updateSetting = useCallback((key: keyof LevelsConfig, value: number) => {
        setSettings(prev => {
            const current = prev[channel];
            let updated = { ...current, [key]: value };

            updated.gamma = Math.max(updated.black + 1, Math.min(updated.gamma, updated.white - 1));
            updated.black = Math.min(updated.black, updated.gamma - 1);
            updated.white = Math.max(updated.white, updated.gamma + 1);

            return { ...prev, [channel]: updated };
        });

        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => applyPreview());
    }, [channel, applyPreview]);

    const handleReset = () => {
        setSettings(prev => ({ ...prev, [channel]: { ...defaultConfig } }));
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => applyPreview());
    };

    const handleApply = () => {
        if (previewEnabled && originalData) {
            applyPreview();
        }

        const newData = originalData ? new ImageData(new Uint8ClampedArray(originalData.data), originalData.width, originalData.height) : null;
        if (newData) {
            const cfg = settings[channel];
            const masterLUT = channel === 'master' ? createLUT(cfg.black, cfg.white, cfg.gamma) : null;
            const rLUT = channel === 'master' ? masterLUT : channel === 'r' ? createLUT(settings.r.black, settings.r.white, settings.r.gamma) : null;
            const gLUT = channel === 'master' ? masterLUT : channel === 'g' ? createLUT(settings.g.black, settings.g.white, settings.g.gamma) : null;
            const bLUT = channel === 'master' ? masterLUT : channel === 'b' ? createLUT(settings.b.black, settings.b.white, settings.b.gamma) : null;
            const aLUT = channel === 'a' ? createLUT(settings.a.black, settings.a.white, settings.a.gamma) : null;

            const d = newData.data;
            for (let i = 0; i < d.length; i += 4) {
                if (rLUT) d[i] = rLUT[d[i]];
                if (gLUT) d[i + 1] = gLUT[d[i + 1]];
                if (bLUT) d[i + 2] = bLUT[d[i + 2]];
                if (aLUT) d[i + 3] = aLUT[d[i + 3]];
            }
            onApply(newData);
        }
        onClose();
    };

    // Сброс превью при закрытии/отмене
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

                <Box sx={{ px: 1 }}>
                    <Typography variant="body2" sx={{ mb: 0.5, color: '#aaa' }}>Точка черного</Typography>
                    <Slider
                        value={settings[channel].black}
                        min={0}
                        max={254}
                        onChange={(_, v) => updateSetting('black', v as number)}
                        sx={{ color: '#666', '& .MuiSlider-thumb': { width: 12, height: 12 } }}
                    />

                    <Typography variant="body2" sx={{ mb: 0.5, color: '#aaa', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Гамма (Gamma)</span>
                    </Typography>
                    <Slider
                        value={settings[channel].gamma}
                        min={settings[channel].black + 1}
                        max={settings[channel].white - 1}
                        onChange={(_, v) => updateSetting('gamma', v as number)}
                        sx={{ color: '#aaa', '& .MuiSlider-thumb': { width: 14, height: 14 } }}
                    />

                    <Typography variant="body2" sx={{ mb: 0.5, color: '#aaa' }}>Точка белого</Typography>
                    <Slider
                        value={settings[channel].white}
                        min={1}
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