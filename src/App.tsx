import React, { useState, useCallback } from 'react';
import {
  AppBar, Toolbar, Typography, Button, Box, Container,
  MenuItem, ListItemIcon, ListItemText, Menu
} from '@mui/material';
import {
  Upload as UploadIcon, Save as SaveIcon,
  Image as ImageIcon, InsertDriveFile as FileIcon,
  PhotoFilter as JpgIcon
} from '@mui/icons-material';
import { StatusBar } from './components/StatusBar';
import { CanvasView } from './components/CanvasView';
import { RightToolbar } from './components/RightToolbar';
import { TLoadedImage, IPNGImage, IGB7Image, IJPEGImage } from './types/image';
import { GB7Service } from './utils/gb7';

function App() {
  const [image, setImage] = useState<TLoadedImage | null>(null);
  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null);

  const [saveMenuAnchor, setSaveMenuAnchor] = useState<null | HTMLElement>(null);

  const handleUploadAction = () => {
    fileInputRef?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();

    try {
      if (ext === 'gb7') {
        // Обработка GB7
        const buffer = await file.arrayBuffer();
        const gb7Image = GB7Service.decode(buffer);
        setImage(gb7Image);
      } else {
        // Обработка PNG/JPG через браузерный API
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas Context Error');

        ctx.drawImage(bitmap, 0, 0);
        const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
        console.log('данные изображения:', imageData);

        const hasAlpha = isImageTransparent(imageData.data);
        const bitDepth = hasAlpha ? 32 : 24;

        const stdImage: IPNGImage | IJPEGImage = {
          width: bitmap.width,
          height: bitmap.height,
          format: ext === 'png' ? 'PNG' : 'JPEG',
          bitDepth: bitDepth as any,
          pixelData: imageData
        };
        setImage(stdImage);
        bitmap.close();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isImageTransparent = (data: Uint8ClampedArray): boolean => {
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) return true;
    }
    return false;
  };

  const triggerDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a); // Требуется для Firefox
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Обработчик сохранения как PNG
  const handleSaveAsPng = () => {
    if (!image) return;
    // Создаем временный canvas
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(image.pixelData, 0, 0);

    // Конвертируем в Blob и скачиваем
    canvas.toBlob((blob) => {
      if (blob) {
        triggerDownload(blob, `image-export.png`);
      }
    }, 'image/png');
    setSaveMenuAnchor(null); // Закрываем меню
  };

  // Обработчик сохранения как JPEG
  const handleSaveAsJpg = () => {
    if (!image) return;
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Важно: JPEG не поддерживает прозрачность. 
    // Можно залить белым фоном перед сохранением, иначе прозрачные пиксели станут черными.
    // Но для чистоты лабораторной работы (чтобы сохранить вид) используем стандартное поведение.
    // Если хотим "красивый" JPG, можно нарисовать сначала белый прямоугольник.
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, image.width, image.height);
    ctx.putImageData(image.pixelData, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        triggerDownload(blob, `image-export.jpg`);
      }
    }, 'image/jpeg', 0.9); // 0.9 - качество
    setSaveMenuAnchor(null);
  };

  // Обработчик сохранения как GB7
  const handleSaveAsGb7 = () => {
    if (!image) return;
    // Передаем объект image (реализующий IBaseImage) в наш обновленный сервис
    const blob = GB7Service.encode(image);
    triggerDownload(blob, `image-export.gb7`);
    setSaveMenuAnchor(null);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar variant="dense">
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Photobara
          </Typography>

          <input
            type="file"
            ref={(ref) => setFileInputRef(ref)}
            style={{ display: 'none' }}
            accept="image/png, image/jpeg, .gb7"
            onChange={handleFileChange}
          />

          <Button color="inherit" startIcon={<UploadIcon />} onClick={handleUploadAction}>
            Открыть
          </Button>
          <div>
            <Button
              color="inherit"
              startIcon={<SaveIcon />}
              disabled={!image}
              onClick={(e) => setSaveMenuAnchor(e.currentTarget)}
            >
              Сохранить как...
            </Button>

            <Menu
              anchorEl={saveMenuAnchor}
              open={Boolean(saveMenuAnchor)}
              onClose={() => setSaveMenuAnchor(null)}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <MenuItem onClick={handleSaveAsPng}>
                <ListItemIcon><ImageIcon fontSize="small" /></ListItemIcon>
                <ListItemText>PNG</ListItemText>
              </MenuItem>

              <MenuItem onClick={handleSaveAsJpg}>
                <ListItemIcon><JpgIcon fontSize="small" /></ListItemIcon>
                <ListItemText>JPG</ListItemText>
              </MenuItem>

              <MenuItem onClick={handleSaveAsGb7}>
                <ListItemIcon><FileIcon fontSize="small" /></ListItemIcon>
                <ListItemText>GB7</ListItemText>
              </MenuItem>
            </Menu>
          </div>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flexGrow: 1 }}>
        <CanvasView image={image} />

        <RightToolbar></RightToolbar>
      </Box>

      <StatusBar image={image} />
    </Box>
  );
}

export default App;