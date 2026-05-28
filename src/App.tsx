import React, { useState, useRef, } from 'react';

import {
  Box,
} from '@mui/material';

import { StatusBar } from './components/StatusBar';
import { CanvasView } from './components/CanvasView';
import { RightToolbar } from './components/RightToolbar';
import { MainToolbar } from './components/MainToolbar';
import { TLoadedImage, IPNGImage, IJPEGImage } from './types/image';
import { ChannelConfig, ChannelKey } from './types/channel';

import { GB7Service } from './utils/gb7';
import { rgbToLab } from './utils/color';
import { ToolBar } from './components/ToolBar';
import { Tool } from './types/tool';
import { LevelsDialog } from './components/LevelsDialog';
import { InterpolationMethod, resizeImage } from './utils/interpolation';
import { ResizeDialog } from './components/ResizeDialog';
import { FilterDialog } from './components/FilterDialog';

function App() {
  const [image, setImage] = useState<TLoadedImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);
  const [previewImageData, setPreviewImageData] = useState<ImageData | null>(null);

  const [availableChannels, setAvailableChannels] = useState<ChannelConfig[]>([]);
  const [visibleChannels, setVisibleChannels] = useState<Record<string, boolean>>({});
  const [activeTool, setActiveTool] = useState<Tool>('cursor');
  const [pickedColor, setPickedColor] = useState<{ x: number; y: number; r: number; g: number; b: number; L: number; A: number; B: number } | null>(null);

  const [viewScale, setViewScale] = useState<number>(100);
  const [interpolationMethod, setInterpolationMethod] = useState<InterpolationMethod>('bilinear');

  const calculateInitialScale = (imgW: number, imgH: number) => {
    const availW = window.innerWidth - 350;
    const availH = window.innerHeight - 180;
    const fitScale = Math.min(availW / imgW, availH / imgH) * 100;
    return Math.max(12, Math.min(300, Math.round(fitScale)));
  };

  const getAvailableChannels = (image: TLoadedImage | null): ChannelConfig[] => {
    if (!image) return [];

    // Логика для формата GB7
    if (image.format === 'GB7') {
      const channels: ChannelConfig[] = [
        { key: 'gray', label: 'Grayscale  (G)', index: 0, isGrayscale: true }
      ];

      // Проверяем флаг hasMask из интерфейса IGB7Image
      if ('hasMask' in image && image.hasMask) {
        channels.push({ key: 'a', label: 'Альфа (А)', index: 3, isGrayscale: true });
      }

      return channels;
    }
    // Логика для PNG и JPEG
    else {
      const channels: ChannelConfig[] = [
        { key: 'r', label: 'Красный (R)', index: 0, isGrayscale: false },
        { key: 'g', label: 'Зеленый (G)', index: 1, isGrayscale: false },
        { key: 'b', label: 'Синий (B)', index: 2, isGrayscale: false },
      ];

      // Проверяем глубину цвета или наличие прозрачности
      if (image.bitDepth === 32) {
        channels.push({ key: 'a', label: 'Альфа (A)', index: 3, isGrayscale: true });
      }

      return channels;
    }
  };

  const getExportFileName = (originalName: string, newExtension: string) => {
    const lastDotIndex = originalName.lastIndexOf('.');
    const nameWithoutExt = lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;
    return `${nameWithoutExt}.${newExtension}`;
  };

  const handleUploadAction = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();

    try {
      if (ext === 'gb7') {
        const buffer = await file.arrayBuffer();
        const gb7Image = GB7Service.decode(buffer, file.name);
        processLoadedImage(gb7Image);
      } else {
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas Context Error');

        ctx.drawImage(bitmap, 0, 0);
        const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);

        const hasAlpha = isImageTransparent(imageData.data);
        const bitDepth = hasAlpha ? 32 : 24;

        const stdImage: IPNGImage | IJPEGImage = {
          fileName: file.name,
          width: bitmap.width,
          height: bitmap.height,
          format: ext === 'png' ? 'PNG' : 'JPG',
          bitDepth: bitDepth as any,
          pixelData: imageData
        };
        processLoadedImage(stdImage);
        bitmap.close();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const processLoadedImage = (loadedImage: TLoadedImage) => {
    setImage(loadedImage);
    setOriginalImageData(new ImageData(
      new Uint8ClampedArray(loadedImage.pixelData.data),
      loadedImage.width,
      loadedImage.height
    ));
    const channels = getAvailableChannels(loadedImage);
    setAvailableChannels(channels);

    const initialVisibility = channels.reduce((acc, ch) => {
      acc[ch.key] = true;
      return acc;
    }, {} as Record<string, boolean>);

    setVisibleChannels(initialVisibility);
    setPickedColor(null);

    const initialScale = calculateInitialScale(loadedImage.width, loadedImage.height);
    setViewScale(initialScale);
  };

  const handleResizeApply = (_: any, targetW: number, targetH: number) => {
    if (!image) return;
    if (!originalImageData) return;

    // Применяем интерполяцию
    const resizedData = resizeImage(originalImageData, targetW, targetH, interpolationMethod);

    setImage(prev => prev ? { ...prev, width: targetW, height: targetH, pixelData: resizedData } : null);
    setOriginalImageData(resizedData);
    setActiveTool('cursor');
  };

  const isImageTransparent = (data: Uint8ClampedArray): boolean => {
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) return true;
    }
    return false;
  };

  const handlePixelPicked = (x: number, y: number, r: number, g: number, b: number) => {
    const lab = rgbToLab(r, g, b);
    setPickedColor({ x, y, r, g, b, ...lab });
  };

  const triggerDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveAsPng = () => {
    if (!image) return;
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(image.pixelData, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const newName = getExportFileName(image.fileName, 'png');
        triggerDownload(blob, newName);
      }
    }, 'image/png');
  };

  const handleSaveAsJpg = () => {
    if (!image) return;
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, image.width, image.height);
    ctx.putImageData(image.pixelData, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const newName = getExportFileName(image.fileName, 'jpg');
        triggerDownload(blob, newName);
      }
    }, 'image/jpeg', 0.9);
  };

  const handleSaveAsGb7 = () => {
    if (!image) return;
    const blob = GB7Service.encode(image);
    const newName = getExportFileName(image.fileName, 'gb7');
    triggerDownload(blob, newName);
  };

  const handleLevelsApply = (newImageData: ImageData) => {
    if (!image) return;
    const isUnchanged = !newImageData || newImageData.data.every((v, i) => v === originalImageData?.data[i]);
    if (isUnchanged) {
      setActiveTool('cursor');
      setPreviewImageData(null);
      return;
    }

    setOriginalImageData(newImageData);
    setImage({ ...image, pixelData: newImageData });
    setPreviewImageData(null);
    setActiveTool('cursor');
  }

  const getMaxValue = (image: TLoadedImage | null): number => {
    if (!image) return 255;
    return image.format === 'GB7' ? 127 : 255;
  };

  const getAvailableChannelKeys = (image: TLoadedImage | null): ChannelKey[] => {
    if (!image) return ['master', 'r', 'g', 'b', 'a'];

    if (image.format === 'GB7') {
      const channels: ChannelKey[] = ['master', 'gray'];
      if ('hasMask' in image && image.hasMask) channels.push('a');
      return channels;
    } else {
      const channels: ChannelKey[] = ['master', 'r', 'g', 'b'];
      if (image.bitDepth === 32) channels.push('a');
      return channels;
    }
  };

  const handleFilterApply = (newImageData: ImageData) => {
    if (!image) return;
    console.log(originalImageData, newImageData)
    const isUnchanged = !newImageData || newImageData.data.every((v, i) => v === originalImageData?.data[i]);
    if (isUnchanged) {
      setActiveTool('cursor');
      setPreviewImageData(null);
      return;
    }

    setOriginalImageData(newImageData);
    setImage({ ...image, pixelData: newImageData });
    setPreviewImageData(null);
    setActiveTool('cursor');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <MainToolbar fileInputRef={fileInputRef}
        onOpenClick={handleUploadAction}
        onFileChange={handleFileChange}
        onSavePng={handleSaveAsPng}
        onSaveJpg={handleSaveAsJpg}
        onSaveGb7={handleSaveAsGb7}
        hasImage={!!image} />

      <ToolBar
        activeTool={activeTool}
        onToolSelect={(tool) => {
          if ((tool === 'levels' || tool == 'resize') && !originalImageData) return;
          setActiveTool(tool)
        }}
        hasImage={!!image} />

      <Box sx={{ display: 'flex', flexGrow: 1 }}>
        <CanvasView
          originalData={originalImageData}
          previewData={previewImageData}
          visibleChannels={visibleChannels}
          availableChannels={availableChannels}
          activeTool={activeTool}
          viewScale={viewScale / 100}
          onPixelPicked={handlePixelPicked} />
        <RightToolbar
          originalData={originalImageData}
          channels={availableChannels}
          visibleState={visibleChannels}
          onToggleChannel={(ch) => setVisibleChannels(prev => ({ ...prev, [ch]: !prev[ch] }))}
          colorData={pickedColor}
        />
      </Box>

      <StatusBar
        image={image}
        viewScale={viewScale}
        onScaleChange={setViewScale}
      />

      <LevelsDialog
        open={activeTool === 'levels' && !!originalImageData}
        onClose={() => setActiveTool('cursor')}
        onApply={handleLevelsApply}
        onPreviewChange={setPreviewImageData}
        originalData={originalImageData}
        maxValue={getMaxValue(image)}
        availableChannelKeys={getAvailableChannelKeys(image)}
      />

      <ResizeDialog
        open={activeTool === 'resize' && !!originalImageData}
        onClose={() => setActiveTool('cursor')}
        onApply={handleResizeApply}
        originalWidth={originalImageData?.width || 0}
        originalHeight={originalImageData?.height || 0}
        originalImageData={originalImageData}
      />

      <FilterDialog
        open={activeTool === 'filter' && !!originalImageData}
        onClose={() => setActiveTool('cursor')}
        onApply={handleFilterApply}
        onPreviewChange={setPreviewImageData}
        originalData={originalImageData}
      />
    </Box>
  );
}

export default App;