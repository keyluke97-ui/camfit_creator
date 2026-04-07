// PartnerCampaignCard.tsx - 파트너 캠페인 카드 컴포넌트
'use client';

import { useState } from 'react';
import type { PartnerCampaign } from '@/types';
import PartnerApplicationModal from './PartnerApplicationModal';
import HighlightsModal from './HighlightsModal'; // CHANGED: 숙소 소개 상세 모달 재사용 (A1-3)

interface PartnerCampaignCardProps {
    campaign: PartnerCampaign;
    onApplySuccess: () => void;
}

const STAY_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
    '평일전용': { label: '평일전용', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
    '평일+주말(금토)': { label: '평일+주말', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
    '평일+주말+공휴일': { label: '전일', color: 'bg-teal-500/15 text-teal-400 border-teal-500/30' },
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

export default function PartnerCampaignCard({
    campaign,
    onApplySuccess
}: PartnerCampaignCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHighlightsOpen, setIsHighlightsOpen] = useState(false); // CHANGED: 숙소 소개 모달 (A1-3)

    const stayConfig = STAY_TYPE_CONFIG[campaign.stayType] || STAY_TYPE_CONFIG['평일전용'];

    if (campaign.isClosed) {
        return (
            <div className="relative bg-[#1E1E1E] border border-[#333333] rounded-lg overflow-hidden">
                <div className="blur-sm grayscale opacity-40 p-5">
                    <h3 className="text-lg font-bold text-white mb-2">
                        {campaign.accommodationName}
                    </h3>
                    <p className="text-sm text-[#B0B0B0]">{campaign.packageType}</p>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black/80 backdrop-blur-sm px-8 py-4 rounded-full border-2 border-white/20">
                        <span className="text-white text-xl font-bold">마감</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#1E1E1E] border border-[#333333] rounded-lg p-5 hover:border-[#01DF82] transition-colors">
            {/* CHANGED: 소재 권역 위치 태그 (A1-1) */}
            {campaign.location && (
                <div className="mb-2">
                    <span className="text-xs text-[#9CA3AF]">
                        📍 {campaign.location}
                    </span>
                </div>
            )}

            {/* 캠핑장명 */}
            <h3 className="text-xl font-bold text-white mb-3 leading-tight">
                {campaign.accommodationName}
            </h3>

            {/* 숙박 타입 뱃지 */}
            <div className="flex flex-wrap gap-1.5 mb-3">
                <span className={`px-2.5 py-1 text-xs font-medium border rounded-full ${stayConfig.color}`}>
                    {stayConfig.label}
                </span>
                {campaign.holidayCouponApplied && (
                    <span className="px-2.5 py-1 text-xs font-medium bg-orange-500/15 text-orange-400 border border-orange-500/30 rounded-full">
                        공휴일 적용
                    </span>
                )}
            </div>

            {/* 할인 금액 */}
            <div className="bg-[#01DF82]/10 border border-[#01DF82] rounded-lg p-4 mb-4">
                <p className="text-sm text-[#B0B0B0] mb-2">할인 금액</p>
                <div className="flex items-center gap-4">
                    <div>
                        <p className="text-xs text-[#9CA3AF]">평일</p>
                        <p className="text-2xl font-bold text-[#01DF82]">
                            {formatDiscount(campaign.weekdayDiscount)}
                        </p>
                    </div>
                    {campaign.weekendDiscount > 0 && (
                        <>
                            <div className="w-px h-10 bg-[#333333]" />
                            <div>
                                <p className="text-xs text-[#9CA3AF]">주말</p>
                                <p className="text-2xl font-bold text-[#01DF82]">
                                    {formatDiscount(campaign.weekendDiscount)}
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* 방문 기간 + 쿠폰 유효기간 */}
            <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-lg">📅</span>
                    <span className="text-sm text-[#B0B0B0]">
                        방문: {campaign.visitStartDate} ~ {campaign.visitEndDate}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-lg">🎫</span>
                    <span className="text-sm text-[#B0B0B0]">
                        쿠폰: {campaign.couponStartDate} ~ {campaign.couponEndDate}
                    </span>
                </div>
            </div>

            {/* 팔로워 쿠폰 수량 + 모집 현황 */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#333333]">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-[#B0B0B0]">팔로워 쿠폰</span>
                    <span className="text-sm font-semibold text-white">
                        {campaign.followerCouponCount}장
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-[#B0B0B0]">잔여</span>
                    <span className="text-sm font-semibold text-white">
                        {campaign.availableCount}명
                    </span>
                </div>
            </div>

            {/* CHANGED: 숙소 소개 미리보기 + 자세히 보기 (A1-2) */}
            {campaign.accommodationDescription && (
                <div className="mb-4">
                    <p className="text-sm text-[#B0B0B0] truncate">
                        {campaign.accommodationDescription}
                    </p>
                    <button
                        onClick={() => setIsHighlightsOpen(true)}
                        className="text-xs text-[#01DF82] mt-1 hover:underline"
                    >
                        자세히 보기 →
                    </button>
                </div>
            )}

            {/* 신청하기 버튼 */}
            <button
                onClick={() => setIsModalOpen(true)}
                className="w-full h-12 flex items-center justify-center bg-[#01DF82] text-black font-bold rounded-lg hover:bg-[#00C972] transition-colors"
            >
                신청하기
            </button>

            {/* 신청 모달 */}
            {/* CHANGED: userRecordId 제거 — API에서 JWT로 사용자 식별 */}
            <PartnerApplicationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                campaign={campaign}
                onApplySuccess={onApplySuccess}
            />

            {/* CHANGED: 숙소 소개 상세 모달 — HighlightsModal 재사용 (A1-3) */}
            <HighlightsModal
                isOpen={isHighlightsOpen}
                onClose={() => setIsHighlightsOpen(false)}
                accommodationName={campaign.accommodationName}
                highlights={campaign.accommodationDescription}
            />
        </div>
    );
}
