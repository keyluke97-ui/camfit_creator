// page.tsx - 대시보드 메인 페이지 (프리미엄 + 파트너 탭 통합)
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CampaignCard from '@/components/CampaignCard';
import CheckinModal from '@/components/CheckinModal';
import DashboardTabs from '@/components/DashboardTabs';
import PartnerCampaignCard from '@/components/PartnerCampaignCard';
import PartnerCheckinModal from '@/components/PartnerCheckinModal';
import type { Campaign, PartnerCampaign, TierLevel, ChannelType } from '@/types';
// CHANGED: 공통 상수/함수를 constants.ts에서 import (중복 제거)
import { hasPartnerEligibleChannel, KAKAO_CHANNEL_URL } from '@/lib/constants';

type TabType = 'premium' | 'partner';

// CHANGED: premiumId 추가 — 프리미엄 탭 활성/비활성 분기용
interface UserInfo {
    creatorId: string;
    channelName: string;
    tier: TierLevel;
    channelTypes: ChannelType[];
    premiumId: string | null;
}

// CHANGED: Suspense boundary 필수 — useSearchParams() 사용 시 Next.js 16 요구사항
export default function DashboardPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#111111] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-[#01DF82] border-t-transparent rounded-full animate-spin"></div>
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}

function DashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // CHANGED: URL 쿼리로 탭 상태 관리
    const tabFromUrl = searchParams.get('tab') as TabType | null;
    const [activeTab, setActiveTab] = useState<TabType>(tabFromUrl === 'partner' ? 'partner' : 'premium');

    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [partnerCampaigns, setPartnerCampaigns] = useState<PartnerCampaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    // CHANGED: userRecordId 상태 제거 — API에서 JWT로 사용자 식별
    const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
    const [isPartnerCheckinModalOpen, setIsPartnerCheckinModalOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showClosedCampaigns, setShowClosedCampaigns] = useState(false);

    // 함수 정의를 useEffect 위에 배치 (lint: 선언 전 접근 방지)
    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        // CHANGED: 탭 전환 시 마감 캠페인 접힘 상태 리셋 — 탭 간 상태 혼동 방지
        setShowClosedCampaigns(false);
        const url = tab === 'partner' ? '/dashboard?tab=partner' : '/dashboard';
        window.history.replaceState(null, '', url);
    };

    const fetchCampaigns = async () => {
        try {
            const response = await fetch('/api/campaigns');
            const data = await response.json();
            if (response.ok) {
                setCampaigns(data.campaigns);
                setErrorMessage('');
            } else {
                setErrorMessage('캠페인 목록을 불러오는 데 실패했습니다.');
            }
        } catch (error) {
            console.error(error);
            setErrorMessage('네트워크 오류가 발생했습니다. 페이지를 새로고침해주세요.');
        }
    };

    const fetchPartnerCampaigns = async () => {
        try {
            const response = await fetch('/api/partner/campaigns');
            const data = await response.json();
            if (response.ok) {
                setPartnerCampaigns(data.campaigns);
                setErrorMessage('');
            } else {
                setErrorMessage('파트너 캠페인 목록을 불러오는 데 실패했습니다.');
            }
        } catch (error) {
            console.error(error);
            setErrorMessage('네트워크 오류가 발생했습니다. 페이지를 새로고침해주세요.');
        }
    };

    const fetchUserInfo = async () => {
        try {
            const response = await fetch('/api/auth/me');
            const data = await response.json();
            if (response.ok) {
                setUserInfo(data.user);
            }
        } catch (error) {
            console.error(error);
        } finally {
            // CHANGED: 로딩 완료를 fetchUserInfo 내부에서 처리 (set-state-in-effect 방지)
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserInfo();
    }, []);

    // CHANGED: 공통 함수로 파트너 접근 가능 여부 계산 (중복 제거)
    const canAccessPartner = userInfo
        ? hasPartnerEligibleChannel(userInfo.channelTypes)
        : false;

    // CHANGED: 블로거가 partner 탭에 접근 시 premium으로 폴백 (setState 대신 computed)
    const effectiveTab: TabType = (activeTab === 'partner' && !canAccessPartner) ? 'premium' : activeTab;

    // CHANGED: effectiveTab 기반 데이터 패칭 — premiumId 없으면 프리미엄 캠페인 스킵
    useEffect(() => {
        if (!userInfo) return;

        if (effectiveTab === 'premium') {
            if (userInfo.premiumId) {
                fetchCampaigns();
            }
        } else {
            fetchPartnerCampaigns();
        }
    }, [userInfo, effectiveTab]);

    // 탭 복귀 시 자동 갱신
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // CHANGED: premiumId 없으면 프리미엄 캠페인 재패칭 스킵
                if (effectiveTab === 'premium') {
                    if (userInfo?.premiumId) {
                        fetchCampaigns();
                    }
                } else {
                    fetchPartnerCampaigns();
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [effectiveTab]);

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
            {/* Header */}
            <header className="sticky top-0 z-10 bg-[#111111]/95 backdrop-blur-sm border-b border-[#333333]">
                <div className="max-w-7xl mx-auto px-5 py-4">
                    {/* Top Row */}
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

                    {/* CHANGED: 입실 일정 등록 버튼 — 프리미엄 탭에서 premiumId 없으면 숨김 */}
                    {!(effectiveTab === 'premium' && !userInfo?.premiumId) && (
                        <button
                            onClick={() => {
                                if (effectiveTab === 'partner') {
                                    setIsPartnerCheckinModalOpen(true);
                                } else {
                                    setIsCheckinModalOpen(true);
                                }
                            }}
                            className="w-full h-12 bg-[#01DF82] text-black font-bold text-base rounded-xl hover:bg-[#00C972] transition-colors shadow-lg shadow-[#01DF82]/10 flex items-center justify-center gap-2"
                        >
                            <span>📅&nbsp; 입실 일정 등록하기</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-5 py-6">
                {/* CHANGED: 탭 컴포넌트 삽입 */}
                {/* CHANGED: premiumId prop 추가 — 미등록 시 탭에 시각적 힌트 */}
                {userInfo && (
                    <DashboardTabs
                        activeTab={effectiveTab}
                        onTabChange={handleTabChange}
                        channelTypes={userInfo.channelTypes || []}
                        premiumId={userInfo.premiumId}
                    />
                )}

                {/* 에러 메시지 */}
                {errorMessage && (
                    <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                        <p className="text-red-400 text-sm text-center font-medium">{errorMessage}</p>
                    </div>
                )}

                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-10 h-10 border-4 border-[#01DF82] border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm text-[#666666]">데이터를 불러오고 있습니다...</p>
                    </div>
                )}

                {/* ──── 프리미엄 탭 콘텐츠 ──── */}
                {/* CHANGED: 프리미엄 미등록 CTA — 카카오톡 문의 → /premium-register 등록 폼 링크로 변경 */}
                {!loading && effectiveTab === 'premium' && !userInfo?.premiumId && (
                    <div className="flex flex-col items-center justify-center py-16 gap-6">
                        <div className="w-16 h-16 bg-[#01DF82]/10 rounded-full flex items-center justify-center">
                            <span className="text-3xl">🌟</span>
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-bold text-white mb-2">프리미엄 협찬 미등록</h3>
                            <p className="text-sm text-[#888888] leading-relaxed">
                                프리미엄 협찬에 참여하려면<br />
                                크리에이터 등록이 필요합니다.
                            </p>
                        </div>
                        <button
                            onClick={() => router.push('/premium-register')}
                            className="px-6 py-3 bg-[#01DF82] text-black font-bold text-sm rounded-xl hover:bg-[#00C972] transition-colors flex items-center gap-2"
                        >
                            <span>📝</span>
                            <span>프리미엄 협찬 등록하기</span>
                        </button>
                        <a
                            href={KAKAO_CHANNEL_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#666666] hover:text-[#888888] transition-colors underline"
                        >
                            문의사항은 카카오톡 채널로
                        </a>
                    </div>
                )}

                {!loading && effectiveTab === 'premium' && userInfo?.premiumId && (
                    <>
                        {/* Stats Bar */}
                        {campaigns.length > 0 && (
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

                        {campaigns.length > 0 && (() => {
                            const activeCampaigns = campaigns.filter(c => !c.isClosed);
                            const closedCampaigns = campaigns.filter(c => c.isClosed);

                            return (
                                <>
                                    {activeCampaigns.length > 0 && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {activeCampaigns.map((campaign) => (
                                                <CampaignCard key={campaign.id} campaign={campaign} />
                                            ))}
                                        </div>
                                    )}

                                    {closedCampaigns.length > 0 && (
                                        <div className={activeCampaigns.length > 0 ? 'mt-8' : ''}>
                                            <button
                                                onClick={() => setShowClosedCampaigns(previous => !previous)}
                                                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#1E1E1E] border border-[#333333] rounded-xl text-[#888888] hover:text-white hover:border-[#555555] transition-colors"
                                            >
                                                <span className="text-sm font-medium">
                                                    마감 캠페인 {closedCampaigns.length}개 {showClosedCampaigns ? '접기' : '보기'}
                                                </span>
                                                <svg
                                                    className={`w-4 h-4 transition-transform duration-200 ${showClosedCampaigns ? 'rotate-180' : ''}`}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>

                                            {showClosedCampaigns && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                                                    {closedCampaigns.map((campaign) => (
                                                        <CampaignCard key={campaign.id} campaign={campaign} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </>
                )}

                {/* ──── 파트너 탭 콘텐츠 ──── */}
                {!loading && effectiveTab === 'partner' && (
                    <>
                        {/* Stats Bar */}
                        {partnerCampaigns.length > 0 && (
                            <div className="flex gap-3 mb-8 overflow-x-auto pb-1 scrollbar-hide">
                                <div className="flex-1 min-w-[140px] bg-[#1E1E1E] border border-[#333333] rounded-xl p-4 flex flex-col justify-center">
                                    <span className="text-xs text-[#888888] mb-1">전체 캠페인</span>
                                    <span className="text-xl font-bold text-white">{partnerCampaigns.length}개</span>
                                </div>
                                <div className="flex-1 min-w-[140px] bg-[#1E1E1E] border border-[#333333] rounded-xl p-4 flex flex-col justify-center">
                                    <span className="text-xs text-[#888888] mb-1">신청 가능</span>
                                    <span className="text-xl font-bold text-[#01DF82]">
                                        {partnerCampaigns.filter(c => !c.isClosed).length}개
                                    </span>
                                </div>
                            </div>
                        )}

                        {partnerCampaigns.length === 0 && (
                            <div className="text-center py-20">
                                <p className="text-[#666666] text-sm">현재 진행 중인 파트너 협찬이 없습니다.</p>
                            </div>
                        )}

                        {partnerCampaigns.length > 0 && (() => {
                            const activeCampaigns = partnerCampaigns.filter(c => !c.isClosed);
                            const closedCampaigns = partnerCampaigns.filter(c => c.isClosed);

                            return (
                                <>
                                    {activeCampaigns.length > 0 && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {activeCampaigns.map((campaign) => (
                                                <PartnerCampaignCard
                                                    key={campaign.id}
                                                    campaign={campaign}
                                                    onApplySuccess={fetchPartnerCampaigns}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {closedCampaigns.length > 0 && (
                                        <div className={activeCampaigns.length > 0 ? 'mt-8' : ''}>
                                            <button
                                                onClick={() => setShowClosedCampaigns(previous => !previous)}
                                                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#1E1E1E] border border-[#333333] rounded-xl text-[#888888] hover:text-white hover:border-[#555555] transition-colors"
                                            >
                                                <span className="text-sm font-medium">
                                                    마감 캠페인 {closedCampaigns.length}개 {showClosedCampaigns ? '접기' : '보기'}
                                                </span>
                                                <svg
                                                    className={`w-4 h-4 transition-transform duration-200 ${showClosedCampaigns ? 'rotate-180' : ''}`}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>

                                            {showClosedCampaigns && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                                                    {closedCampaigns.map((campaign) => (
                                                        <PartnerCampaignCard
                                                            key={campaign.id}
                                                            campaign={campaign}
                                                            onApplySuccess={fetchPartnerCampaigns}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </>
                )}
            </main>

            <CheckinModal
                isOpen={isCheckinModalOpen}
                onClose={() => setIsCheckinModalOpen(false)}
            />
            <PartnerCheckinModal
                isOpen={isPartnerCheckinModalOpen}
                onClose={() => setIsPartnerCheckinModalOpen(false)}
            />
        </div>
    );
}
