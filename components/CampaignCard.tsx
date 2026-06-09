'use client';

import { useState } from 'react';
import type { Campaign, ChannelType } from '@/types';
import { COUPON_APPLY_DAYS_CONFIG, formatDiscount } from '@/lib/constants';
import ApplicationModal from './ApplicationModal';
import HighlightsModal from './HighlightsModal';
// CHANGED: 모집현황 텍스트 → 프로그레스 바로 교체
import RecruitmentProgressBar from './RecruitmentProgressBar';

interface CampaignCardProps {
    campaign: Campaign;
    channelTypes?: ChannelType[]; // CHANGED: 콘텐츠 제작 요구사항 표시용
}

export default function CampaignCard({ campaign, channelTypes }: CampaignCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHighlightsOpen, setIsHighlightsOpen] = useState(false);

    if (campaign.isClosed) {
        // 마감 상태
        return (
            <div className="relative bg-[#1E1E1E] border border-[#333333] rounded-lg overflow-hidden">
                {/* 블러 처리된 콘텐츠 */}
                <div className="blur-sm grayscale opacity-40 p-5">
                    <h3 className="text-lg font-bold text-white mb-2">
                        {campaign.accommodationName}
                    </h3>
                    <p className="text-sm text-[#B0B0B0]">{campaign.location}</p>
                    <p className="text-sm text-[#B0B0B0] mt-2">
                        제작 기한: {campaign.deadline}
                    </p>
                </div>

                {/* 마감 뱃지 */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black/80 backdrop-blur-sm px-8 py-4 rounded-full border-2 border-white/20">
                        <span className="text-white text-xl font-bold">마감</span>
                    </div>
                </div>
            </div>
        );
    }

    // 활성 상태
    return (
        <div className="bg-[#1E1E1E] border border-[#333333] rounded-lg p-5 hover:border-[#01DF82] transition-colors">
            {/* CHANGED: 통합 — 쿠폰 이벤트 캠페인이면 "팔로워 쿠폰 협찬" 뱃지 */}
            {campaign.couponEvent && (
                <div className="mb-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-[#01DF82]/15 text-[#01DF82] border border-[#01DF82]/30 rounded-full">
                        🎟️ 팔로워 쿠폰 협찬
                    </span>
                </div>
            )}

            {/* 숙소 이름 */}
            <h3 className="text-xl font-bold text-white mb-3 leading-tight">
                {campaign.accommodationName}
            </h3>

            {/* 위치 */}
            <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">📍</span>
                <span className="text-base text-[#B0B0B0]">{campaign.location}</span>
            </div>

            {/* CHANGED: 제공 가능한 사이트 종류 태그 추가 */}
            {campaign.siteTypes && campaign.siteTypes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {campaign.siteTypes.map((siteType) => (
                        <span
                            key={siteType}
                            className="px-2.5 py-1 text-xs font-medium bg-[#01DF82]/15 text-[#01DF82] border border-[#01DF82]/30 rounded-full"
                        >
                            {siteType}
                        </span>
                    ))}
                </div>
            )}

            {/* CHANGED: 숙소 특장점 1줄 미리보기 추가 */}
            {campaign.highlights && (
                <button
                    onClick={() => setIsHighlightsOpen(true)}
                    className="w-full text-left mb-3 px-3 py-2.5 bg-[#252525] border border-[#3A3A3A] rounded-lg hover:border-[#01DF82]/50 transition-colors group"
                >
                    <p className="text-xs text-[#9CA3AF] mb-0.5">숙소 특장점</p>
                    <p className="text-sm text-[#D0D0D0] truncate group-hover:text-white transition-colors">
                        {campaign.highlights}
                    </p>
                    <p className="text-xs text-[#01DF82] mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        자세히 보기 →
                    </p>
                </button>
            )}

            {/* 제작 기한 */}
            <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📅</span>
                <span className="text-base text-[#B0B0B0]">
                    제작 기한: {campaign.deadline}
                </span>
            </div>

            {/* 협찬 금액 (강조) */}
            <div className="bg-[#01DF82]/10 border border-[#01DF82] rounded-lg p-4 mb-4">
                <p className="text-sm text-[#B0B0B0] mb-1">협찬 제안 금액</p>
                <p className="text-3xl font-bold text-[#01DF82]">
                    {campaign.tierData.price.toLocaleString()}원
                </p>
            </div>

            {/* CHANGED: 통합 — 쿠폰 이벤트 핵심 3개만 (할인/적용 요일/내가 배포할 쿠폰). 날짜는 신청창에서. */}
            {campaign.couponEvent && (() => {
                const couponEvent = campaign.couponEvent;
                const dayConfig = COUPON_APPLY_DAYS_CONFIG[couponEvent.couponApplyDays] || COUPON_APPLY_DAYS_CONFIG['평일전용'];
                return (
                    <div className="bg-[#252525] border border-[#3A3A3A] rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-1.5 mb-3">
                            <span className="text-base">🎟️</span>
                            <span className="text-sm font-bold text-white">팔로워 쿠폰 이벤트</span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-[#9CA3AF]">팔로워 할인</span>
                                <span className="text-sm font-bold text-[#01DF82]">{formatDiscount(couponEvent.discount)} 할인</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-[#9CA3AF]">적용 요일</span>
                                <span className={`px-2.5 py-0.5 text-xs font-medium border rounded-full ${dayConfig.color}`}>
                                    {dayConfig.label}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-[#9CA3AF]">내가 배포할 쿠폰</span>
                                <span className="text-sm font-semibold text-white">{couponEvent.couponPerCreator}장</span>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* CHANGED: 모집현황 텍스트 → 프로그레스 바로 교체 */}
            <div className="mb-4 pb-4 border-b border-[#333333]">
                <RecruitmentProgressBar
                    totalCount={campaign.tierData.totalCount}
                    availableCount={campaign.tierData.availableCount}
                />
            </div>

            {/* 버튼 그룹 */}
            <div className="flex gap-3">
                {/* 상세보기 버튼 */}
                <a
                    href={campaign.detailUrl}
                    target="_blank" // CHANGED: 외부 링크가 새 탭에서 열리도록 추가
                    rel="noopener noreferrer" // CHANGED: noreferrer → noopener noreferrer 보안 강화
                    className="flex-1 h-12 flex items-center justify-center bg-[#2A2A2A] text-white font-medium rounded-lg hover:bg-[#333333] transition-colors text-center"
                >
                    상세보기
                </a>

                {/* 신청하기 버튼 (In-App Modal) */}
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex-1 h-12 flex items-center justify-center bg-[#01DF82] text-black font-bold rounded-lg hover:bg-[#00C972] transition-colors text-center"
                >
                    신청하기
                </button>
            </div>

            {/* 신청 모달 */}
            {/* CHANGED: channelTypes 전달 — 콘텐츠 제작 필수사항 표시용 */}
            <ApplicationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                campaign={campaign}
                channelTypes={channelTypes}
            />

            {/* CHANGED: 숙소 특장점 상세 모달 추가 */}
            {campaign.highlights && (
                <HighlightsModal
                    isOpen={isHighlightsOpen}
                    onClose={() => setIsHighlightsOpen(false)}
                    accommodationName={campaign.accommodationName}
                    highlights={campaign.highlights}
                />
            )}
        </div>
    );
}
