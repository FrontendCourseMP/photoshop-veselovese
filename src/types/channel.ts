export type ChannelKey = 'master' | 'r' | 'g' | 'b' | 'a' | 'gray';
export type FilterChannelKey = Exclude<ChannelKey, 'master'>;

export const toFilterChannelKeys = (keys: ChannelKey[]): FilterChannelKey[] =>
    keys.filter((k): k is FilterChannelKey => k !== 'master');

export interface ChannelConfig {
    key: ChannelKey;
    label: string;
    index: number;
    isGrayscale: boolean;
}