'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CampaignCard from '@/components/CampaignCard';
import type { Campaign } from '@/types';

export default function DashboardPage() {
    const router = useRouter();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const fetchCampaigns = async () => {
        try {
            const response = await fetch('/api/campaigns');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '캠페인을 불러오지 못했습니다.');
            }

            setCampaigns(data.campaigns);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout');
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-[#111111] pb-20">
            {/* 헤더 */}
            <header className="sticky top-0 z-10 bg-[#111111]/95 backdrop-blur-sm border-b border-[#333333]">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-white">캠핏 협찬</h1>
                            <p className="text-sm text-[#B0B0B0] mt-1">프리미엄 협찬 목록</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="h-10 px-5 bg-[#2A2A2A] text-white text-sm font-medium rounded-lg hover:bg-[#333333] transition-colors"
                        >
                            로그아웃
                        </button>
                    </div>
                </div>
            </header>

            {/* 메인 콘텐츠 */}
            <main className="max-w-7xl mx-auto px-4 py-6">
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <div className="w-12 h-12 border-4 border-[#01DF82] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-[#B0B0B0]">캠페인을 불러오는 중...</p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="p-5 bg-red-500/10 border border-red-500/50 rounded-lg">
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                {!loading && !error && campaigns.length === 0 && (
                    <div className="text-center py-20">
                        <p className="text-xl text-[#B0B0B0]">
                            현재 진행 중인 협찬이 없습니다.
                        </p>
                    </div>
                )}

                {!loading && !error && campaigns.length > 0 && (
                    <>
                        {/* 통계 */}
                        <div className="mb-6 p-5 bg-[#1E1E1E] border border-[#333333] rounded-lg">
                            <div className="flex items-center justify-between">
                                <span className="text-[#B0B0B0]">전체 캠페인</span>
                                <span className="text-2xl font-bold text-white">
                                    {campaigns.length}개
                                </span>
                            </div>
                            <div className="flex items-center justify-between mt-3">
                                <span className="text-[#B0B0B0]">신청 가능</span>
                                <span className="text-2xl font-bold text-[#01DF82]">
                                    {campaigns.filter(c => !c.isClosed).length}개
                                </span>
                            </div>
                        </div>

                        {/* 캠페인 그리드 - 모바일 퍼스트 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {campaigns.map((campaign) => (
                                <CampaignCard key={campaign.id} campaign={campaign} />
                            ))}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
