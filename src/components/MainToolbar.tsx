import { AppBar, Toolbar, Typography, Button, Menu, MenuItem, ListItemText } from "@mui/material";
import { useState } from "react";
import {
    Upload as UploadIcon, Save as SaveIcon,
} from '@mui/icons-material';

interface MainTollbarProps {
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    onOpenClick: () => void;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSavePng: () => void;
    onSaveJpg: () => void;
    onSaveGb7: () => void;
    hasImage: boolean;
}

export const MainToolbar: React.FC<MainTollbarProps> = ({
    fileInputRef,
    onOpenClick,
    onFileChange,
    onSavePng,
    onSaveJpg,
    onSaveGb7,
    hasImage
}) => {
    const [saveMenuAnchor, setSaveMenuAnchor] = useState<null | HTMLElement>(null);

    const handleMenuAction = (action: () => void) => () => {
        action();
        setSaveMenuAnchor(null);
    };
    return (
        <AppBar position="static" color="default" elevation={1} sx={{
            backgroundColor: '#383838',
            minHeight: '4.8rem',
            maxHeight: '4.8rem'
        }}>
            <Toolbar variant="dense">
                <Typography variant="h1" component="div" sx={{ fontWeight: 'bold', fontSize: '2.4rem', color: '#ccc' }}>
                    Photobara
                </Typography>

                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/png, image/jpeg, image/jpg, .gb7"
                    onChange={onFileChange}
                />

                <Button startIcon={<UploadIcon />} onClick={onOpenClick} sx={{
                    fontSize: '1.4rem',
                    color: '#ccc',
                    textTransform: 'none',
                    ml: '4.8rem'
                }}>
                    Открыть
                </Button>
                <div>
                    <Button
                        startIcon={<SaveIcon />}
                        disabled={!hasImage}
                        onClick={(e) => setSaveMenuAnchor(e.currentTarget)}
                        sx={{
                            fontSize: '1.4rem',
                            color: '#ccc',
                            textTransform: 'none',
                            ml: '1.6rem',
                            '&.Mui-disabled': {
                                color: '#738388',
                            }
                        }}
                    >
                        Сохранить как
                    </Button>

                    <Menu
                        anchorEl={saveMenuAnchor}
                        open={Boolean(saveMenuAnchor)}
                        onClose={() => setSaveMenuAnchor(null)}
                        anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'left',
                        }}
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'left',
                        }}
                        sx={{
                            '& .MuiMenu-list': {
                                backgroundColor: '#383838',
                                color: '#ccc',
                                p: 0,
                            }
                        }}
                    >
                        <MenuItem onClick={handleMenuAction(onSavePng)}>
                            <ListItemText sx={{
                                '& .MuiTypography-root': {
                                    fontSize: '1.4rem',
                                }
                            }}>
                                PNG</ListItemText>
                        </MenuItem>

                        <MenuItem onClick={handleMenuAction(onSaveJpg)}>
                            <ListItemText sx={{
                                '& .MuiTypography-root': {
                                    fontSize: '1.4rem',
                                }
                            }}>
                                JPG</ListItemText>
                        </MenuItem>

                        <MenuItem onClick={handleMenuAction(onSaveGb7)}>
                            <ListItemText sx={{
                                '& .MuiTypography-root': {
                                    fontSize: '1.4rem',
                                }
                            }}>
                                GB7</ListItemText>
                        </MenuItem>
                    </Menu>
                </div>
            </Toolbar>
        </AppBar>
    );
};
