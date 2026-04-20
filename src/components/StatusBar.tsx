import React from 'react';
import { Box, Typography } from '@mui/material';
import { TLoadedImage } from '../types/image';

interface StatusBarProps {
  image: TLoadedImage | null;
}

export const StatusBar: React.FC<StatusBarProps> = ({ image }) => {
  return (
    <Box 
      sx={{ 
        height: '3.2rem', 
        backgroundColor: '#eee', 
        display: 'flex', 
        alignItems: 'center', 
        px: 2, 
        justifyContent: 'space-between',
        borderBottom: '1px solid #ccc',
        fontSize: '0.8rem'
      }}
    >
      {image ? (
        <>
          <Typography variant="caption" sx={{ mr: 2 }}>
            Размер: {image.width} x {image.height} px
          </Typography>
          <Typography variant="caption" sx={{ mr: 2 }}>
            Формат: {image.format}
          </Typography>
          <Typography variant="caption">
            Глубина цвета: {image.bitDepth} бит
          </Typography>
        </>
      ) : (
        <Typography variant="caption" color="textSecondary">
          Нет изображения
        </Typography>
      )}
    </Box>
  );
};