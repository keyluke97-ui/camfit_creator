'use client';

import { useState } from 'react';
import type { Campaign } from '@/types';
import ApplicationModal from './ApplicationModal';

interface CampaignCardProps {
    campaign: Campaign;
}

export default function CampaignCard({ campaign }: CampaignCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

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

            {/* 모집 인원 */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#333333]">
                <span className="text-sm text-[#B0B0B0]">신청 가능</span>
                <span className="text-base font-semibold text-white">
                    {campaign.tierData.availableCount} / {campaign.tierData.totalCount}명
                </span>
            </div>

            {/* 버튼 그룹 */}
            <div className="flex gap-3">
                {/* 상세보기 버튼 */}
                <a
                    href={campaign.detailUrl}
                    rel="noreferrer"
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
            <ApplicationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                campaign={campaign}
            />
        </div>
    );
}
