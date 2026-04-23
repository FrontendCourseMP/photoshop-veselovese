import { Box, Tooltip, IconButton } from "@mui/material";
import {
    Colorize as EyedropperIcon, PanTool as CursorIcon
} from '@mui/icons-material';
import { Tool } from "../types/tool";

interface ToolBarProps {
    activeTool: Tool;
    onToolSelect: (tool: Tool) => void;
}

export const ToolBar: React.FC<ToolBarProps> = ({ activeTool, onToolSelect }) => {
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
                    <CursorIcon />
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
                    <EyedropperIcon />
                </IconButton>
            </Tooltip>
        </Box>
    );
};