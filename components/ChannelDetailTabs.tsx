// ChannelDetailTabs.tsx - 선택한 채널만 탭으로, 채널별 URL·지표·강점 입력 (지명형 1a-v2 §3.2)
'use client';

import { useState } from 'react';
import { CHANNEL_FIELD_MAP, CHANNEL_METRIC_LABELS, BLOG_INDEX_LEVELS } from '@/lib/constants';
import type { ChannelDetail } from '@/types';

interface ChannelDetailTabsProps {
    channelTypes: string[];
    channels: Record<string, ChannelDetail>;
    onChange: (channels: Record<string, ChannelDetail>) => void;
}

const EMPTY_DETAIL: ChannelDetail = { url: '', follower: 0, engagement: 0, blogIndex: '', strength: '' };

export default function ChannelDetailTabs({ channelTypes, channels, onChange }: ChannelDetailTabsProps) {
    const [selectedTab, setSelectedTab] = useState('');

    if (channelTypes.length === 0) {
        return <p className="text-sm text-ink3">운영 중인 채널을 먼저 선택해주세요.</p>;
    }

    // 활성 탭은 state가 아니라 파생값이다. state로 두면 채널을 해제·추가한 그 렌더에서
    // selectedTab이 아직 옛 값(또는 '')이라 CHANNEL_METRIC_LABELS[탭]이 undefined가 되어 터진다.
    // (useEffect 동기화는 렌더 이후라 한 발 늦는다.)
    const activeTab = channelTypes.includes(selectedTab) ? selectedTab : channelTypes[0];

    const detail = channels[activeTab] || EMPTY_DETAIL;
    const labels = CHANNEL_METRIC_LABELS[activeTab];
    const fieldMap = CHANNEL_FIELD_MAP[activeTab];

    function patchDetail(patch: Partial<ChannelDetail>) {
        onChange({ ...channels, [activeTab]: { ...detail, ...patch } });
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex gap-1 border-b border-line">
                {channelTypes.map((channel) => (
                    <button
                        key={channel}
                        type="button"
                        onClick={() => setSelectedTab(channel)}
                        className={`px-4 h-10 text-sm transition-colors border-b-2 -mb-px ${
                            activeTab === channel
                                ? 'border-brand text-ink font-bold'
                                : 'border-transparent text-ink3 hover:text-ink2'
                        }`}
                    >
                        {channel}
                    </button>
                ))}
            </div>

            <div>
                <label className="block text-sm font-medium text-ink mb-2">
                    채널 주소 <span className="text-red-500">*</span>
                </label>
                <input
                    type="url"
                    value={detail.url}
                    onChange={(event) => patchDetail({ url: event.target.value })}
                    placeholder="https://..."
                    className="w-full h-12 px-4 bg-card border border-line rounded-lg text-ink text-sm focus:border-brand focus:outline-none transition-colors placeholder:text-ink3"
                />
            </div>

            <div className="bg-subtle rounded-lg p-4 flex flex-col gap-4">
                <p className="text-xs text-ink2 leading-relaxed">
                    규모를 적어두시면 캠지기가 판단하기 쉬워 <strong className="text-brand-strong">제안을 더 많이 받습니다.</strong><br />
                    나중에 언제든 수정하실 수 있어요. 캠핏이 확인한 뒤 공개되며, 사실과 다르면 협찬이 무효가 될 수 있어요.
                </p>

                <div>
                    <label className="block text-sm font-medium text-ink mb-2">{labels.follower}</label>
                    <input
                        type="number"
                        min={0}
                        value={detail.follower || ''}
                        onChange={(event) => patchDetail({ follower: Number(event.target.value) || 0 })}
                        placeholder="숫자만 입력"
                        className="w-full h-12 px-4 bg-card border border-line rounded-lg text-ink text-sm focus:border-brand focus:outline-none transition-colors placeholder:text-ink3"
                    />
                </div>

                {fieldMap.blogIndex ? (
                    <div>
                        <label className="block text-sm font-medium text-ink mb-2">{labels.secondary}</label>
                        <select
                            value={detail.blogIndex}
                            onChange={(event) => patchDetail({ blogIndex: event.target.value })}
                            className="w-full h-12 px-4 bg-card border border-line rounded-lg text-ink text-sm focus:border-brand focus:outline-none transition-colors"
                        >
                            <option value="">선택 안 함</option>
                            {BLOG_INDEX_LEVELS.map((level) => (
                                <option key={level} value={level}>{level}</option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <div>
                        <label className="block text-sm font-medium text-ink mb-2">{labels.secondary}</label>
                        <input
                            type="number"
                            min={0}
                            value={detail.engagement || ''}
                            onChange={(event) => patchDetail({ engagement: Number(event.target.value) || 0 })}
                            placeholder="숫자만 입력"
                            className="w-full h-12 px-4 bg-card border border-line rounded-lg text-ink text-sm focus:border-brand focus:outline-none transition-colors placeholder:text-ink3"
                        />
                    </div>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-ink mb-2">내 채널 강점</label>
                <textarea
                    value={detail.strength}
                    onChange={(event) => patchDetail({ strength: event.target.value })}
                    rows={3}
                    placeholder="예: 가족 캠핑 위주로 올려요. 댓글 반응이 좋고 재방문 문의가 많아요."
                    className="w-full px-4 py-3 bg-card border border-line rounded-lg text-ink text-sm focus:border-brand focus:outline-none transition-colors placeholder:text-ink3 resize-none"
                />
            </div>
        </div>
    );
}
