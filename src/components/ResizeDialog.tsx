import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Box,
    TextField, FormControlLabel, Checkbox, Select, MenuItem, InputLabel,
    FormControl, Typography, Tooltip, IconButton, Alert,
    Stack,
    ToggleButtonGroup,
    ToggleButton,
    InputAdornment
} from '@mui/material';
import { resizeImage, InterpolationMethod, INTERPOLATION_CONFIG } from '../utils/interpolation';
import { InfoOutlined, ErrorOutlined } from '@mui/icons-material';


interface ResizeDialogProps {
    open: boolean;
    onClose: () => void;
    onApply: (newImageData: ImageData, newWidth: number, newHeight: number) => void;
    originalWidth: number;
    originalHeight: number;
    originalImageData: ImageData | null;
}

export const ResizeDialog: React.FC<ResizeDialogProps> = ({
    open, onClose, onApply, originalWidth, originalHeight, originalImageData
}) => {
    const [unit, setUnit] = useState<'px' | '%'>('px');
    const [width, setWidth] = useState(String(originalWidth));
    const [height, setHeight] = useState(String(originalHeight));
    const [lockAspect, setLockAspect] = useState(true);
    const [method, setMethod] = useState<InterpolationMethod>('bilinear');
    const [error, setError] = useState<string | null>(null);

    const isValidInput = (val: string) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
    };

    const aspect = originalWidth / originalHeight;

    const toMegapixels = (w: number, h: number) => ((w * h) / 1_000_000).toFixed(2);

    const handleWidthChange = (val: string) => {
        if (!isValidInput(val)) return;
        setWidth(val);
        if (lockAspect) {
            if (unit === 'px') {
                const w = parseFloat(val);
                const h = Math.round(w / aspect)
                if (!isNaN(h)) setHeight(String(h));
            } else {
                setHeight(val)
            }
        }
    };

    const handleHeightChange = (val: string) => {
        if (!isValidInput(val)) return;
        setHeight(val);
        if (lockAspect) {
            if (unit === 'px') {
                const h = parseFloat(val);
                const w = Math.round(h * aspect);
                if (!isNaN(w)) setWidth(String(w));
            } else {
                setWidth(val)
            }
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

    const getTargetData = useCallback((): { w: number; h: number; err?: string, newImg?: ImageData } => {
        const w = unit === 'px' ? parseFloat(width) : (parseFloat(width) / 100) * originalWidth;
        const h = unit === 'px' ? parseFloat(height) : (parseFloat(height) / 100) * originalHeight;

        if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return { w: 0, h: 0, err: 'Размеры должны быть больше 0' };
        
        const finalW = Math.round(w);
        const finalH = Math.round(h);

        if (!Number.isInteger(finalW) || !Number.isInteger(finalH)) return { w: 0, h: 0, err: 'Размеры должны быть целыми числами' };

        if (finalW > 8192 || finalH > 8192) {
            return { w: finalW, h: finalH, err: 'Максимальный размер 8192px' };
        }

        try {
            if (originalImageData) {
                const newImg = resizeImage(originalImageData, finalW, finalH, method);
                return { w: finalW, h: finalH, newImg: newImg };
            }
            return { w: 0, h: 0, err: 'Нет данных для обработки' };
        } catch (e) {
            return { w: 0, h: 0, err: 'Ошибка при вычислении' };
        }
    }, [width, height, unit, originalWidth, originalHeight, originalImageData]);

    const { w: targetW, h: targetH, err: targetErr, newImg } = getTargetData();
    const targetMP = targetW > 0 ? (targetW * targetH / 1_000_000).toFixed(2) : '0.00';
    const originalMP = (originalWidth * originalHeight / 1_000_000).toFixed(2);

    const handleApply = () => {
        if (targetErr) {
            setError(targetErr);
            return;
        }
        if (!newImg) return;

        setError(null);
        onApply(newImg, targetW, targetH);
    };

    useEffect(() => {
        if (open) {
            setWidth(String(originalWidth));
            setHeight(String(originalHeight));
            setUnit('px');
            setError(null);
        }
    }, [open, originalWidth, originalHeight]);

    const isApplyDisabled = !!targetErr;

    return (
        <Dialog open={open} onClose={onClose} fullWidth sx={{ '& .MuiDialog-paper': { bgcolor: '#2d2d2d', color: '#eee' } }}>
            <DialogTitle sx={{ color: '#fff', fontWeight: 'bold' }}>Масштабирование изображения</DialogTitle>
            <DialogContent>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Исходно: <strong>{originalMP} Мп</strong> ({originalWidth}×{originalHeight})</Typography>
                    <Typography variant="body2" color={targetErr ? '#f44336' : (targetW > 0 ? '#4caf50' : 'text.secondary')}>
                        Итог: <strong>{targetMP} Мп</strong>
                    </Typography>
                </Box>

                {targetErr && (
                    <Alert severity="error" icon={<ErrorOutlined fontSize="small" />} sx={{ mb: 2 }}>
                        {targetErr}
                    </Alert>
                )}

                {/* Выбор единиц */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <TextField
                        label="Ширина"
                        type="number"
                        value={width}
                        onChange={e => handleWidthChange(e.target.value)}
                        error={!isValidInput(width)}
                        helperText={isValidInput(width) ? '' : 'Некорректное значение'}
                        fullWidth
                        sx={{
                            flex: 1, color: '#ccc', '& .MuiInputBase-input': {
                                color: '#ccc'
                            },
                            '& .MuiFormLabel-root': {
                                color: '#ccc'
                            }
                        }} size="small" />
                    <TextField
                        label="Высота"
                        type="number"
                        value={height}
                        onChange={(e) => handleHeightChange(e.target.value)}
                        error={!isValidInput(height)}
                        helperText={isValidInput(height) ? '' : 'Некорректное значение'}

                        fullWidth
                        sx={{
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

                <FormControlLabel
                    control={<Checkbox checked={lockAspect} onChange={(e) => setLockAspect(e.target.checked)} />}
                    label="Сохранять пропорции"
                    sx={{ mb: 2 }}
                />

                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <FormControl fullWidth>
                        <InputLabel>Алгоритм</InputLabel>
                        <Select
                            value={method}
                            onChange={(e) => setMethod(e.target.value as InterpolationMethod)}
                            error={false}
                        >
                            <MenuItem value="nearest">Ближайший сосед (Nearest Neighbor)</MenuItem>
                            <MenuItem value="bilinear">Билинейная (Bilinear)</MenuItem>
                        </Select>
                    </FormControl>
                    <Tooltip
                        title={
                            method === 'bilinear'
                                ? "Билинейная: Усредняет 4 соседних пикселя. Плавный результат. Используется по умолчанию."
                                : "Ближайший сосед: Берет цвет ближайшего пикселя. Четкие границы, лестничный эффект."
                        }
                    >
                        <IconButton size="small" sx={{ ml: 1, color: 'action' }}><InfoOutlined /></IconButton>
                    </Tooltip>
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose}>Отмена</Button>
                <Button
                    onClick={handleApply}
                    variant="contained"
                    disabled={isApplyDisabled}
                >
                    Применить
                </Button>
            </DialogActions>
        </Dialog>

    );
};