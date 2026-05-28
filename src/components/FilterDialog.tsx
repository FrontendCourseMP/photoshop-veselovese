import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { FilterChannelKey } from '../types/channel';

interface FilterDialogProps {
    open: boolean;
    onClose: () => void;
    onApply: (newImageData: ImageData) => void;
    onPreviewChange: (data: ImageData | null) => void;
    originalData: ImageData | null;
    availableChannelKeys: FilterChannelKey[];
}

export const FilterDialog: React.FC<FilterDialogProps> = ({
    open, onClose, onApply, onPreviewChange, originalData, availableChannelKeys
}) => {
    const [preset, setPreset] = useState<FilterPreset>('identity');
    const [previewEnabled, setPreviewEnabled] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    const settingsRef = useRef<FilterSettings>(createDefaultSettings(availableChannelKeys));
    const [settingsVersion, setSettingsVersion] = useState(0);

    const settings = useMemo(() => settingsRef.current, [settingsVersion]);

    const rafRef = useRef<number | null>(null);
    const previewTriggerRef = useRef(false);

    useEffect(() => {
        if (open) {
            setPreset('identity');
            settingsRef.current = createDefaultSettings(availableChannelKeys);
            setPreviewEnabled(true);
            setSettingsVersion(v => v + 1);
            previewTriggerRef.current = true;
        } else {
            onPreviewChange(null);
        }
    }, [open]);

    const updateSettings = useCallback((updater: (prev: FilterSettings) => FilterSettings, triggerPreview = true) => {
        settingsRef.current = updater(settingsRef.current);
        setSettingsVersion(v => v + 1);
        if (triggerPreview) {
            previewTriggerRef.current = true;
        }
    }, []);

    const handlePresetChange = (value: FilterPreset) => {
        setPreset(value);
        const presetData = FILTER_PRESETS[value];
        updateSettings(prev => ({ ...prev, kernel: [...presetData.kernel] }));
    };

    const handleKernelChange = (index: number, value: string) => {
        const numValue = parseFloat(value) || 0;
        updateSettings(prev => ({
            ...prev,
            kernel: prev.kernel.map((v, i) => i === index ? numValue : v)
        }));
    };

    const handleChannelChange = (channel: FilterChannelKey) => {
        updateSettings(prev => ({
            ...prev,
            channels: { ...prev.channels, [channel]: !prev.channels[channel] }
        }));
    };

    const handleEdgeHandlingChange = (value: EdgeHandling) => {
        updateSettings(prev => ({ ...prev, edgeHandling: value }));
    }

    const applyPreview = useCallback(async () => {
        if (!originalData || !previewEnabled || !previewTriggerRef.current) {
            return;
        }
        previewTriggerRef.current = false; // Сбрасываем флаг

        setIsProcessing(true);
        try {
            const isLarge = originalData.width * originalData.height > 100000;
            const result = isLarge
                ? await applyKernelFilterAsync(originalData, settingsRef.current, availableChannelKeys)
                : applyKernelFilter(originalData, settingsRef.current, availableChannelKeys);
            onPreviewChange(result);
        } catch (e) { console.error(e); }
        finally { setIsProcessing(false); }
    }, [originalData, previewEnabled, availableChannelKeys]);

    useEffect(() => {
        if (previewTriggerRef.current && !isProcessing) {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => applyPreview());
        }
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [settingsVersion, previewEnabled, isProcessing]);

    const handleReset = () => {
        setPreset('identity');
        settingsRef.current = createDefaultSettings(availableChannelKeys);
        setSettingsVersion(v => v + 1);
        previewTriggerRef.current = true;
    };

    const handleApply = async () => {
        if (!originalData) return;
        setIsProcessing(true);
        try {
            const result = await applyKernelFilterAsync(originalData, settingsRef.current, availableChannelKeys);
            onApply(result);
        } catch (e) { console.error(e); }
        finally {
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

                <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ color: '#ccc', fontSize: '12px', mb: 1 }}>
                        Каналы для обработки:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        {availableChannelKeys.includes('r') && (
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
                        )}
                        {availableChannelKeys.includes('g') && (
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
                        )}
                        {availableChannelKeys.includes('b') && (
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
                        )}
                        {availableChannelKeys.includes('gray') && (
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={settings.channels.gray}
                                        onChange={() => handleChannelChange('gray')}
                                        sx={{ color: '#ccc' }}
                                    />
                                }
                                label={<Typography sx={{ color: '#ccc', fontSize: '12px' }}>Grayscale (G)</Typography>}
                            />
                        )}
                        {availableChannelKeys.includes('a') && (
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
                        )}
                    </Box>
                </Box>

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
                disabled={isProcessing}
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