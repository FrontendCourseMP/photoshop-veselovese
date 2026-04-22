import { Toolbar, Typography } from '@mui/material';

export const RightToolbar = () => {
    return (
        <Toolbar
            sx={{
                backgroundColor: '#2c2c2c',
                display: 'flex',
                alignItems: 'start',
                p: '2.4rem',
                borderLeft: '1px solid #383838',
                fontSize: '0.8rem',
                height: '100%',
                minWidth: '300px',
                maxWidth: '300px',
            }}
        >
            <Typography variant="caption" sx={{ color: '#ccc', fontSize: '1.4rem' }}>
                Правая панель инструментов
            </Typography>
        </Toolbar>
    );
};
