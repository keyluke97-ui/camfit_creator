// PartnerCampaignCard.tsx - 파트너 캠페인 카드 컴포넌트
// CHANGED: 할인→팔로워쿠폰 명확화, 1인당 쿠폰수 계산, 캠핏링크, stayType 라벨 변경
'use client';

import { useState } from 'react';
import type { PartnerCampaign } from '@/types';
import PartnerApplicationModal from './PartnerApplicationModal';
import HighlightsModal from './HighlightsModal';
// CHANGED: 모집현황 텍스트 → 프로그레스 바로 교체
import RecruitmentProgressBar from './RecruitmentProgressBar';

interface PartnerCampaignCardProps {
    campaign: PartnerCampaign;
    onApplySuccess: () => void;
}

// CHANGED: '전일' → 원래 값 그대로 표시하도록 라벨 변경
const STAY_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
    '평일전용': { label: '평일전용', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
    '평일+주말(금토)': { label: '평일+주말(금토)', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
    '평일+주말+공휴일': { label: '평일+주말+공휴일', color: 'bg-teal-500/15 text-teal-400 border-teal-500/30' },
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
    const [isHighlightsOpen, setIsHighlightsOpen] = useState(false);

    const stayConfig = STAY_TYPE_CONFIG[campaign.stayType] || STAY_TYPE_CONFIG['평일전용'];

    // CHANGED: 1인당 팔로워 쿠폰 수 계산 (팔로워쿠폰수 / 총모집인원, 정수 절삭)
    const perPersonCoupon = campaign.totalRecruitCount > 0
        ? Math.floor(campaign.followerCouponCount / campaign.totalRecruitCount)
        : 0;

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
            {/* CHANGED: 경제 모델 배지 제거 — 탭이 이미 구분자 역할이라 카드마다 반복 노출은 중복 노이즈 */}

            {/* 소재 권역 위치 태그 */}
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

            {/* CHANGED: 핵심 혜택 1줄 요약 — 카드 상단에서 즉시 인지 */}
            <p className="text-base font-bold text-[#01DF82] mb-3">
                평일 {formatDiscount(campaign.weekdayDiscount)}
                {campaign.weekendDiscount > 0 && ` / 주말 ${formatDiscount(campaign.weekendDiscount)}`} 할인
            </p>

            {/* CHANGED: 팔로워 쿠폰 관련 정보를 하나의 박스로 통합 (입실기간, 적용요일, 쿠폰수 포함) */}
            <div className="bg-[#01DF82]/10 border border-[#01DF82] rounded-lg p-4 mb-4">
                <p className="text-sm text-[#B0B0B0] mb-2">팔로워 할인 쿠폰</p>
                <div className="flex items-center gap-4 mb-3">
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
                <div className="border-t border-[#01DF82]/30 pt-2 space-y-2">
                    {/* CHANGED: 공휴일 적용 뱃지 제거 — stayType에 이미 포함됨 */}
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#9CA3AF]">적용 요일</span>
                        <span className={`px-2.5 py-1 text-xs font-medium border rounded-full ${stayConfig.color}`}>
                            {stayConfig.label}
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
                        <span className="text-xs font-semibold text-white">{perPersonCoupon}장</span>
                    </div>
                </div>
            </div>

            {/* 크리에이터 방문 기간 + 잔여 인원 */}
            <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-lg">📅</span>
                    <span className="text-sm text-[#B0B0B0]">
                        크리에이터 방문 가능: {campaign.visitStartDate} ~ {campaign.visitEndDate}
                    </span>
                </div>
            </div>

            {/* CHANGED: 잔여 인원 텍스트 → 프로그레스 바로 교체 */}
            <div className="mb-4 pb-4 border-b border-[#333333]">
                <RecruitmentProgressBar
                    totalCount={campaign.totalRecruitCount}
                    availableCount={campaign.availableCount}
                />
            </div>

            {/* 숙소 소개 미리보기 + 자세히 보기 */}
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

            {/* CHANGED: 캠핑장 바로가기 + 신청하기 버튼 */}
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

            {/* 신청 모달 */}
            <PartnerApplicationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                campaign={campaign}
                onApplySuccess={onApplySuccess}
            />

            {/* 숙소 소개 상세 모달 */}
            <HighlightsModal
                isOpen={isHighlightsOpen}
                onClose={() => setIsHighlightsOpen(false)}
                accommodationName={campaign.accommodationName}
                highlights={campaign.accommodationDescription}
            />
        </div>
    );
}
