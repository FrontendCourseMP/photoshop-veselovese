import { Toolbar, } from '@mui/material';
import React from 'react';
import { Divider } from '@mui/material';
import { ChannelsPanel } from './ChannelsPanel';
import { InfoPanel } from './InfoPanel';
import { ChannelConfig } from '../types/channel';

interface RightToolbarProps {
    originalData: ImageData | null;
    channels: ChannelConfig[];
    visibleState: Record<string, boolean>;
    onToggleChannel: (key: string) => void;

    colorData: { x: number; y: number; r: number; g: number; b: number; L: number; A: number; B: number } | null;
}

export const RightToolbar: React.FC<RightToolbarProps> = ({ originalData, channels, visibleState, onToggleChannel, colorData }) => {
    return (
        <Toolbar
            sx={{
                backgroundColor: '#2c2c2c',
                display: 'flex',
                alignItems: 'start',
                flexDirection: 'column',
                gap: '1.6rem',
                p: '2.4rem',
                borderLeft: '1px solid #383838',
                fontSize: '1.4rem',
                height: '100%',
                width: '100%',
                maxWidth: '300px',
            }}
        >
            <InfoPanel colorData={colorData} />

            <Divider sx={{ width: '100%', border: '1px solid #ccc' }} />

            <ChannelsPanel
                originalData={originalData}
                channels={channels}
                visibleState={visibleState}
                onToggleChannel={onToggleChannel}
            />
        </Toolbar>
    );
};
