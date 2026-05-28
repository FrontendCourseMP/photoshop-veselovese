import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, FormControl, InputLabel, Select, MenuItem,
    Checkbox, FormControlLabel, Box, Typography, TextField,
    Switch, Radio, RadioGroup
} from '@mui/material';
import {
    FilterPreset,
    FilterSettings,
    createDefaultSettings,
    applyKernelFilter,
    applyKernelFilterAsync,
    FILTER_PRESETS,
    EdgeHandling
} from '../utils/filters';

interface FilterDialogProps {
    open: boolean;
    onClose: () => void;
    onApply: (newImageData: ImageData) => void;
    onPreviewChange: (data: ImageData | null) => void;
    originalData: ImageData | null;
}

export const FilterDialog: React.FC<FilterDialogProps> = ({
    open, onClose, onApply, onPreviewChange, originalData
}) => {
    const [preset, setPreset] = useState<FilterPreset>('identity');
    const [settings, setSettings] = useState<FilterSettings>(createDefaultSettings());
    const [previewEnabled, setPreviewEnabled] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        if (open) {
            setPreset('identity');
            setSettings(createDefaultSettings());
            setPreviewEnabled(true);
        } else {
            onPreviewChange(null);
        }
    }, [open]);

    const handlePresetChange = (value: FilterPreset) => {
        setPreset(value);
        const presetData = FILTER_PRESETS[value];
        setSettings(prev => ({
            ...prev,
            kernel: [...presetData.kernel]
        }));
    };

    const handleKernelChange = (index: number, value: string) => {
        const numValue = parseFloat(value) || 0;
        setSettings(prev => ({
            ...prev,
            kernel: prev.kernel.map((v, i) => i === index ? numValue : v)
        }));
    };

    const handleChannelChange = (channel: keyof FilterSettings['channels']) => {
        setSettings(prev => ({
            ...prev,
            channels: {
                ...prev.channels,
                [channel]: !prev.channels[channel]
            }
        }));
    };

    const handleEdgeHandlingChange = (value: EdgeHandling) => {
        setSettings(prev => ({ ...prev, edgeHandling: value }));
    };

    const applyPreview = useCallback(async () => {
        if (!originalData || !previewEnabled) {
            onPreviewChange(null);
            return;
        }

        setIsProcessing(true);
        try {
            if (originalData.width * originalData.height > 100000) {
                const result = await applyKernelFilterAsync(
                    originalData,
                    settings,
                    () => { }
                );
                onPreviewChange(result);
            } else {
                const result = applyKernelFilter(originalData, settings);
                onPreviewChange(result);
            }
        } catch (error) {
            console.error('Filter error:', error);
        } finally {
            setIsProcessing(false);
        }
    }, [originalData, previewEnabled, settings]);

    useEffect(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
            if (!isProcessing) {
                applyPreview();
            }
        });

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [settings, applyPreview, isProcessing]);

    const handleReset = () => {
        setPreset('identity');
        setSettings(createDefaultSettings());
    };

    const handleApply = async () => {
        if (!originalData) return;

        setIsProcessing(true);
        try {
            const result = await applyKernelFilterAsync(originalData, settings);
            console.log(result)
            onApply(result);
        } catch (error) {
            console.error('Apply filter error:', error);
        } finally {
            setIsProcessing(false);
            onClose();
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            sx={{ '& .MuiDialog-paper': { bgcolor: '#2d2d2d', color: '#eee' } }}
        >
            <DialogTitle sx={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>
                Фильтрация изображений (Kernel Filter)
            </DialogTitle>
            <DialogContent>
                {/* Preset selection */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ color: '#ccc', fontSize: '12px', mb: 1 }}>
                        Предустановленные фильтры:
                    </Typography>
                    <FormControl fullWidth size="small">
                        <Select
                            value={preset}
                            onChange={(e) => handlePresetChange(e.target.value as FilterPreset)}
                            sx={{
                                color: '#ccc',
                                '& .MuiInputBase-input': { color: '#ccc', fontSize: '14px' },
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#555' }
                            }}
                        >
                            {Object.entries(FILTER_PRESETS).map(([key, filter]) => (
                                <MenuItem key={key} value={key} sx={{ fontSize: '14px' }}>
                                    {filter.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                {/* Kernel grid 3x3 */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ color: '#ccc', fontSize: '12px', mb: 1 }}>
                        Ядро свертки (3×3):
                    </Typography>
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 1,
                        maxWidth: '300px'
                    }}>
                        {settings.kernel.map((value, idx) => (
                            <TextField
                                key={idx}
                                size="small"
                                type="number"
                                value={value}
                                onChange={(e) => handleKernelChange(idx, e.target.value)}
                                sx={{
                                    '& .MuiInputBase-input': {
                                        color: '#ccc',
                                        fontSize: '14px',
                                        textAlign: 'center',
                                        padding: '8px'
                                    },
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#555' }
                                }}
                            />
                        ))}
                    </Box>
                </Box>

                {/* Channel selection */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ color: '#ccc', fontSize: '12px', mb: 1 }}>
                        Каналы для обработки:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={settings.channels.r}
                                    onChange={() => handleChannelChange('r')}
                                    sx={{ color: '#ccc' }}
                                />
                            }
                            label={<Typography sx={{ color: '#ccc', fontSize: '12px' }}>Красный (R)</Typography>}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={settings.channels.g}
                                    onChange={() => handleChannelChange('g')}
                                    sx={{ color: '#ccc' }}
                                />
                            }
                            label={<Typography sx={{ color: '#ccc', fontSize: '12px' }}>Зеленый (G)</Typography>}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={settings.channels.b}
                                    onChange={() => handleChannelChange('b')}
                                    sx={{ color: '#ccc' }}
                                />
                            }
                            label={<Typography sx={{ color: '#ccc', fontSize: '12px' }}>Синий (B)</Typography>}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={settings.channels.a}
                                    onChange={() => handleChannelChange('a')}
                                    sx={{ color: '#ccc' }}
                                />
                            }
                            label={<Typography sx={{ color: '#ccc', fontSize: '12px' }}>Альфа (A)</Typography>}
                        />
                    </Box>
                </Box>

                {/* Edge handling */}
                <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ color: '#ccc', fontSize: '12px', mb: 1 }}>
                        Обработка краев (Padding):
                    </Typography>
                    <RadioGroup
                        row
                        value={settings.edgeHandling}
                        onChange={(e) => handleEdgeHandlingChange(e.target.value as EdgeHandling)}
                    >
                        <FormControlLabel
                            value="zero"
                            control={<Radio sx={{ color: '#ccc' }} />}
                            label={<Typography sx={{ color: '#ccc', fontSize: '12px' }}>Заполнить черным</Typography>}
                        />
                        <FormControlLabel
                            value="white"
                            control={<Radio sx={{ color: '#ccc' }} />}
                            label={<Typography sx={{ color: '#ccc', fontSize: '12px' }}>Заполнить белым</Typography>}
                        />
                        <FormControlLabel
                            value="replicate"
                            control={<Radio sx={{ color: '#ccc' }} />}
                            label={<Typography sx={{ color: '#ccc', fontSize: '12px' }}>Копирование края</Typography>}
                        />
                    </RadioGroup>
                </Box>

                {/* Preview checkbox */}
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={previewEnabled}
                            onChange={(e) => { setPreviewEnabled(e.target.checked); if (!e.target.checked) onPreviewChange(null); else applyPreview(); }}
                            sx={{ color: '#ccc' }}
                        />
                    }
                    label={
                        <Typography sx={{ color: '#ccc', fontSize: '12px' }}>
                            Предпросмотр {isProcessing && '(обработка...)'}
                        </Typography>
                    }
                // disabled={isProcessing}
                />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button
                    onClick={handleReset}
                    sx={{ color: '#aaa', fontSize: '14px', textTransform: 'none', mr: 'auto' }}
                >
                    Сброс
                </Button>
                <Button
                    onClick={onClose}
                    sx={{ color: '#f44336', fontSize: '14px', textTransform: 'none' }}
                >
                    Отмена
                </Button>
                <Button
                    onClick={handleApply}
                    variant="contained"
                    disabled={isProcessing}
                    sx={{
                        bgcolor: '#2196f3',
                        fontSize: '14px',
                        textTransform: 'none',
                        boxShadow: 'none',
                        '&:disabled': { bgcolor: '#555' }
                    }}
                >
                    {isProcessing ? 'Применение...' : 'Применить'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};