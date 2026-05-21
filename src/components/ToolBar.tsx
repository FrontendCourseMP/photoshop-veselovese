import { Box, Tooltip, IconButton } from "@mui/material";
import {
    Colorize as EyedropperIcon, PanTool as CursorIcon, Tune as TuneIcon, PhotoSizeSelectLarge as ResizeIcon
} from '@mui/icons-material';
import { Tool } from "../types/tool";

interface ToolBarProps {
    activeTool: Tool;
    onToolSelect: (tool: Tool) => void;
    hasImage: boolean;
}

export const ToolBar: React.FC<ToolBarProps> = ({ activeTool, onToolSelect, hasImage }) => {
    return (
        <Box sx={{
            display: 'flex',
            gap: '1.6rem',
            minHeight: '3.2rem',
            backgroundColor: '#383838',
            alignItems: 'start',
            px: 2,
            borderBottom: '1px solid #ccc',
        }}>
            <Tooltip title="Курсор" sx={{ color: '#ccc', fontSize: '1.4rem' }}>
                <IconButton
                    color={activeTool === 'cursor' ? 'primary' : 'default'}
                    onClick={() => onToolSelect('cursor')}
                    sx={{
                        p: 0,
                        alignItems: 'start',
                        '& .MuiSvgIcon-root': {
                            fontSize: '2.4rem',
                        }
                    }}
                >
                    <CursorIcon
                        style={{ color: '#ccc' }} />
                </IconButton>
            </Tooltip>
            <Tooltip title="Пипетка">
                <IconButton
                    color={activeTool === 'eyedropper' ? 'primary' : 'default'}
                    onClick={() => onToolSelect('eyedropper')}
                    sx={{
                        p: 0,
                        alignItems: 'start',
                        '& .MuiSvgIcon-root': {
                            fontSize: '2.4rem',
                        }
                    }}
                >
                    <EyedropperIcon
                        style={{ color: '#ccc' }} />
                </IconButton>
            </Tooltip>
            <Tooltip title="Уровни">
                <IconButton onClick={() => onToolSelect('levels')}
                    sx={{
                        p: 0,
                        alignItems: 'start',
                        '& .MuiSvgIcon-root': {
                            fontSize: '2.4rem',
                        }
                    }}
                    disabled={!hasImage}>
                    <TuneIcon
                        style={{ color: '#ccc' }} />
                </IconButton>
            </Tooltip>
            <Tooltip title="Изменение размера" sx={{ fontSize: '1.4rem' }}>
                <IconButton onClick={() => onToolSelect('resize')}
                    sx={{
                        p: 0,
                        alignItems: 'start',
                        '& .MuiSvgIcon-root': {
                            fontSize: '2.4rem',
                        },
                        '&.Mui-disabled & .MuiSvgIcon-root': {
                            color: '#738388',
                        }
                    }}
                    disabled={!hasImage}>
                    <ResizeIcon
                        style={{ color: '#ccc' }} />
                </IconButton>
            </Tooltip>
        </Box>
    );
};