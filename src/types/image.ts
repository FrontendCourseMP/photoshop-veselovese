export interface IImage {
  width: number;
  height: number;
  format: string;
  pixelData: ImageData; 
}

export interface IPNGImage extends IImage {
  format: 'PNG';
  bitDepth: 8 | 24 | 32;
}

export interface IJPEGImage extends IImage {
  format: 'JPEG';
  bitDepth: 8 | 24 | 32;
}

// Интерфейс для формата GB7
export interface IGB7Image extends IImage {
  format: 'GB7';
  bitDepth: 7 | 8;
  hasMask: boolean;
  rawBytes: Uint8Array; 
}

export type TLoadedImage = IPNGImage | IJPEGImage | IGB7Image;