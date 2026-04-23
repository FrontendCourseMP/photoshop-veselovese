export type ChannelKey = 'r' | 'g' | 'b' | 'a' | 'gray';

export interface ChannelConfig {
    key: ChannelKey;
    label: string;
    index: number;
    isGrayscale: boolean;
}