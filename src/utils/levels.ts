export interface ChannelLevels {
  blackInput: number;
  whiteInput: number;
  gamma: number;
}

// Полные настройки
export interface LevelsSettings {
  master: ChannelLevels;
  r: ChannelLevels;
  g: ChannelLevels;
  b: ChannelLevels;
  a: ChannelLevels;
}

// Вычисление гистограммы
export const calculateHistogram = (
  data: Uint8ClampedArray,
  channelKey: 'master' | 'r' | 'g' | 'b' | 'a'
): number[] => {
  const histogram = new Array(256).fill(0);

  for (let i = 0; i < data.length; i += 4) {
    let value = 0;
    if (channelKey === 'r') value = data[i];
    else if (channelKey === 'g') value = data[i + 1];
    else if (channelKey === 'b') value = data[i + 2];
    else if (channelKey === 'a') value = data[i + 3];
    else if (channelKey === 'master') {
      // Формула яркости (Rec. 601)
      value = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }
    histogram[value]++;
  }
  return histogram;
};

// Создание LUT (Look-Up Table)
export const createLUT = (black: number, white: number, gamma: number): Uint8Array => {
  const lut = new Uint8Array(256);
  const range = white - black;
  const invGamma = 1 / gamma;

  for (let i = 0; i < 256; i++) {
    let val = (i - black) / range;

    if (val < 0) val = 0;
    else if (val > 1) val = 1;

    val = Math.pow(val, invGamma);

    lut[i] = Math.round(val * 255);
  }
  return lut;
};

// Применение LUT к данным
export const applyLevelsToData = (
  originalData: Uint8ClampedArray,
  settings: LevelsSettings,
  activeChannel: 'master' | 'r' | 'g' | 'b' | 'a'
): Uint8ClampedArray => {
  const newBuffer = new Uint8ClampedArray(originalData);

  const masterLUT = createLUT(settings.master.blackInput, settings.master.whiteInput, settings.master.gamma);
  const rLUT = createLUT(settings.r.blackInput, settings.r.whiteInput, settings.r.gamma);
  const gLUT = createLUT(settings.g.blackInput, settings.g.whiteInput, settings.g.gamma);
  const bLUT = createLUT(settings.b.blackInput, settings.b.whiteInput, settings.b.gamma);
  const aLUT = createLUT(settings.a.blackInput, settings.a.whiteInput, settings.a.gamma);

  for (let i = 0; i < newBuffer.length; i += 4) {
    if (activeChannel === 'master') {
      newBuffer[i] = masterLUT[newBuffer[i]];     // R
      newBuffer[i + 1] = masterLUT[newBuffer[i + 1]]; // G
      newBuffer[i + 2] = masterLUT[newBuffer[i + 2]]; // B
    } else {
      newBuffer[i] = rLUT[newBuffer[i]];
      newBuffer[i + 1] = gLUT[newBuffer[i + 1]];
      newBuffer[i + 2] = bLUT[newBuffer[i + 2]];
    }

    // Альфа канал обрабатываем отдельно 
    if (activeChannel === 'a' || activeChannel === 'master') {
    }
    if (activeChannel === 'a') {
      newBuffer[i + 3] = aLUT[newBuffer[i + 3]];
    }
  }

  return newBuffer;
};