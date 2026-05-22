import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Box,
    TextField, FormControlLabel, Checkbox, Select, MenuItem, InputLabel,
    FormControl, Typography, Tooltip, IconButton, Alert
} from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';
import { resizeImage, InterpolationMethod, INTERPOLATION_CONFIG } from '../utils/interpolation';

interface ResizeDialogProps {
    open: boolean;
    onClose: () => void;
    onApply: (newImageData: ImageData, newWidth: number, newHeight: number) => void;
    originalWidth: number;
    originalHeight: number;
}

export const ResizeDialog: React.FC<ResizeDialogProps> = ({
    open, onClose, onApply, originalWidth, originalHeight
}) => {
    const [unit, setUnit] = useState<'px' | '%'>('px');
    const [width, setWidth] = useState(String(originalWidth));
    const [height, setHeight] = useState(String(originalHeight));
    const [lockAspect, setLockAspect] = useState(true);
    const [method, setMethod] = useState<InterpolationMethod>('bilinear');
    const [error, setError] = useState<string | null>(null);

    const aspect = originalWidth / originalHeight;

    const toMegapixels = (w: number, h: number) => ((w * h) / 1_000_000).toFixed(2);

    const handleWidthChange = (val: string) => {
        setWidth(val);
        if (lockAspect && unit === 'px') {
            const w = parseFloat(val) || 0;
            setHeight(String(Math.round(w / aspect)));
        }
    };

    const handleHeightChange = (val: string) => {
        setHeight(val);
        if (lockAspect && unit === 'px') {
            const h = parseFloat(val) || 0;
            setWidth(String(Math.round(h * aspect)));
        }
    };

    const handleUnitChange = (newUnit: 'px' | '%') => {
        setUnit(newUnit);
        if (newUnit === '%') {
            setWidth('100'); setHeight('100');
        } else {
            setWidth(String(originalWidth)); setHeight(String(originalHeight));
        }
    };

    const getTargetDimensions = useCallback((): { w: number; h: number; err?: string } => {
        const w = unit === 'px' ? parseFloat(width) : (parseFloat(width) / 100) * originalWidth;
        const h = unit === 'px' ? parseFloat(height) : (parseFloat(height) / 100) * originalHeight;

        if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return { w: 0, h: 0, err: 'Размеры должны быть больше 0' };
        if (!Number.isInteger(w) || !Number.isInteger(h)) return { w: 0, h: 0, err: 'Размеры должны быть целыми числами' };
        if (w > 8192 || h > 8192) return { w: 0, h: 0, err: 'Максимальный размер: 8192px (ограничение браузера)' };
        return { w: Math.round(w), h: Math.round(h) };
    }, [width, height, unit, originalWidth, originalHeight]);

    const target = getTargetDimensions();
    const targetMP = target.w > 0 ? toMegapixels(target.w, target.h) : '0.00';
    const originalMP = toMegapixels(originalWidth, originalHeight);

    const handleApply = () => {
        const { w, h, err } = target;
        if (err) { setError(err); return; }
        setError(null);

        // Временно восстанавливаем оригинал, если диалог был открыт после изменения
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = originalWidth; tempCanvas.height = originalHeight;
        const ctx = tempCanvas.getContext('2d')!;
        // Используем глобальный доступ к оригиналу или передаём его. 
        // Для простоты передадим логику в App, здесь только валидация.
        onApply({ width: 0, height: 0 } as ImageData, w, h); // Placeholder
    };

    useEffect(() => {
        if (open) {
            setWidth(String(originalWidth)); setHeight(String(originalHeight));
            setUnit('px'); setError(null);
        }
    }, [open, originalWidth, originalHeight]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth sx={{ '& .MuiDialog-paper': { bgcolor: '#2d2d2d', color: '#eee' } }}>
            <DialogTitle sx={{ color: '#fff', fontWeight: 'bold' }}>Масштабирование изображения</DialogTitle>
            <DialogContent>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Исходно: <strong>{originalMP} Мп</strong> ({originalWidth}×{originalHeight})</Typography>
                    <Typography variant="body2" color={target.w > 0 ? '#4caf50' : '#f44336'}>Итог: <strong>{targetMP} Мп</strong></Typography>
                </Box>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <TextField label="Ширина" value={width} onChange={e => handleWidthChange(e.target.value)} sx={{
                        flex: 1, color: '#ccc', '& .MuiInputBase-input': {
                            color: '#ccc'
                        },
                        '& .MuiFormLabel-root': {
                            color: '#ccc'
                        }
                    }} size="small" />
                    <TextField label="Высота" value={height} onChange={e => handleHeightChange(e.target.value)} sx={{
                        flex: 1, '& .MuiInputBase-input': {
                            color: '#ccc'
                        },
                        '& .MuiFormLabel-root': {
                            color: '#ccc'
                        }
                    }} size="small" />
                    <FormControl size="small" sx={{ minWidth: 60 }}>
                        <Select value={unit} onChange={e => handleUnitChange(e.target.value as 'px' | '%')} sx={{
                            color: '#ccc'
                        }}>
                            <MenuItem value="px">px</MenuItem>
                            <MenuItem value="%">%</MenuItem>
                        </Select>
                    </FormControl>
                </Box>

                <FormControlLabel control={<Checkbox checked={lockAspect} onChange={e => setLockAspect(e.target.checked)} />} label="Сохранять пропорции" sx={{ mb: 2 }} />

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <FormControl fullWidth size="small">
                        <InputLabel sx={{ color: '#ccc' }}>Алгоритм</InputLabel>
                        <Select value={method} onChange={e => setMethod(e.target.value as InterpolationMethod)} sx={{ color: '#ccc' }}>
                            <MenuItem value="nearest">Ближайший сосед</MenuItem>
                            <MenuItem value="bilinear">Билинейная</MenuItem>
                        </Select>
                    </FormControl>
                    <Tooltip title={INTERPOLATION_CONFIG[method].tooltip} arrow>
                        <IconButton size="small" sx={{ ml: 1 }}><InfoOutlined /></IconButton>
                    </Tooltip>
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} sx={{ color: '#f44336' }}>Отмена</Button>
                <Button onClick={() => {
                    const { w, h, err } = target;
                    if (err) return;
                    setError(null);
                    // Вызываем onApply с размерами, App сам найдет оригинал и применит resizeImage
                    onApply(null as any, w, h);
                }} variant="contained" sx={{ bgcolor: '#2196f3' }}>Применить</Button>
            </DialogActions>
        </Dialog>
    );
};