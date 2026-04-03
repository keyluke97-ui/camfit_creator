// DashboardTabs.tsx - 프리미엄/파트너 탭 전환 컴포넌트
'use client';

import type { ChannelType } from '@/types';
// CHANGED: 공통 상수/함수를 constants.ts에서 import (중복 제거)
import { hasPartnerEligibleChannel } from '@/lib/constants';

type TabType = 'premium' | 'partner';

// CHANGED: premiumId 추가 — 프리미엄 미등록 시 탭에 시각적 힌트 표시
interface DashboardTabsProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
    channelTypes: ChannelType[];
    premiumId: string | null;
}

export default function DashboardTabs({
    activeTab,
    onTabChange,
    channelTypes,
    premiumId
}: DashboardTabsProps) {
    const showPartnerTab = hasPartnerEligibleChannel(channelTypes);

    // 블로거 전용이면 탭 UI 자체를 렌더링하지 않음
    if (!showPartnerTab) return null;

    // CHANGED: premiumId 없으면 프리미엄 탭에 "미등록" 뱃지 표시
    const showPremiumBadge = !premiumId;

    return (
        <div className="flex gap-1 bg-[#1A1A1A] rounded-lg p-1 mb-6">
            <button
                onClick={() => onTabChange('premium')}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-md transition-colors ${
                    activeTab === 'premium'
                        ? 'bg-[#01DF82] text-black'
                        : 'text-[#888888] hover:text-white'
                }`}
            >
                <span className="flex items-center justify-center gap-1">
                    프리미엄 협찬
                    {showPremiumBadge && (
                        <span className={`text-[10px] font-normal px-1.5 py-0.5 rounded-full ${
                            activeTab === 'premium'
                                ? 'bg-black/15 text-black/70'
                                : 'bg-[#333333] text-[#888888]'
                        }`}>
                            미등록
                        </span>
                    )}
                </span>
            </button>
            <button
                onClick={() => onTabChange('partner')}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-md transition-colors ${
                    activeTab === 'partner'
                        ? 'bg-[#01DF82] text-black'
                        : 'text-[#888888] hover:text-white'
                }`}
            >
                캠핏 파트너
            </button>
        </div>
    );
}
