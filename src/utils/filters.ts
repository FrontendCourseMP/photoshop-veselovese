export type EdgeHandling = 'zero' | 'white' | 'replicate';
export type FilterPreset = 'identity' | 'sharpen' | 'gaussian' | 'box' | 'prewittH' | 'prewittV';

export interface KernelFilter {
  name: string;
  kernel: number[]; // 9 values for 3x3
  divisor?: number; // Optional normalization
}

export const FILTER_PRESETS: Record<FilterPreset, KernelFilter> = {
  identity: {
    name: 'Тождественное отображение',
    kernel: [0, 0, 0, 0, 1, 0, 0, 0, 0]
  },
  sharpen: {
    name: 'Повышение резкости',
    kernel: [0, -1, 0, -1, 5, -1, 0, -1, 0]
  },
  gaussian: {
    name: 'Фильтр Гаусса (3×3)',
    kernel: [1, 2, 1, 2, 4, 2, 1, 2, 1],
    divisor: 16
  },
  box: {
    name: 'Прямоугольное размытие',
    kernel: [1, 1, 1, 1, 1, 1, 1, 1, 1],
    divisor: 9
  },
  prewittH: {
    name: 'Оператор Прюитта (горизонтальный)',
    kernel: [-1, -1, -1, 0, 0, 0, 1, 1, 1]
  },
  prewittV: {
    name: 'Оператор Прюитта (вертикальный)',
    kernel: [-1, 0, 1, -1, 0, 1, -1, 0, 1]
  }
};

export interface FilterSettings {
  kernel: number[];
  channels: {
    r: boolean;
    g: boolean;
    b: boolean;
    a: boolean;
  };
  edgeHandling: EdgeHandling;
}

export const createDefaultSettings = (): FilterSettings => ({
  kernel: [...FILTER_PRESETS.identity.kernel],
  channels: { r: true, g: true, b: true, a: false },
  edgeHandling: 'replicate'
});

// Расширение изображения с учетом стратегии обработки краев
function padImage(data: Uint8ClampedArray, width: number, height: number, edgeHandling: EdgeHandling): { data: Uint8ClampedArray; width: number; height: number } {
  const paddedWidth = width + 2;
  const paddedHeight = height + 2;
  const paddedData = new Uint8ClampedArray(paddedWidth * paddedHeight * 4);

  for (let y = 0; y < paddedHeight; y++) {
    for (let x = 0; x < paddedWidth; x++) {
      const dstIdx = (y * paddedWidth + x) * 4;
      
      if (x === 0 || x === paddedWidth - 1 || y === 0 || y === paddedHeight - 1) {
        const srcX = Math.max(0, Math.min(x - 1, width - 1));
        const srcY = Math.max(0, Math.min(y - 1, height - 1));
        const srcIdx = (srcY * width + srcX) * 4;

        if (edgeHandling === 'zero') {
          paddedData[dstIdx] = 0;
          paddedData[dstIdx + 1] = 0;
          paddedData[dstIdx + 2] = 0;
          paddedData[dstIdx + 3] = 255;
        } else if (edgeHandling === 'white') {
          paddedData[dstIdx] = 255;
          paddedData[dstIdx + 1] = 255;
          paddedData[dstIdx + 2] = 255;
          paddedData[dstIdx + 3] = 255;
        } else {
          // replicate
          paddedData[dstIdx] = data[srcIdx];
          paddedData[dstIdx + 1] = data[srcIdx + 1];
          paddedData[dstIdx + 2] = data[srcIdx + 2];
          paddedData[dstIdx + 3] = data[srcIdx + 3];
        }
      } else {
        // Внутренняя часть - копируем оригинал
        const srcIdx = ((y - 1) * width + (x - 1)) * 4;
        paddedData[dstIdx] = data[srcIdx];
        paddedData[dstIdx + 1] = data[srcIdx + 1];
        paddedData[dstIdx + 2] = data[srcIdx + 2];
        paddedData[dstIdx + 3] = data[srcIdx + 3];
      }
    }
  }

  return { data: paddedData, width: paddedWidth, height: paddedHeight };
}

// Применение свертки к одному каналу
function applyConvolutionChannel(
  srcData: Uint8ClampedArray,
  width: number,
  height: number,
  kernel: number[],
  channelIdx: number,
  divisor: number
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(width * height * 4);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      
      for (let ky = 0; ky < 3; ky++) {
        for (let kx = 0; kx < 3; kx++) {
          const px = x + kx - 1;
          const py = y + ky - 1;
          const idx = (py * width + px) * 4 + channelIdx;
          const kIdx = ky * 3 + kx;
          sum += srcData[idx] * kernel[kIdx];
        }
      }
      
      const dstIdx = (y * width + x) * 4 + channelIdx;
      result[dstIdx] = Math.max(0, Math.min(255, Math.round(sum / divisor)));
    }
  }
  
  return result;
}

// Основная функция применения фильтра
export function applyKernelFilter(
  srcImageData: ImageData,
  settings: FilterSettings
): ImageData {
  const { width, height, data } = srcImageData;
  const { kernel, channels, edgeHandling } = settings;
  
  // Вычисляем делитель
  const divisor = kernel.reduce((a, b) => a + b, 0) || 1;
  
  // Расширяем изображение для обработки краев
  const padded = padImage(data, width, height, edgeHandling);
  
  // Создаем результат
  const result = new ImageData(width, height);
  
  // Копируем оригинальные данные
  for (let i = 0; i < data.length; i++) {
    result.data[i] = data[i];
  }
  
  const channelMap = [
    { key: 'r' as const, idx: 0 },
    { key: 'g' as const, idx: 1 },
    { key: 'b' as const, idx: 2 },
    { key: 'a' as const, idx: 3 }
  ];
  
  for (const { key, idx } of channelMap) {
    if (!channels[key]) continue;
    
    const channelResult = applyConvolutionChannel(
      padded.data,
      padded.width,
      padded.height,
      kernel,
      idx,
      divisor
    );
    
    for (let y = 1; y < padded.height - 1; y++) {
      for (let x = 1; x < padded.width - 1; x++) {
        const srcIdx = (y * padded.width + x) * 4 + idx;
        const dstIdx = ((y - 1) * width + (x - 1)) * 4 + idx;
        result.data[dstIdx] = channelResult[srcIdx];
      }
    }
  }
  
  return result;
}

export async function applyKernelFilterAsync(
  srcImageData: ImageData,
  settings: FilterSettings,
  onProgress?: (progress: number) => void
): Promise<ImageData> {
  const { width, height, data } = srcImageData;
  const { kernel, channels, edgeHandling } = settings;
  
  const divisor = kernel.reduce((a, b) => a + b, 0) || 1;
  const padded = padImage(data, width, height, edgeHandling);
  const result = new ImageData(width, height);
  
  for (let i = 0; i < data.length; i++) {
    result.data[i] = data[i];
  }
  
  const channelMap = [
    { key: 'r' as const, idx: 0 },
    { key: 'g' as const, idx: 1 },
    { key: 'b' as const, idx: 2 },
    { key: 'a' as const, idx: 3 }
  ];
  
  let processedChannels = 0;
  const totalChannels = Object.values(channels).filter(Boolean).length;
  
  for (const { key, idx } of channelMap) {
    if (!channels[key]) continue;
    
    for (let y = 1; y < padded.height - 1; y++) {
      for (let x = 1; x < padded.width - 1; x++) {
        let sum = 0;
        
        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            const px = x + kx - 1;
            const py = y + ky - 1;
            const srcIdx = (py * padded.width + px) * 4 + idx;
            const kIdx = ky * 3 + kx;
            sum += padded.data[srcIdx] * kernel[kIdx];
          }
        }
        
        const dstIdx = ((y - 1) * width + (x - 1)) * 4 + idx;
        result.data[dstIdx] = Math.max(0, Math.min(255, Math.round(sum / divisor)));
      }
      
      if (y % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    processedChannels++;
    if (onProgress) {
      onProgress(processedChannels / totalChannels);
    }
  }
  
  return result;
}