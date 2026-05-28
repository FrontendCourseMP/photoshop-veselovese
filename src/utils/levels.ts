import { ChannelKey } from '../types/channel';

export interface LevelsConfig {
  black: number;
  white: number;
  midtone: number;
}

export interface LevelsSettings {
  master: LevelsConfig;
  r: LevelsConfig;
  g: LevelsConfig;
  b: LevelsConfig;
  a: LevelsConfig;
  gray: LevelsConfig;
}


// Создаёт конфигурацию уровней по умолчанию
export const createDefaultConfig = (maxValue: number): LevelsConfig => ({
  black: 0,
  white: maxValue,
  midtone: Math.round(maxValue / 2)
});

// Создаёт полный набор настроек для всех каналов
export const createDefaultSettings = (maxValue: number): LevelsSettings => {
  const cfg = createDefaultConfig(maxValue);
  return {
    master: { ...cfg },
    r: { ...cfg },
    g: { ...cfg },
    b: { ...cfg },
    a: { ...cfg },
    gray: { ...cfg }
  };
};

// Проверяет, является ли конфигурация дефолтной (без изменений)
export const isDefaultConfig = (config: LevelsConfig, maxValue: number): boolean => {
  return config.black === 0 &&
    config.white === maxValue &&
    config.midtone === Math.round(maxValue / 2);
};

// Проверяет, есть ли изменения в настройках хотя бы одного канала
export const hasAnyChanges = (settings: LevelsSettings, maxValue: number): boolean => {
  return !Object.values(settings).every(cfg => isDefaultConfig(cfg, maxValue));
};

// Строит lookup-таблицу для применения уровней с гамма-коррекцией 
const buildLUT = (config: LevelsConfig, maxValue: number): Uint8Array => {
  const toPhys = (v: number) => Math.round(v * (255 / maxValue));
  const b = toPhys(config.black);
  const w = toPhys(config.white);
  const range = Math.max(1, w - b);

  const mRange = config.white - config.black;
  const mPos = config.midtone - config.black;

  let gamma = (mRange > 0 && mPos > 0 && mPos < mRange)
    ? Math.log(0.5) / Math.log(mPos / mRange)
    : 1.0;
  gamma = Math.max(0.1, Math.min(9.9, gamma));
  const invGamma = 1 / gamma;

  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    if (i <= b) lut[i] = 0;
    else if (i >= w) lut[i] = 255;
    else lut[i] = Math.round(255 * Math.pow((i - b) / range, invGamma));
  }
  return lut;
};

// Применяет настройки уровней к ImageData
// возвращает новый ImageData с применёнными изменениями, или null если изменений нет
export const applyLevelsToImageData = (
  originalData: ImageData,
  settings: LevelsSettings,
  channel: ChannelKey,
  maxValue: number
): ImageData | null => {
  if (!hasAnyChanges(settings, maxValue)) return null;

  let rLUT: Uint8Array | null = null;
  let gLUT: Uint8Array | null = null;
  let bLUT: Uint8Array | null = null;
  let aLUT: Uint8Array | null = null;

  if (channel === 'master') {
    const lut = buildLUT(settings.master, maxValue);
    rLUT = gLUT = bLUT = lut;
  } else if (channel === 'gray') {
    const lut = buildLUT(settings.gray, maxValue);
    rLUT = gLUT = bLUT = lut;
  } else if (channel === 'r') {
    rLUT = buildLUT(settings.r, maxValue);
  } else if (channel === 'g') {
    gLUT = buildLUT(settings.g, maxValue);
  } else if (channel === 'b') {
    bLUT = buildLUT(settings.b, maxValue);
  } else if (channel === 'a') {
    aLUT = buildLUT(settings.a, maxValue);
  }

  const newData = new ImageData(
    new Uint8ClampedArray(originalData.data),
    originalData.width,
    originalData.height
  );
  const d = newData.data;

  for (let i = 0; i < d.length; i += 4) {
    if (rLUT) d[i] = rLUT[d[i]];
    if (gLUT) d[i + 1] = gLUT[d[i + 1]];
    if (bLUT) d[i + 2] = bLUT[d[i + 2]];
    if (aLUT) d[i + 3] = aLUT[d[i + 3]];
  }
  return newData;
};

// Рассчитывает гистограмму для указанного канала
export const calculateHistogram = (
  imageData: ImageData,
  channel: ChannelKey,
  maxValue: number
): number[] => {
  const hist = new Array(256).fill(0);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    let val: number;

    if (channel === 'master') {
      if (maxValue === 127) {
        // Для GB7: master = grayscale (первый канал)
        val = data[i];
      } else {
        // Для RGB: формула светлоты
        val = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      }
    } else if (channel === 'gray') {
      val = data[i];
    } else if (channel === 'a') {
      val = data[i + 3];
    } else if (channel === 'r') {
      val = data[i];
    } else if (channel === 'g') {
      val = data[i + 1];
    } else if (channel === 'b') {
      val = data[i + 2];
    } else {
      val = data[i];
    }

    hist[Math.min(maxValue, Math.round(val * (maxValue / 255)))]++;
  }
  return hist;
};

// Обновляет одно значение в настройках уровня с валидацией границ
export const updateLevelSetting = (
  settings: LevelsSettings,
  channel: ChannelKey,
  key: keyof LevelsConfig,
  value: number
): LevelsSettings => {
  const current = settings[channel];
  let updated = { ...current };

  if (key === 'black') {
    updated.black = Math.min(value, current.white - 1);
    updated.midtone = Math.round((current.white + current.black) / 2);
  } else if (key === 'white') {
    updated.white = Math.max(value, current.black + 1);
    updated.midtone = Math.max(Math.round((current.white + current.black) / 2), current.black + 1);
  } else if (key === 'midtone') {
    updated.midtone = value;
  }

  return { ...settings, [channel]: updated };
};