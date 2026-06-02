/* eslint-disable no-restricted-globals */
type EdgeHandling = 'zero' | 'white' | 'replicate';

interface WorkerMessageData {
    buffer: ArrayBuffer;
    width: number;
    height: number;
    settings: {
        kernel: number[];
        channels: Record<string, boolean>;
        edgeHandling: EdgeHandling;
    };
    availableKeys: string[];
}

function padImage(
    data: Uint8ClampedArray, width: number, height: number, edgeHandling: EdgeHandling
): { data: Uint8ClampedArray; width: number; height: number } {
    const pw = width + 2, ph = height + 2;
    const padded = new Uint8ClampedArray(pw * ph * 4);

    // Копируем оригинал в центр
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

    // Заполняем края
    for (let y = 0; y < ph; y++) {
        for (let x = 0; x < pw; x++) {
            const isEdge = x === 0 || x === pw - 1 || y === 0 || y === ph - 1;
            if (!isEdge) continue;

            const dstIdx = (y * pw + x) * 4;
            if (edgeHandling === 'zero') {
                padded[dstIdx] = 0; padded[dstIdx + 1] = 0; padded[dstIdx + 2] = 0; padded[dstIdx + 3] = 255;
            } else if (edgeHandling === 'white') {
                padded[dstIdx] = 255; padded[dstIdx + 1] = 255; padded[dstIdx + 2] = 255; padded[dstIdx + 3] = 255;
            } else {
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

function applyKernelFilterSync(
    data: Uint8ClampedArray, width: number, height: number,
    settings: WorkerMessageData['settings'], availableKeys: string[]
): ImageData {
    const { kernel, channels, edgeHandling } = settings;
    const divisor = kernel.reduce((a, b) => a + b, 0) || 1;
    const padded = padImage(data, width, height, edgeHandling);
    const result = new ImageData(width, height);

    // Копируем исходные данные
    for (let i = 0; i < data.length; i++) result.data[i] = data[i];

    const CHANNEL_INDEX: Record<string, number> = { r: 0, g: 1, b: 2, a: 3 };

    for (const key of availableKeys) {
        if (!channels[key]) continue;

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
            }
        } else if (key === 'a' && channels.a) {
            const chRes = applyConvolutionChannel(padded.data, padded.width, padded.height, kernel, 3, divisor);
            for (let y = 1; y < padded.height - 1; y++) {
                for (let x = 1; x < padded.width - 1; x++) {
                    const srcIdx = (y * padded.width + x) * 4 + 3;
                    const dstIdx = ((y - 1) * width + (x - 1)) * 4 + 3;
                    result.data[dstIdx] = chRes[srcIdx];
                }
            }
        }
    }
    return result;
}

// Обработчик сообщений от основного потока
const workerSelf = self as unknown as DedicatedWorkerGlobalScope;

workerSelf.onmessage = function (e: MessageEvent<WorkerMessageData>) {
    const { buffer, width, height, settings, availableKeys } = e.data;

    const imageData = new Uint8ClampedArray(buffer);
    const result = applyKernelFilterSync(imageData, width, height, settings, availableKeys);

    workerSelf.postMessage(
        { data: result.data.buffer, width: result.width, height: result.height },
        [result.data.buffer]
    );
}