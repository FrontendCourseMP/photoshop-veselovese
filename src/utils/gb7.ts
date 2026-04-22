import { IGB7Image, IImage } from '../types/image';

const SIGNATURE = [0x47, 0x42, 0x37, 0x1D]; // G, B, 7, Group Separator

export const GB7Service = {
    decode: (buffer: ArrayBuffer, fileName: string = 'image.gb7'): IGB7Image => {
        const view = new DataView(buffer);

        for (let i = 0; i < 4; i++) {
            if (view.getUint8(i) !== SIGNATURE[i]) {
                throw new Error('Неверный формат файла');
            }
        }

        const flag = view.getUint8(5);
        const hasMask = (flag & 0x01) === 1;
        console.log(hasMask);
        const width = view.getUint16(6, false);
        const height = view.getUint16(8, false);

        const pixelCount = width * height;
        const imageData = new ImageData(width, height);
        const data = imageData.data;

        let offset = 12;

        for (let i = 0; i < pixelCount; i++) {
            const byte = view.getUint8(offset++);

            const grayValue = (byte & 0x7F) * 2;

            const pixelIndex = i * 4;
            data[pixelIndex] = grayValue;
            data[pixelIndex + 1] = grayValue;
            data[pixelIndex + 2] = grayValue;


            if (hasMask) {
                const isMasked = (byte & 0x80) === 0;
                data[pixelIndex + 3] = isMasked ? 0 : 255;
            } else {
                data[pixelIndex + 3] = 255;
            }
        }

        return {
            fileName: fileName,
            width,
            height,
            format: 'GB7',
            bitDepth: hasMask ? 8 : 7,
            hasMask,
            pixelData: imageData,
            rawBytes: new Uint8Array(buffer)
        };
    },

    hasTransparency: (data: Uint8ClampedArray): boolean => {
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] < 255) return true;
        }
        return false;
    },

    encode: (image: IImage): Blob => {
        const hasMask = GB7Service.hasTransparency(image.pixelData.data);

        const buffer = new ArrayBuffer(12 + image.width * image.height);
        const view = new DataView(buffer);

        SIGNATURE.forEach((byte, i) => view.setUint8(i, byte));

        view.setUint8(4, 0x01);
        view.setUint8(5, hasMask ? 1 : 0);
        view.setUint16(6, image.width, false);
        view.setUint16(8, image.height, false);
        view.setUint16(10, 0x0000);

        const data = image.pixelData.data;
        let offset = 12;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const a = data[i + 3];

            const gray7Bit = (r >> 1) & 0x7F;

            let byte = gray7Bit;

            if (hasMask) {
                if (a > 0) {
                    byte |= 0x80;
                } else {
                    byte &= 0x7F;
                }
            } else {
                byte &= 0x7F;
            }

            view.setUint8(offset++, byte);
        }

        return new Blob([buffer], { type: 'application/octet-stream' });
    }
};