export type InterpolationMethod = 'nearest' | 'bilinear';

export const INTERPOLATION_CONFIG: Record<InterpolationMethod, { label: string; tooltip: string }> = {
  nearest: {
    label: 'Ближайший сосед',
    tooltip: 'Выбирает цвет ближайшего пикселя. Идеально для пиксель-арта и резких графических элементов. Быстрый, но может давать "лесенку" на фото.'
  },
  bilinear: {
    label: 'Билинейная',
    tooltip: 'Усредняет цвета 4 ближайших пикселей с учётом расстояния. Даёт плавные переходы, убирает ступенчатость. Стандарт для фотографий.'
  }
};

export function resizeImage(src: ImageData, newWidth: number, newHeight: number, method: InterpolationMethod): ImageData {
  const dst = new ImageData(newWidth, newHeight);
  const srcData = src.data;
  const dstData = dst.data;
  const srcW = src.width;
  const srcH = src.height;
  
  const ratioX = srcW / newWidth;
  const ratioY = srcH / newHeight;

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = x * ratioX;
      const srcY = y * ratioY;

      if (method === 'nearest') {
        const sx = Math.round(srcX);
        const sy = Math.round(srcY);
        const srcIdx = (Math.min(sy, srcH - 1) * srcW + Math.min(sx, srcW - 1)) * 4;
        const dstIdx = (y * newWidth + x) * 4;
        dstData[dstIdx] = srcData[srcIdx];
        dstData[dstIdx + 1] = srcData[srcIdx + 1];
        dstData[dstIdx + 2] = srcData[srcIdx + 2];
        dstData[dstIdx + 3] = srcData[srcIdx + 3];
      } else {
        // Bilinear
        const x0 = Math.floor(srcX), y0 = Math.floor(srcY);
        const x1 = Math.min(x0 + 1, srcW - 1), y1 = Math.min(y0 + 1, srcH - 1);
        const fx = srcX - x0, fy = srcY - y0;

        const getPixel = (px: number, py: number) => {
          const idx = (py * srcW + px) * 4;
          return [srcData[idx], srcData[idx + 1], srcData[idx + 2], srcData[idx + 3]];
        };

        const p00 = getPixel(x0, y0), p10 = getPixel(x1, y0);
        const p01 = getPixel(x0, y1), p11 = getPixel(x1, y1);

        const dstIdx = (y * newWidth + x) * 4;
        for (let c = 0; c < 4; c++) {
          const v = p00[c] * (1 - fx) * (1 - fy) + 
                    p10[c] * fx * (1 - fy) + 
                    p01[c] * (1 - fx) * fy + 
                    p11[c] * fx * fy;
          dstData[dstIdx + c] = Math.round(v);
        }
      }
    }
  }
  return dst;
}