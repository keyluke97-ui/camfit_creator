// page.tsx - 대시보드 메인 페이지 (프리미엄 + 파트너 탭 통합)
'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CampaignCard from '@/components/CampaignCard';
import CheckinModal from '@/components/CheckinModal';
import DashboardTabs from '@/components/DashboardTabs';
import LocationFilter from '@/components/LocationFilter';
import NotificationToggle from '@/components/NotificationToggle';
import PartnerCampaignCard from '@/components/PartnerCampaignCard';
import PartnerCheckinModal from '@/components/PartnerCheckinModal';
// CHANGED: 콘텐츠 탭 컴포넌트 import
import ContentCard from '@/components/ContentCard';
import ContentCardCompact from '@/components/ContentCardCompact';
import ContentSubmitModal from '@/components/ContentSubmitModal';
import type { Campaign, PartnerCampaign, ContentUpload, TierLevel, ChannelType } from '@/types';
// CHANGED: 공통 상수/함수를 constants.ts에서 import (중복 제거)
import { hasPartnerEligibleChannel, KAKAO_CHANNEL_URL } from '@/lib/constants';

// CHANGED: 콘텐츠 탭 제거 — 캠페인 탭만 유지 (콘텐츠는 헤더에서 별도 진입)
type TabType = 'premium' | 'partner';

// CHANGED: 파트너 오픈 준비중 플래그 — 오픈 시 false로 변경하면 정상 노출
const PARTNER_COMING_SOON = true;

// CHANGED: premiumId 추가 — 프리미엄 탭 활성/비활성 분기용
// CHANGED: notificationEnabled 추가 — 알림 토글 상태
interface UserInfo {
    creatorId: string;
    channelName: string;
    tier: TierLevel;
    channelTypes: ChannelType[];
    premiumId: string | null;
    notificationEnabled: boolean;
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
    const tabFromUrl = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState<TabType>(
        tabFromUrl === 'partner' ? 'partner' : 'premium'
    );
    // CHANGED: 콘텐츠 뷰 별도 상태 — 헤더에서 진입하는 별도 화면
    const [showContentView, setShowContentView] = useState(tabFromUrl === 'content');

    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [partnerCampaigns, setPartnerCampaigns] = useState<PartnerCampaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    // CHANGED: userRecordId 상태 제거 — API에서 JWT로 사용자 식별
    const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
    const [isPartnerCheckinModalOpen, setIsPartnerCheckinModalOpen] = useState(false);
    // CHANGED: 콘텐츠 탭 state 추가
    const [contentUploads, setContentUploads] = useState<ContentUpload[]>([]);
    const [isContentSubmitModalOpen, setIsContentSubmitModalOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showClosedCampaigns, setShowClosedCampaigns] = useState(false);
    // CHANGED: 위치 필터 state 추가
    const [selectedLocation, setSelectedLocation] = useState<string>('전체');
    // CHANGED: 알림 토글 state 추가
    const [notificationEnabled, setNotificationEnabled] = useState(true);

    // 함수 정의를 useEffect 위에 배치 (lint: 선언 전 접근 방지)
    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        // CHANGED: 탭 전환 시 마감 캠페인 접힘 상태 리셋 — 탭 간 상태 혼동 방지
        setShowClosedCampaigns(false);
        // CHANGED: 탭 전환 시 위치 필터 리셋
        setSelectedLocation('전체');
        const url = tab === 'partner' ? '/dashboard?tab=partner' : '/dashboard';
        window.history.replaceState(null, '', url);
    };

    // CHANGED: 콘텐츠 뷰 전환 핸들러
    const handleOpenContentView = () => {
        setShowContentView(true);
        window.history.replaceState(null, '', '/dashboard?tab=content');
        fetchContentUploads();
    };

    const handleCloseContentView = () => {
        setShowContentView(false);
        const url = activeTab === 'partner' ? '/dashboard?tab=partner' : '/dashboard';
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

    // CHANGED: 콘텐츠 내역 조회 함수
    const fetchContentUploads = async () => {
        try {
            const response = await fetch('/api/content/my');
            const data = await response.json();
            if (response.ok) {
                setContentUploads(data.uploads || []);
            }
        } catch (error) {
            console.error(error);
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
                // CHANGED: 알림 토글 초기값 설정
                setNotificationEnabled(data.user.notificationEnabled !== false);
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

    // CHANGED: 위치 필터용 location 목록 추출 (콘텐츠 뷰에서는 사용하지 않음)
    const availableLocations = useMemo(() => {
        const source = effectiveTab === 'premium' ? campaigns : partnerCampaigns;
        const locations = [...new Set(source.map(c => c.location).filter(Boolean))];
        locations.sort((a, b) => a.localeCompare(b, 'ko'));
        return locations;
    }, [effectiveTab, campaigns, partnerCampaigns]);

    // CHANGED: 위치 필터 적용
    const filteredCampaigns = selectedLocation === '전체'
        ? campaigns
        : campaigns.filter(c => c.location === selectedLocation);
    const filteredPartnerCampaigns = selectedLocation === '전체'
        ? partnerCampaigns
        : partnerCampaigns.filter(c => c.location === selectedLocation);

    // CHANGED: 알림 토글 핸들러
    const handleNotificationToggle = async (enabled: boolean) => {
        setNotificationEnabled(enabled);
        try {
            const response = await fetch('/api/notifications/toggle', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled })
            });
            if (!response.ok) setNotificationEnabled(!enabled);
        } catch {
            setNotificationEnabled(!enabled);
        }
    };

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

    // CHANGED: 콘텐츠 뷰 진입 시 데이터 패칭
    useEffect(() => {
        if (showContentView && userInfo) {
            fetchContentUploads();
        }
    }, [showContentView, userInfo]);

    // 탭 복귀 시 자동 갱신
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                if (showContentView) {
                    fetchContentUploads();
                } else if (effectiveTab === 'premium') {
                    // CHANGED: premiumId 없으면 프리미엄 캠페인 재패칭 스킵
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
    }, [effectiveTab, showContentView]);

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
                    {/* CHANGED: 콘텐츠 뷰일 때 별도 헤더 */}
                    {showContentView ? (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleCloseContentView}
                                className="p-2 -ml-2 text-[#888888] hover:text-white transition-colors"
                                aria-label="캠페인 보기로 돌아가기"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <h1 className="text-lg font-bold text-white">내 콘텐츠</h1>
                        </div>
                    ) : (
                        <>
                            {/* Top Row */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex flex-col gap-1">
                                    {/* CHANGED: 크리에이터 등급 뱃지 일시 삭제 */}
                                    <h1 className="text-xl font-bold text-white truncate max-w-[200px]">
                                        {userInfo?.channelName || '로딩 중...'}
                                    </h1>
                                    <p className="text-xs text-[#888888]">오늘도 즐거운 캠핑 되세요! ⛺️</p>
                                </div>

                                {/* CHANGED: 아이콘 + 라벨 — 각 버튼 역할을 텍스트로 명시 */}
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={handleOpenContentView}
                                        className="flex flex-col items-center gap-0.5 px-2 py-1 text-[#888888] hover:text-[#01DF82] transition-colors"
                                        aria-label="내 콘텐츠"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                        </svg>
                                        <span className="text-[10px]">콘텐츠</span>
                                    </button>
                                    <NotificationToggle
                                        enabled={notificationEnabled}
                                        onToggle={handleNotificationToggle}
                                    />
                                    <button
                                        onClick={handleLogout}
                                        className="flex flex-col items-center gap-0.5 px-2 py-1 text-[#666666] hover:text-white transition-colors"
                                        aria-label="로그아웃"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        <span className="text-[10px]">로그아웃</span>
                                    </button>
                                </div>
                            </div>

                            {/* CHANGED: 입실 일정 등록 버튼 — 프리미엄 미등록 시 숨김 */}
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
                                    {/* CHANGED: CTA 버튼 이모지 제거 */}
                                    <span>입실 일정 등록하기</span>
                                </button>
                            )}
                        </>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-5 py-6">
                {/* CHANGED: 콘텐츠 뷰가 아닐 때만 탭 표시 */}
                {!showContentView && userInfo && (
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
                {!loading && !showContentView && effectiveTab === 'premium' && !userInfo?.premiumId && (
                    <div className="flex flex-col items-center justify-center py-16 gap-6">
                        <div className="w-16 h-16 bg-[#01DF82]/10 rounded-full flex items-center justify-center">
                            <span className="text-3xl">🌟</span>
                        </div>
                        <div className="text-center">
                            {/* CHANGED: 프리미엄 등록 = 원고료 지급을 위한 정산 정보 등록임을 명확화 */}
                            <h3 className="text-lg font-bold text-white mb-2">정산 정보 등록 필요</h3>
                            <p className="text-sm text-[#888888] leading-relaxed">
                                원고료 지급을 위해<br />
                                정산 정보를 먼저 등록해주세요.
                            </p>
                        </div>
                        <button
                            onClick={() => router.push('/premium-register')}
                            className="px-6 py-3 bg-[#01DF82] text-black font-bold text-sm rounded-xl hover:bg-[#00C972] transition-colors flex items-center gap-2"
                        >
                            {/* CHANGED: 이모지 제거 + 정산 정보 등록 의미 명확화 */}
                            <span>정산 정보 등록하고 프리미엄 시작하기</span>
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

                {!loading && !showContentView && effectiveTab === 'premium' && userInfo?.premiumId && (
                    <>
                        {/* Stats Bar */}
                        {campaigns.length > 0 && (
                            <div className="flex gap-3 mb-4 overflow-x-auto pb-1 scrollbar-hide">
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

                        {/* CHANGED: 알림 토글은 헤더로 이동, 위치 필터만 여기 유지 */}
                        {availableLocations.length > 0 && (
                            <div className="mb-6">
                                <LocationFilter
                                    locations={availableLocations}
                                    selectedLocation={selectedLocation}
                                    onLocationChange={setSelectedLocation}
                                />
                            </div>
                        )}

                        {filteredCampaigns.length > 0 && (() => {
                            const activeCampaigns = filteredCampaigns.filter(c => !c.isClosed);
                            const closedCampaigns = filteredCampaigns.filter(c => c.isClosed);

                            return (
                                <>
                                    {activeCampaigns.length > 0 && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {activeCampaigns.map((campaign) => (
                                                <CampaignCard key={campaign.id} campaign={campaign} channelTypes={userInfo?.channelTypes} />
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
                                                        <CampaignCard key={campaign.id} campaign={campaign} channelTypes={userInfo?.channelTypes} />
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
                {/* CHANGED: 파트너 오픈 준비중 플래그 — false로 바꾸면 정상 노출 */}
                {!loading && !showContentView && effectiveTab === 'partner' && PARTNER_COMING_SOON && (
                    <div className="flex flex-col items-center justify-center py-20 gap-6">
                        <div className="w-20 h-20 bg-[#01DF82]/10 rounded-full flex items-center justify-center">
                            <span className="text-4xl">🚀</span>
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-bold text-white mb-2">파트너 협찬 오픈 준비중</h3>
                            <p className="text-sm text-[#888888] leading-relaxed">
                                곧 다양한 캠핑장 파트너 협찬이 오픈됩니다!<br />
                                조금만 기다려주세요.
                            </p>
                        </div>
                        {/* CHANGED: 빈 상태 3요소(제목+이유+다음 행동) 구조 통일 — 아래 파트너 캠페인 없음 상태와 톤 맞춤 */}
                        <a
                            href={KAKAO_CHANNEL_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-full max-w-xs h-12 bg-[#FEE500] text-[#3C1E1E] font-bold rounded-lg hover:bg-[#F5DC00] transition-colors text-sm"
                        >
                            카카오톡 채널에서 소식 받기
                        </a>
                    </div>
                )}
                {!loading && !showContentView && effectiveTab === 'partner' && !PARTNER_COMING_SOON && (
                    <>
                        {/* Stats Bar */}
                        {partnerCampaigns.length > 0 && (
                            <div className="flex gap-3 mb-4 overflow-x-auto pb-1 scrollbar-hide">
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

                        {/* CHANGED: 알림 토글은 헤더로 이동, 위치 필터만 여기 유지 */}
                        {partnerCampaigns.length > 0 && availableLocations.length > 0 && (
                            <div className="mb-6">
                                <LocationFilter
                                    locations={availableLocations}
                                    selectedLocation={selectedLocation}
                                    onLocationChange={setSelectedLocation}
                                />
                            </div>
                        )}

                        {/* CHANGED: 로딩 완료 후에만 빈 상태 표시 — 로딩 중 깜빡임 방지 */}
                        {!loading && partnerCampaigns.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 gap-6">
                                <div className="w-16 h-16 bg-[#01DF82]/10 rounded-full flex items-center justify-center">
                                    <span className="text-3xl">🏕️</span>
                                </div>
                                <div className="text-center">
                                    <h3 className="text-lg font-bold text-white mb-2">현재 진행 중인 파트너 협찬이 없습니다</h3>
                                    <p className="text-sm text-[#888888] leading-relaxed">
                                        새로운 캠페인이 오픈되면 알려드릴게요
                                    </p>
                                </div>
                                {/* CHANGED: 하드코딩 URL → 공통 상수 KAKAO_CHANNEL_URL 사용 (위 준비중 상태와 통일) */}
                                <a
                                    href={KAKAO_CHANNEL_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center w-full max-w-xs h-12 bg-[#FEE500] text-[#3C1E1E] font-bold rounded-lg hover:bg-[#F5DC00] transition-colors text-sm"
                                >
                                    카카오톡 채널에서 소식 받기
                                </a>
                            </div>
                        )}

                        {filteredPartnerCampaigns.length > 0 && (() => {
                            const activeCampaigns = filteredPartnerCampaigns.filter(c => !c.isClosed);
                            const closedCampaigns = filteredPartnerCampaigns.filter(c => c.isClosed);

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
                {/* ──── 콘텐츠 뷰 (별도 화면) ──── */}
                {/* CHANGED: 탭이 아닌 헤더에서 진입하는 별도 뷰 */}
                {!loading && showContentView && (
                    <>
                        {/* 요약 + 제출 CTA */}
                        <div className="flex items-center justify-between mb-6">
                            <p className="text-sm text-[#888888]">
                                총 <span className="text-white font-semibold">{contentUploads.length}건</span>의 콘텐츠
                            </p>
                            <button
                                onClick={() => setIsContentSubmitModalOpen(true)}
                                className="px-4 py-2 bg-[#01DF82] text-black font-bold text-sm rounded-lg hover:bg-[#00C972] transition-colors flex items-center gap-1.5"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                콘텐츠 제출
                            </button>
                        </div>

                        {/* CHANGED: 연도별 그룹핑 — 올해 풀카드, 이전 연도 콤팩트 */}
                        {contentUploads.length > 0 ? (
                            (() => {
                                const currentYear = new Date().getFullYear().toString();
                                const thisYearUploads = contentUploads.filter(u => u.uploadDate?.startsWith(currentYear));
                                const pastUploads = contentUploads.filter(u => !u.uploadDate?.startsWith(currentYear));

                                // 이전 연도를 연도별로 그룹핑
                                const pastByYear: Record<string, typeof pastUploads> = {};
                                pastUploads.forEach(u => {
                                    const year = u.uploadDate?.slice(0, 4) || '기타';
                                    if (!pastByYear[year]) pastByYear[year] = [];
                                    pastByYear[year].push(u);
                                });
                                const pastYears = Object.keys(pastByYear).sort((a, b) => b.localeCompare(a));

                                return (
                                    <div className="space-y-6">
                                        {/* 올해 콘텐츠 — 풀 카드 */}
                                        {thisYearUploads.length > 0 && (
                                            <div className="space-y-3">
                                                <p className="text-xs text-[#888888] font-medium">{currentYear}년</p>
                                                <div className="space-y-4">
                                                    {thisYearUploads.map((upload) => (
                                                        <ContentCard key={upload.id} content={upload} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* 이전 연도 — 콤팩트 row */}
                                        {pastYears.map(year => (
                                            <div key={year} className="space-y-2">
                                                <p className="text-xs text-[#888888] font-medium">{year}년</p>
                                                <div className="space-y-1.5">
                                                    {pastByYear[year].map((upload) => (
                                                        <ContentCardCompact key={upload.id} content={upload} />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 gap-5">
                                <div className="w-20 h-20 bg-[#1E1E1E] border border-[#333333] rounded-2xl flex items-center justify-center">
                                    <svg className="w-8 h-8 text-[#555555]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                </div>
                                <div className="text-center">
                                    <h3 className="text-base font-bold text-white mb-1.5">아직 제출한 콘텐츠가 없어요</h3>
                                    <p className="text-sm text-[#666666] leading-relaxed">
                                        협찬 후 업로드한 콘텐츠를<br />여기서 관리할 수 있어요
                                    </p>
                                </div>
                            </div>
                        )}
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
            {/* CHANGED: 콘텐츠 제출 모달 */}
            {userInfo && (
                <ContentSubmitModal
                    isOpen={isContentSubmitModalOpen}
                    onClose={() => setIsContentSubmitModalOpen(false)}
                    onSubmitSuccess={fetchContentUploads}
                    userInfo={{
                        creatorId: userInfo.creatorId,
                        channelName: userInfo.channelName,
                        premiumId: userInfo.premiumId,
                        channelTypes: userInfo.channelTypes // CHANGED: 공동작업 인스타 채널 판단용
                    }}
                />
            )}
        </div>
    );
}
