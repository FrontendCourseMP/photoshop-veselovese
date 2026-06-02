import { FilterChannelKey } from "../types/channel";

export type EdgeHandling = 'zero' | 'white' | 'replicate';
export type FilterPreset = 'identity' | 'sharpen' | 'gaussian' | 'box' | 'prewittH' | 'prewittV' | 'custom';

export interface KernelFilter {
    name: string;
    kernel: number[];
    divisor?: number;
}

export const FILTER_PRESETS: Record<FilterPreset, KernelFilter> = {
    identity: { name: 'Тождественное отображение', kernel: [0, 0, 0, 0, 1, 0, 0, 0, 0] },
    sharpen: { name: 'Повышение резкости', kernel: [0, -1, 0, -1, 5, -1, 0, -1, 0] },
    gaussian: { name: 'Фильтр Гаусса', kernel: [1, 2, 1, 2, 4, 2, 1, 2, 1], divisor: 16 },
    box: { name: 'Прямоугольное размытие', kernel: [1, 1, 1, 1, 1, 1, 1, 1, 1], divisor: 9 },
    prewittH: { name: 'Оператор Прюитта (горизонтальный)', kernel: [-1, -1, -1, 0, 0, 0, 1, 1, 1] },
    prewittV: { name: 'Оператор Прюитта (вертикальный)', kernel: [-1, 0, 1, -1, 0, 1, -1, 0, 1] },
    custom: { name: 'Пользовательские настройки', kernel: [0, 0, 0, 0, 1, 0, 0, 0, 0] } 
};

export interface FilterSettings {
    kernel: number[];
    channels: Record<FilterChannelKey, boolean>; // Динамическая карта каналов
    edgeHandling: EdgeHandling;
}

export const createDefaultSettings = (availableKeys: FilterChannelKey[]): FilterSettings => {
    const channels: Record<FilterChannelKey, boolean> = {
        r: false, g: false, b: false, a: false, gray: false
    };
    // Включаем по умолчанию доступные каналы
    availableKeys.forEach(key => { channels[key] = true; });
    // Alpha по умолчанию выключен 
    if (availableKeys.includes('a')) channels.a = false;

    return {
        kernel: [...FILTER_PRESETS.identity.kernel],
        channels,
        edgeHandling: 'replicate'
    };
};

const CHANNEL_INDEX: Record<Exclude<FilterChannelKey, 'gray'>, number> = {
    r: 0, g: 1, b: 2, a: 3
};

function padImage(data: Uint8ClampedArray, width: number, height: number, edgeHandling: EdgeHandling): { data: Uint8ClampedArray; width: number; height: number } {
    const pw = width + 2, ph = height + 2;
    const padded = new Uint8ClampedArray(pw * ph * 4);

    // Копируем оригинальное изображение в центр
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const srcIdx = (y * width + x) * 4;
            const dstIdx = ((y + 1) * pw + (x + 1)) * 4;
            padded[dstIdx] = data[srcIdx];
            padded[dstIdx + 1] = data[srcIdx + 1];
            padded[dstIdx + 2] = data[srcIdx + 2];
            padded[dstIdx + 3] = data[srcIdx + 3];
        }
    }

    // Заполняем только краевые пиксели в соответствии со стратегией
    for (let y = 0; y < ph; y++) {
        for (let x = 0; x < pw; x++) {
            // Проверяем, является ли пиксель краевым
            const isEdge = (x === 0 || x === pw - 1 || y === 0 || y === ph - 1);
            if (!isEdge) continue;

            const dstIdx = (y * pw + x) * 4;

            if (edgeHandling === 'zero') {
                padded[dstIdx] = 0;
                padded[dstIdx + 1] = 0;
                padded[dstIdx + 2] = 0;
                padded[dstIdx + 3] = 255;
            } else if (edgeHandling === 'white') {
                padded[dstIdx] = 255;
                padded[dstIdx + 1] = 255;
                padded[dstIdx + 2] = 255;
                padded[dstIdx + 3] = 255;
            } else {
                // копируем ближайший пиксель из оригинала
                const srcX = Math.max(0, Math.min(x - 1, width - 1));
                const srcY = Math.max(0, Math.min(y - 1, height - 1));
                const srcIdx = (srcY * width + srcX) * 4;
                padded[dstIdx] = data[srcIdx];
                padded[dstIdx + 1] = data[srcIdx + 1];
                padded[dstIdx + 2] = data[srcIdx + 2];
                padded[dstIdx + 3] = data[srcIdx + 3];
            }
        }
    }

    console.log('Edge handling:', edgeHandling);
    console.log('Corner pixel (0,0):', padded[0], padded[1], padded[2]);
    console.log('Center pixel:', padded[(ph/2 * pw + pw/2) * 4]);
    return { data: padded, width: pw, height: ph };
}

function applyConvolutionChannel(
    srcData: Uint8ClampedArray, pw: number, ph: number,
    kernel: number[], channelIdx: number, divisor: number
): Uint8ClampedArray {
    const result = new Uint8ClampedArray(pw * ph * 4);

    for (let y = 1; y < ph - 1; y++) {
        for (let x = 1; x < pw - 1; x++) {
            let sum = 0;
            for (let ky = 0; ky < 3; ky++) {
                for (let kx = 0; kx < 3; kx++) {
                    const px = x + kx - 1, py = y + ky - 1;
                    const idx = (py * pw + px) * 4 + channelIdx;
                    sum += srcData[idx] * kernel[ky * 3 + kx];
                }
            }
            const dstIdx = (y * pw + x) * 4 + channelIdx;
            result[dstIdx] = Math.max(0, Math.min(255, Math.round(sum / divisor)));
        }
    }
    return result;
}

export function applyKernelFilter(
    srcImageData: ImageData,
    settings: FilterSettings,
    availableKeys: FilterChannelKey[]
): ImageData {
    const { width, height, data } = srcImageData;
    const { kernel, channels, edgeHandling } = settings;
    const divisor = kernel.reduce((a, b) => a + b, 0) || 1;

    const padded = padImage(data, width, height, edgeHandling);
    const result = new ImageData(width, height);
    for (let i = 0; i < data.length; i++) result.data[i] = data[i];

    // Обрабатываем только доступные и включённые каналы
    for (const key of availableKeys) {
        if (!channels[key]) continue;

        // Для gray обрабатываем R, G, B одинаково (grayscale)
        if (key === 'gray') {
            const lut = applyConvolutionChannel(padded.data, padded.width, padded.height, kernel, 0, divisor);
            for (let y = 1; y < padded.height - 1; y++) {
                for (let x = 1; x < padded.width - 1; x++) {
                    const srcIdx = (y * padded.width + x) * 4;
                    const dstIdx = ((y - 1) * width + (x - 1)) * 4;
                    // Применяем к всем трём каналам
                    result.data[dstIdx] = lut[srcIdx];
                    result.data[dstIdx + 1] = lut[srcIdx];
                    result.data[dstIdx + 2] = lut[srcIdx];
                }
            }
        }
        // Для RGB(A) обрабатываем каждый канал отдельно
        else if (key !== 'a') {
            const idx = CHANNEL_INDEX[key];
            const channelResult = applyConvolutionChannel(padded.data, padded.width, padded.height, kernel, idx, divisor);
            for (let y = 1; y < padded.height - 1; y++) {
                for (let x = 1; x < padded.width - 1; x++) {
                    const srcIdx = (y * padded.width + x) * 4 + idx;
                    const dstIdx = ((y - 1) * width + (x - 1)) * 4 + idx;
                    result.data[dstIdx] = channelResult[srcIdx];
                }
            }
        }
        // Alpha канал
        else if (key === 'a' && channels.a) {
            const channelResult = applyConvolutionChannel(padded.data, padded.width, padded.height, kernel, 3, divisor);
            for (let y = 1; y < padded.height - 1; y++) {
                for (let x = 1; x < padded.width - 1; x++) {
                    const srcIdx = (y * padded.width + x) * 4 + 3;
                    const dstIdx = ((y - 1) * width + (x - 1)) * 4 + 3;
                    result.data[dstIdx] = channelResult[srcIdx];
                }
            }
        }
    }

    return result;
}

// Асинхронная версия для больших изображений
export async function applyKernelFilterAsync(
    srcImageData: ImageData,
    settings: FilterSettings,
    availableKeys: FilterChannelKey[],
    onProgress?: (p: number) => void
): Promise<ImageData> {
    const { width, height, data } = srcImageData;
    const { kernel, channels, edgeHandling } = settings;
    const divisor = kernel.reduce((a, b) => a + b, 0) || 1;

    const padded = padImage(data, width, height, edgeHandling);
    const result = new ImageData(width, height);
    for (let i = 0; i < data.length; i++) result.data[i] = data[i];

    const activeChannels = availableKeys.filter(k => channels[k] && k !== 'a'); // alpha отдельно
    let done = 0;

    for (const key of activeChannels) {
        if (key === 'gray') {
            const lut = applyConvolutionChannel(padded.data, padded.width, padded.height, kernel, 0, divisor);
            for (let y = 1; y < padded.height - 1; y++) {
                for (let x = 1; x < padded.width - 1; x++) {
                    const srcIdx = (y * padded.width + x) * 4;
                    const dstIdx = ((y - 1) * width + (x - 1)) * 4;
                    result.data[dstIdx] = lut[srcIdx];
                    result.data[dstIdx + 1] = lut[srcIdx];
                    result.data[dstIdx + 2] = lut[srcIdx];
                }
                if (y % 200 === 0) await new Promise(r => setTimeout(r, 0));
            }
        } else if (key !== 'a') {
            const idx = CHANNEL_INDEX[key];
            const chRes = applyConvolutionChannel(padded.data, padded.width, padded.height, kernel, idx, divisor);
            for (let y = 1; y < padded.height - 1; y++) {
                for (let x = 1; x < padded.width - 1; x++) {
                    const srcIdx = (y * padded.width + x) * 4 + idx;
                    const dstIdx = ((y - 1) * width + (x - 1)) * 4 + idx;
                    result.data[dstIdx] = chRes[srcIdx];
                }
                if (y % 200 === 0) await new Promise(r => setTimeout(r, 0));
            }
        }
        done++;
        if (onProgress) onProgress(done / activeChannels.length);
    }

    // Alpha
    if (channels.a && availableKeys.includes('a')) {
        const chRes = applyConvolutionChannel(padded.data, padded.width, padded.height, kernel, 3, divisor);
        for (let y = 1; y < padded.height - 1; y++) {
            for (let x = 1; x < padded.width - 1; x++) {
                const srcIdx = (y * padded.width + x) * 4 + 3;
                const dstIdx = ((y - 1) * width + (x - 1)) * 4 + 3;
                result.data[dstIdx] = chRes[srcIdx];
            }
        }
    }

    return result;
}