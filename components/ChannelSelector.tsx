// ChannelSelector.tsx - 운영 채널 선택 + 대표 채널 지정 (지명형 1a-v2 §3.2)
'use client';

import { CHANNEL_TYPES } from '@/lib/constants';

interface ChannelSelectorProps {
    channelTypes: string[];
    representativeChannel: string;
    onChange: (patch: { channelTypes?: string[]; representativeChannel?: string }) => void;
}

export default function ChannelSelector({ channelTypes, representativeChannel, onChange }: ChannelSelectorProps) {
    function toggleChannel(channel: string) {
        const next = channelTypes.includes(channel)
            ? channelTypes.filter((c) => c !== channel)
            : [...channelTypes, channel];
        // 대표 채널을 해제하면 대표도 함께 비운다 (서버 규칙 2 REPRESENTATIVE_NOT_OWNED 선제 차단)
        const nextRepresentative = next.includes(representativeChannel) ? representativeChannel : '';
        onChange({ channelTypes: next, representativeChannel: nextRepresentative });
    }

    return (
        <div className="flex flex-col gap-4">
            <div>
                <label className="block text-sm font-medium text-ink mb-2">
                    운영 중인 채널 <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                    {CHANNEL_TYPES.map((channel) => {
                        const selected = channelTypes.includes(channel);
                        return (
                            <button
                                key={channel}
                                type="button"
                                onClick={() => toggleChannel(channel)}
                                aria-pressed={selected}
                                className={`px-4 h-10 rounded-full border text-sm transition-colors ${
                                    selected
                                        ? 'bg-brand-bg text-brand-strong border-brand/30 font-medium'
                                        : 'bg-card text-ink2 border-line hover:border-strong'
                                }`}
                            >
                                {channel}
                            </button>
                        );
                    })}
                </div>
            </div>

            {channelTypes.length > 0 && (
                <div>
                    <label className="block text-sm font-medium text-ink mb-1">
                        대표 채널 <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-ink3 mb-2">캠지기 목록에서 이 채널의 정보가 대표로 보여요.</p>
                    <div className="flex flex-wrap gap-2">
                        {channelTypes.map((channel) => (
                            <button
                                key={channel}
                                type="button"
                                onClick={() => onChange({ representativeChannel: channel })}
                                aria-pressed={representativeChannel === channel}
                                className={`px-4 h-10 rounded-full border text-sm transition-colors ${
                                    representativeChannel === channel
                                        ? 'bg-brand text-black border-brand font-bold'
                                        : 'bg-card text-ink2 border-line hover:border-strong'
                                }`}
                            >
                                {channel}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
