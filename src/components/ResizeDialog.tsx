import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Box,
    TextField, FormControlLabel, Checkbox, Select, MenuItem, InputLabel,
    FormControl, Typography, Tooltip, IconButton, Alert,
} from '@mui/material';
import { resizeImage, InterpolationMethod } from '../utils/interpolation';
import { InfoOutlined, ErrorOutlined } from '@mui/icons-material';


interface ResizeDialogProps {
    open: boolean;
    onClose: () => void;
    onApply: (newImageData: ImageData, newWidth: number, newHeight: number, interpolationMethod: InterpolationMethod) => void;
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
    }, [width, height, unit, method, originalWidth, originalHeight, originalImageData]);

    const { w: targetW, h: targetH, err: targetErr, newImg } = getTargetData();
    const targetMP = targetW > 0 ? (targetW * targetH / 1_000_000).toFixed(2) : '0.00';
    const originalMP = (originalWidth * originalHeight / 1_000_000).toFixed(2);

    const handleApply = () => {
        if (targetErr) {
            setError(targetErr);
            console.log(error)
            return;
        }
        if (!newImg) return;

        setError(null);
        onApply(newImg, targetW, targetH, method);
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
        <Dialog open={open} onClose={onClose} fullWidth sx={{
            '& .MuiBackdrop-root': {
                backgroundColor: 'rgba(0, 0, 0, 0)',
            },
            '& .MuiDialog-paper': {
                bgcolor: '#2d2d2d',
                color: '#eee',
                maxWidth: '620px'
            }
        }}>
            <DialogTitle sx={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>Масштабирование изображения</DialogTitle>
            <DialogContent>
                <Box sx={{ mb: '1.6rem', display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ fontSize: '12px' }}>Исходно: {originalMP} Мп ({originalWidth}×{originalHeight})</Typography>
                    <Typography variant="body2" sx={{ fontSize: '12px' }} color={!!targetErr ? '#f44336' : (targetW > 0 ? '#4caf50' : 'text.secondary')}>
                        Итог: {targetMP} Мп
                    </Typography>
                </Box>

                {targetErr && (
                    <Alert severity="error" icon={<ErrorOutlined fontSize="large" />} sx={{ mb: '1.6rem', fontSize: '12px', display: 'flex', alignItems: 'center' }}>
                        {targetErr}
                    </Alert>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: '0.8rem' }}>
                    <TextField
                        label="Ширина"
                        type="number"
                        value={width}
                        onChange={e => handleWidthChange(e.target.value)}
                        error={!isValidInput(width)}
                        helperText={isValidInput(width) ? '' : 'Некорректное значение'}
                        fullWidth
                        sx={{
                            flex: 1, color: '#ccc', fontSize: '12px',
                            '& .MuiInputBase-input': {
                                color: '#ccc',
                                fontSize: '14px',
                            },
                            '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#ccc'
                            },
                            '& .MuiFormLabel-root': {
                                color: '#ccc',
                                fontSize: '12px'
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
                            flex: 1,
                            '& .MuiInputBase-input': {
                                color: '#ccc',
                                fontSize: '14px',

                            },
                            '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#ccc'
                            },
                            '& .MuiFormLabel-root': {
                                color: '#ccc',
                                fontSize: '12px'
                            }
                        }} size="small" />
                    <FormControl size="small" sx={{ minWidth: 60 }}>
                        <Select value={unit} onChange={e => handleUnitChange(e.target.value as 'px' | '%')} sx={{
                            color: '#ccc',
                            '& .MuiInputBase-input': {
                                color: '#ccc',
                                fontSize: '14px',

                            },
                            '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#ccc'
                            },
                        }}>
                            <MenuItem value="px" sx={{ fontSize: '1.4rem' }}>px</MenuItem>
                            <MenuItem value="%" sx={{ fontSize: '1.4rem' }}>%</MenuItem>
                        </Select>
                    </FormControl>
                </Box>

                <FormControlLabel
                    control={<Checkbox checked={lockAspect} onChange={(e) => setLockAspect(e.target.checked)} />}
                    label="Сохранять пропорции"
                    sx={{ mb: '1.6rem', fontSize: '12px' }}
                />

                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <FormControl fullWidth>
                        <InputLabel sx={{ fontSize: '12px', color: '#ccc' }}>Алгоритм</InputLabel>
                        <Select
                            label="Алгоритм"
                            value={method}
                            onChange={(e) => setMethod(e.target.value as InterpolationMethod)}
                            error={false}
                            sx={{
                                color: '#ccc',
                                '& .MuiInputBase-input': {
                                    color: '#ccc',
                                    fontSize: '14px',

                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#ccc'
                                },
                            }}
                        >
                            <MenuItem value="nearest" sx={{ fontSize: '1.4rem' }}>Ближайший сосед</MenuItem>
                            <MenuItem value="bilinear" sx={{ fontSize: '1.4rem' }}>Билинейная</MenuItem>
                        </Select>
                    </FormControl>
                    <Tooltip
                        title={
                            method === 'bilinear'
                                ? "Билинейный: усредняет 4 соседних пикселя. Плавные переходы."
                                : "Ближайший сосед: берет цвет ближайшего пикселя. Четкие границы, лестничный эффект."
                        }
                        sx={{ fontSize: '12px' }}
                    >
                        <IconButton size="small" sx={{ ml: 1, color: '#ccc', fontSize: '12px' }}><InfoOutlined /></IconButton>
                    </Tooltip>
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} sx={{ color: '#f44336', fontSize: '14px', textTransform: 'none', p: '6px 16px' }}>Отмена</Button>
                <Button
                    onClick={handleApply}
                    variant="contained"
                    disabled={isApplyDisabled}
                    sx={{ fontSize: '14px', textTransform: 'none', boxShadow: 'none' }}
                >
                    Применить
                </Button>
            </DialogActions>
        </Dialog >

    );
};