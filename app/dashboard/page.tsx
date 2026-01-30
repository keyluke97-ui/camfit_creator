'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CampaignCard from '@/components/CampaignCard';
import CheckinModal from '@/components/CheckinModal';
import type { Campaign, TierLevel } from '@/types';

interface UserInfo {
    channelName: string;
    tier: TierLevel;
}

export default function DashboardPage() {
    const router = useRouter();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);

    useEffect(() => {
        Promise.all([
            fetchCampaigns(),
            fetchUserInfo()
        ]).finally(() => setLoading(false));
    }, []);

    const fetchCampaigns = async () => {
        try {
            const response = await fetch('/api/campaigns');
            const data = await response.json();
            if (response.ok) setCampaigns(data.campaigns);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchUserInfo = async () => {
        try {
            const response = await fetch('/api/auth/me');
            const data = await response.json();
            if (response.ok) setUserInfo(data.user);
        } catch (err) {
            console.error(err);
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout');
        router.push('/login');
    };

    const getTierBadge = (tier: TierLevel) => {
        switch (tier) {
            case '3': return <span className="px-2 py-0.5 text-xs font-bold text-yellow-400 bg-yellow-400/10 rounded border border-yellow-400/20">아이콘 크리에이터</span>;
            case '2': return <span className="px-2 py-0.5 text-xs font-bold text-blue-400 bg-blue-400/10 rounded border border-blue-400/20">파트너 크리에이터</span>;
            case '1': return <span className="px-2 py-0.5 text-xs font-bold text-emerald-400 bg-emerald-400/10 rounded border border-emerald-400/20">라이징 크리에이터</span>;
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-[#111111] pb-20">
            {/* Header: Personalized & Optimized */}
            <header className="sticky top-0 z-10 bg-[#111111]/95 backdrop-blur-sm border-b border-[#333333]">
                <div className="max-w-7xl mx-auto px-5 py-4">
                    {/* Top Row: Identity & Logout */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-white truncate max-w-[200px]">
                                    {userInfo?.channelName || '로딩 중...'}
                                </h1>
                                {userInfo && getTierBadge(userInfo.tier)}
                            </div>
                            <p className="text-xs text-[#888888]">오늘도 즐거운 캠핑 되세요! ⛺️</p>
                        </div>

                        {/* Compact Logout Button */}
                        <button
                            onClick={handleLogout}
                            className="p-2 text-[#666666] hover:text-white transition-colors"
                            aria-label="로그아웃"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>

                    {/* Action Row: Primary Button */}
                    <button
                        onClick={() => setIsCheckinModalOpen(true)}
                        className="w-full h-12 bg-[#01DF82] text-black font-bold text-base rounded-xl hover:bg-[#00C972] transition-colors shadow-lg shadow-[#01DF82]/10 flex items-center justify-center gap-2"
                    >
                        <span>📅&nbsp; 입실 일정 등록하기</span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-5 py-6">
                {/* Slim Stats Bar */}
                {!loading && campaigns.length > 0 && (
                    <div className="flex gap-3 mb-8 overflow-x-auto pb-1 scrollbar-hide">
                        <div className="flex-1 min-w-[140px] bg-[#1E1E1E] border border-[#333333] rounded-xl p-4 flex flex-col justify-center">
                            <span className="text-xs text-[#888888] mb-1">전체 캠페인</span>
                            <span className="text-xl font-bold text-white">{campaigns.length}개</span>
                        </div>
                        <div className="flex-1 min-w-[140px] bg-[#1E1E1E] border border-[#333333] rounded-xl p-4 flex flex-col justify-center">
                            <span className="text-xs text-[#888888] mb-1">신청 가능</span>
                            <span className="text-xl font-bold text-[#01DF82]">
                                {campaigns.filter(c => !c.isClosed).length}개
                            </span>
                        </div>
                    </div>
                )}

                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-10 h-10 border-4 border-[#01DF82] border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm text-[#666666]">데이터를 불러오고 있습니다...</p>
                    </div>
                )}

                {!loading && campaigns.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {campaigns.map((campaign) => (
                            <CampaignCard key={campaign.id} campaign={campaign} />
                        ))}
                    </div>
                )}
            </main>

            <CheckinModal
                isOpen={isCheckinModalOpen}
                onClose={() => setIsCheckinModalOpen(false)}
            />
        </div>
    );
}
