// PartnerCampaignCard.tsx - 파트너 캠페인 카드 컴포넌트 (v3)
'use client';

import { useState } from 'react';
import type { PartnerCampaign, TierLevel } from '@/types';
import PartnerApplicationModal from './PartnerApplicationModal';
import HighlightsModal from './HighlightsModal';
import RecruitmentProgressBar from './RecruitmentProgressBar';

interface PartnerCampaignCardProps {
    campaign: PartnerCampaign;
    myTier: TierLevel;
    onApplySuccess: () => void;
}

const COUPON_APPLY_DAYS_CONFIG: Record<string, { label: string; color: string }> = {
    '평일전용': { label: '평일전용', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
    '평일+주말(금토)': { label: '평일+주말', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
    '평일+주말+공휴일': { label: '전체 기간', color: 'bg-teal-500/15 text-teal-400 border-teal-500/30' },
};

/**
 * 금액 포맷팅 (10000 → 1만원)
 */
function formatDiscount(amount: number): string {
    if (amount >= 10000 && amount % 10000 === 0) {
        return `${amount / 10000}만원`;
    }
    return `${amount.toLocaleString()}원`;
}

function tierViewCounts(campaign: PartnerCampaign, tier: TierLevel): { available: number; total: number; label: string } {
    switch (tier) {
        case '3': return { available: campaign.iconAvailable, total: campaign.iconRecruitCount, label: '⭐️ 아이콘' };
        case '2': return { available: campaign.partnerAvailable, total: campaign.partnerRecruitCount, label: '✔️ 파트너' };
        case '1': return { available: campaign.risingAvailable, total: campaign.risingRecruitCount, label: '🔥 라이징' };
    }
}

export default function PartnerCampaignCard({
    campaign,
    myTier,
    onApplySuccess,
}: PartnerCampaignCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHighlightsOpen, setIsHighlightsOpen] = useState(false);

    const dayConfig = COUPON_APPLY_DAYS_CONFIG[campaign.couponApplyDays] || COUPON_APPLY_DAYS_CONFIG['평일전용'];
    const tierView = tierViewCounts(campaign, myTier);

    if (campaign.isClosed || tierView.available < 1) {
        return (
            <div className="relative bg-[#1E1E1E] border border-[#333333] rounded-lg overflow-hidden">
                <div className="blur-sm grayscale opacity-40 p-5">
                    <h3 className="text-lg font-bold text-white mb-2">{campaign.accommodationName}</h3>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black/80 backdrop-blur-sm px-8 py-4 rounded-full border-2 border-white/20">
                        <span className="text-white text-xl font-bold">
                            {campaign.isClosed ? '마감' : `${tierView.label} 마감`}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#1E1E1E] border border-[#333333] rounded-lg p-5 hover:border-[#01DF82] transition-colors">
            {campaign.location && (
                <div className="mb-2">
                    <span className="text-xs text-[#9CA3AF]">📍 {campaign.location}</span>
                </div>
            )}

            <h3 className="text-xl font-bold text-white mb-3 leading-tight">{campaign.accommodationName}</h3>

            {/* v3: 할인 금액 단일 표시 */}
            <p className="text-base font-bold text-[#01DF82] mb-3">
                쿠폰 {formatDiscount(campaign.discount)} 할인
            </p>

            <div className="bg-[#01DF82]/10 border border-[#01DF82] rounded-lg p-4 mb-4">
                <p className="text-sm text-[#B0B0B0] mb-2">팔로워 할인 쿠폰</p>
                <p className="text-3xl font-bold text-[#01DF82] mb-3">
                    {formatDiscount(campaign.discount)}
                </p>
                <div className="border-t border-[#01DF82]/30 pt-2 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#9CA3AF]">적용 요일</span>
                        <span className={`px-2.5 py-1 text-xs font-medium border rounded-full ${dayConfig.color}`}>
                            {dayConfig.label}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#9CA3AF]">입실 가능</span>
                        <span className="text-xs text-[#D0D0D0]">
                            {campaign.couponStartDate} ~ {campaign.couponEndDate}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#9CA3AF]">1인당 쿠폰</span>
                        <span className="text-xs font-semibold text-white">{campaign.couponPerCreator}장</span>
                    </div>
                </div>
            </div>

            <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-lg">📅</span>
                    <span className="text-sm text-[#B0B0B0]">
                        크리에이터 방문 가능: {campaign.visitStartDate} ~ {campaign.visitEndDate}
                    </span>
                </div>
            </div>

            <div className="mb-4 pb-4 border-b border-[#333333]">
                <RecruitmentProgressBar
                    totalCount={tierView.total}
                    availableCount={tierView.available}
                    label={`${tierView.label} 모집`}
                />
            </div>

            {campaign.accommodationDescription && (
                <div className="mb-4">
                    <p className="text-sm text-[#B0B0B0] truncate">{campaign.accommodationDescription}</p>
                    <button onClick={() => setIsHighlightsOpen(true)} className="text-xs text-[#01DF82] mt-1 hover:underline">
                        자세히 보기 →
                    </button>
                </div>
            )}

            <div className="space-y-2">
                {campaign.camfitLink && (
                    <a
                        href={campaign.camfitLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full h-10 flex items-center justify-center bg-[#2A2A2A] text-white text-sm font-medium rounded-lg hover:bg-[#333333] transition-colors"
                    >
                        캠핑장 바로가기 →
                    </a>
                )}
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full h-12 flex items-center justify-center bg-[#01DF82] text-black font-bold rounded-lg hover:bg-[#00C972] transition-colors"
                >
                    신청하기
                </button>
            </div>

            <PartnerApplicationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                campaign={campaign}
                myTier={myTier}
                onApplySuccess={onApplySuccess}
            />
            <HighlightsModal
                isOpen={isHighlightsOpen}
                onClose={() => setIsHighlightsOpen(false)}
                accommodationName={campaign.accommodationName}
                highlights={campaign.accommodationDescription}
            />
        </div>
    );
}
