import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, FormControl, InputLabel, Select, MenuItem,
    Checkbox, FormControlLabel, Box, Typography, Slider,
    Switch
} from '@mui/material';
import { ChannelKey } from '../types/channel';

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
    maxValue: number;
    availableChannelKeys: ChannelKey[];
}

const defaultConfig = (maxValue: number): LevelsConfig => ({
    black: 0,
    white: maxValue,
    midtone: Math.round(maxValue / 2)
});

export const LevelsDialog: React.FC<LevelsDialogProps> = ({
    open, onClose, onApply, onPreviewChange, originalData, maxValue, availableChannelKeys
}) => {
    const [channel, setChannel] = useState<ChannelKey>('master');
    const [logScale, setLogScale] = useState(false);
    const [previewEnabled, setPreviewEnabled] = useState(true);
    const [settings, setSettings] = useState<Record<ChannelKey, LevelsConfig>>(() => {
        const cfg = defaultConfig(255);
        return {
            master: { ...cfg },
            r: { ...cfg },
            g: { ...cfg },
            b: { ...cfg },
            a: { ...cfg },
            gray: { ...cfg }
        };
    });

    const histogramCanvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number | null>(null);
    const settingsRef = useRef(settings);
    useEffect(() => { settingsRef.current = settings; }, [settings]);

    const processImageData = useCallback((currentSettings: Record<ChannelKey, LevelsConfig>): ImageData | null => {
        if (!originalData) return null;

        const isDefault = (c: LevelsConfig) => c.black === 0 && c.white === maxValue && c.midtone === Math.round(maxValue / 2);
        if (Object.values(currentSettings).every(isDefault)) return null; // Без изменений

        // Преобразование логических в физические
        const toPhys = (v: number) => Math.round(v * (255 / maxValue));

        const buildLUT = (c: LevelsConfig) => {
            const b = toPhys(c.black), w = toPhys(c.white);
            const range = Math.max(1, w - b);
            const mRange = c.white - c.black, mPos = c.midtone - c.black;
            let gamma = (mRange > 0 && mPos > 0 && mPos < mRange) ? Math.log(0.5) / Math.log(mPos / mRange) : 1.0;
            gamma = Math.max(0.1, Math.min(9.9, gamma));
            const invGamma = 1 / gamma;

            const lut = new Uint8Array(256);
            for (let i = 0; i < 256; i++) {
                if (i <= b) lut[i] = 0;
                else if (i >= w) lut[i] = 255;
                else lut[i] = Math.round(255 * Math.pow((i - b) / range, invGamma));
            }
            return lut;
        };

        // const masterLUT = channel === 'master' ? buildLUT(currentSettings.master) : null;
        // const getLUT = (k: ChannelKey) => channel === 'master' ? masterLUT : buildLUT(currentSettings[k]);

        // const rLUT = (channel === 'master' || channel === 'r' || channel === 'gray') ? getLUT(channel === 'gray' ? 'gray' : 'r') : null;
        // const gLUT = (channel === 'master' || channel === 'g') ? getLUT('g') : null;
        // const bLUT = (channel === 'master' || channel === 'b') ? getLUT('b') : null;
        // const aLUT = channel === 'a' ? buildLUT(currentSettings.a) : null;

        let rLUT: Uint8Array | null = null;
        let gLUT: Uint8Array | null = null;
        let bLUT: Uint8Array | null = null;
        let aLUT: Uint8Array | null = null;

        if (channel === 'master') {
            const lut = buildLUT(currentSettings.master);
            rLUT = gLUT = bLUT = lut;
        } else if (channel === 'gray') {
            const lut = buildLUT(currentSettings.gray);
            rLUT = gLUT = bLUT = lut;
        } else if (channel === 'r') {
            rLUT = buildLUT(currentSettings.r);
        } else if (channel === 'g') {
            gLUT = buildLUT(currentSettings.g);
        } else if (channel === 'b') {
            bLUT = buildLUT(currentSettings.b);
        } else if (channel === 'a') {
            aLUT = buildLUT(currentSettings.a);
        }

        const newData = new ImageData(new Uint8ClampedArray(originalData.data), originalData.width, originalData.height);
        const d = newData.data;
        for (let i = 0; i < d.length; i += 4) {
            if (rLUT) d[i] = rLUT[d[i]];
            if (gLUT) d[i + 1] = gLUT[d[i + 1]];
            if (bLUT) d[i + 2] = bLUT[d[i + 2]];
            if (aLUT) d[i + 3] = aLUT[d[i + 3]];
        }
        return newData;
    }, [originalData, channel, maxValue]);

    const applyPreview = useCallback(() => {
        if (!originalData || !previewEnabled) {
            onPreviewChange(null);
            return;
        }
        const result = processImageData(settingsRef.current);
        onPreviewChange(result);
    }, [originalData, previewEnabled, processImageData]);

    const updateSetting = useCallback((key: keyof LevelsConfig, value: number) => {
        setSettings(prev => {
            const current = prev[channel];
            let updated = { ...current };
            if (key === 'black') updated.black = Math.min(value, current.midtone - 1);
            else if (key === 'white') updated.white = Math.max(value, current.midtone + 1);
            else if (key === 'midtone') updated.midtone = Math.max(current.black + 1, Math.min(value, current.white - 1));
            return { ...prev, [channel]: updated };
        });
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => applyPreview());
    }, [channel, applyPreview]);

    const handleReset = () => {
        const cfg = defaultConfig(maxValue);
        const resetCfg = { master: { ...cfg }, r: { ...cfg }, g: { ...cfg }, b: { ...cfg }, a: { ...cfg }, gray: { ...cfg } };
        setSettings(resetCfg);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => applyPreview());
    };

    const handleApply = () => {
        const result = processImageData(settingsRef.current);
        if (result) {
            onApply(result);
        } else {
            // Если изменений нет, просто применяем оригинал
            onApply(new ImageData(new Uint8ClampedArray(originalData!.data), originalData!.width, originalData!.height));
        }
        onClose();
    };

    // Расчет гистограммы
    const histogramData = useMemo(() => {
        if (!originalData) return new Array(256).fill(0);

        const hist = new Array(256).fill(0);
        const data = originalData.data;

        for (let i = 0; i < data.length; i += 4) {
            let val: number;

            if (channel === 'master') {
                if (maxValue === 127) {
                    // Для GB7: master = grayscale (первый канал)
                    val = data[i];
                } else {
                    // Для RGB: формула светлоты
                    val = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
                }
            } else if (channel === 'gray') {
                val = data[i];
            } else if (channel === 'a') {
                val = data[i + 3];
            } else if (channel === 'r') {
                val = data[i];
            } else if (channel === 'g') {
                val = data[i + 1];
            } else if (channel === 'b') {
                val = data[i + 2];
            } else {
                val = data[i];
            }

            hist[Math.min(maxValue, Math.round(val * (maxValue / 255)))]++;
        }
        return hist;
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

            // Очищаем и рисуем
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

    // Генерация LUT
    // const createLUT = useCallback((black: number, white: number, gamma: number) => {
    //     const lut = new Uint8Array(256);
    //     const range = Math.max(1, white - black);
    //     const invGamma = 1 / Math.max(0.01, gamma);
    //     for (let i = 0; i < 256; i++) {
    //         if (i <= black) lut[i] = 0;
    //         else if (i >= white) lut[i] = 255;
    //         else lut[i] = Math.round(255 * Math.pow((i - black) / range, invGamma));
    //     }
    //     return lut;
    // }, []);

    // const calculateGammaFromMidtone = useCallback((black: number, midtone: number, white: number): number => {
    //     const range = white - black;
    //     const midPos = midtone - black;
    //     if (range <= 0 || midPos <= 0 || midPos >= range) return 1.0;
    //     // гамма, при которой середина диапазона отображается в 0.5
    //     const gamma = Math.log(0.5) / Math.log(midPos / range);
    //     return Math.max(0.1, Math.min(9.9, gamma));
    // }, []);

    // const logicalToPhysical = (logical: number, maxValue: number): number => {
    //     return Math.round(logical * (255 / maxValue));
    // };

    // Применение уровней к данным - предпросмотр
    // const applyPreview = useCallback((currentSettings?: Record<ChannelKey, LevelsConfig>) => {
    //     if (!originalData || !previewEnabled) {
    //         onPreviewChange(null);
    //         return;
    //     }

    //     const cfg = currentSettings || settingsRef.current;

    //     const isAllDefault = (c: LevelsConfig) => c.black === 0 && c.white === maxValue && c.midtone === Math.round(maxValue / 2);
    //     if (Object.values(cfg).every(isAllDefault)) {
    //         onPreviewChange(null);
    //         return;
    //     }

    //     const getLUT = (c: LevelsConfig) => {
    //         const blackPhys = logicalToPhysical(c.black, maxValue);
    //         const whitePhys = logicalToPhysical(c.white, maxValue);
    //         const midtonePhys = logicalToPhysical(c.midtone, maxValue);

    //         const gamma = calculateGammaFromMidtone(c.black, c.midtone, c.white);
    //         return createLUT(blackPhys, whitePhys, gamma);
    //     };

    //     const masterLUT = channel === 'master' ? getLUT(cfg.master) : null;

    //     const rLUT = channel === 'master' ? masterLUT :
    //         channel === 'r' || channel === 'gray' ? getLUT(cfg[channel]) : null;
    //     const gLUT = channel === 'master' ? masterLUT :
    //         channel === 'g' ? getLUT(cfg.g) : null;
    //     const bLUT = channel === 'master' ? masterLUT :
    //         channel === 'b' ? getLUT(cfg.b) : null;
    //     const aLUT = channel === 'a' ? getLUT(cfg.a) : null;

    //     const newData = new ImageData(new Uint8ClampedArray(originalData.data), originalData.width, originalData.height);
    //     const data = newData.data;
    //     for (let i = 0; i < data.length; i += 4) {
    //         if (rLUT) data[i] = rLUT[data[i]];
    //         if (gLUT) data[i + 1] = gLUT[data[i + 1]];
    //         if (bLUT) data[i + 2] = bLUT[data[i + 2]];
    //         if (aLUT) data[i + 3] = aLUT[data[i + 3]];
    //     }
    //     onPreviewChange(newData);
    // }, [originalData, previewEnabled, channel, maxValue, createLUT, calculateGammaFromMidtone]);

    // Обработчики ползунков с throttling
    // const updateSetting = useCallback((key: keyof LevelsConfig, value: number) => {
    //     setSettings(prev => {
    //         const current = prev[channel];
    //         let updated = { ...current };
    //         console.log(updated);
    //         console.log('Updating', channel, key, value);

    //         if (key === 'black') {
    //             updated.black = Math.min(value, current.midtone - 1);
    //         } else if (key === 'white') {
    //             updated.white = Math.max(value, current.midtone + 1);
    //         } else if (key === 'midtone') {
    //             updated.midtone = Math.max(current.black + 1, Math.min(value, current.white - 1));
    //         }

    //         return { ...prev, [channel]: updated };
    //     });

    //     if (rafRef.current) {
    //         cancelAnimationFrame(rafRef.current);
    //     }
    //     rafRef.current = requestAnimationFrame(() => applyPreview());
    // }, [channel, applyPreview, maxValue]);

    // const handleReset = () => {
    //     const cfg = defaultConfig(maxValue);
    //     const resetCfg = {
    //         master: { ...cfg }, r: { ...cfg }, g: { ...cfg }, b: { ...cfg }, a: { ...cfg }, gray: { ...cfg }
    //     };
    //     setSettings(resetCfg);

    //     if (rafRef.current) cancelAnimationFrame(rafRef.current);
    //     rafRef.current = requestAnimationFrame(() => applyPreview(resetCfg));
    // };

    // const handleApply = () => {
    //     if (!originalData) {
    //         onClose();
    //         return;
    //     }

    //     const cfg = settingsRef.current[channel];

    //     const isDefault = cfg.black === 0 && cfg.white === maxValue && cfg.midtone === Math.round(maxValue / 2);
    //     const allChannelsDefault = Object.values(settingsRef.current).every(
    //         (c: LevelsConfig) => c.black === 0 && c.white === maxValue && c.midtone === Math.round(maxValue / 2)
    //     );

    //     if (allChannelsDefault) {
    //         // Просто применяем оригинальные данные без LUT
    //         onApply(new ImageData(new Uint8ClampedArray(originalData.data), originalData.width, originalData.height));
    //         onClose();
    //         return;
    //     }

    //     const getLUT = (c: LevelsConfig) => {
    //         const gamma = calculateGammaFromMidtone(c.black, c.midtone, c.white);
    //         return createLUT(c.black, c.white, gamma);
    //     };

    //     const masterLUT = channel === 'master' ? getLUT(settingsRef.current.master) : null;
    //     const rLUT = channel === 'master' ? masterLUT : getLUT(settingsRef.current.r);
    //     const gLUT = channel === 'master' ? masterLUT : getLUT(settingsRef.current.g);
    //     const bLUT = channel === 'master' ? masterLUT : getLUT(settingsRef.current.b);
    //     const aLUT = channel === 'a' ? getLUT(settingsRef.current.a) : null;

    //     const newData = new ImageData(new Uint8ClampedArray(originalData.data), originalData.width, originalData.height);
    //     const data = newData.data;

    //     for (let i = 0; i < data.length; i += 4) {
    //         if (rLUT) data[i] = rLUT[data[i]];
    //         if (gLUT) data[i + 1] = gLUT[data[i + 1]];
    //         if (bLUT) data[i + 2] = bLUT[data[i + 2]];
    //         if (aLUT) data[i + 3] = aLUT[data[i + 3]];
    //     }

    //     onApply(newData);
    //     onClose();
    // };

    // Сброс превью при закрытии или отмене
    useEffect(() => {
        if (!open) {
            onPreviewChange(null);
            setPreviewEnabled(true);

            const cfg = defaultConfig(maxValue);
            setSettings({
                master: { ...cfg },
                r: { ...cfg },
                g: { ...cfg },
                b: { ...cfg },
                a: { ...cfg },
                gray: { ...cfg }
            });

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