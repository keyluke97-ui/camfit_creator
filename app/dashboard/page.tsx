// page.tsx - 대시보드 메인 페이지 (프리미엄 캠페인 + 콘텐츠 뷰)
'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CampaignCard from '@/components/CampaignCard';
import CheckinModal from '@/components/CheckinModal';
// CHANGED: 인라인 LocationFilter → 정렬·필터 통합 바텀시트로 교체
import FilterSortSheet from '@/components/FilterSortSheet';
import NotificationToggle from '@/components/NotificationToggle';
// CHANGED: 콘텐츠 탭 컴포넌트 import
import ContentCard from '@/components/ContentCard';
import ContentCardCompact from '@/components/ContentCardCompact';
import ContentSubmitModal from '@/components/ContentSubmitModal';
// CHANGED (IA v3): 콘텐츠 진입 배너 — 헤더 아이콘 대신 메인 영역 배너로 승격
import ContentEntryBanner from '@/components/ContentEntryBanner';
// CHANGED: 캠냥이 마스코트 (빈 상태) + 오브젝트 아이콘
import Mascot from '@/components/Mascot';
import BrandIcon from '@/components/BrandIcon';
import type { Campaign, ContentUpload, TierLevel, ChannelType, CampaignSortKey } from '@/types';
// CHANGED: 공통 상수를 constants.ts에서 import
import { KAKAO_CHANNEL_URL } from '@/lib/constants';
// CHANGED: 캠페인 정렬 로직
import { sortCampaigns, sortLabel, DEFAULT_SORT_KEY } from '@/lib/campaignSort';

// CHANGED: premiumId 추가 — 프리미엄 등록 여부 분기용
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
            <div className="min-h-screen bg-page flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}

function DashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // CHANGED: 통합 후 파트너 탭 제거 — 콘텐츠 뷰만 별도 화면으로 진입
    const tabFromUrl = searchParams.get('tab');
    const [showContentView, setShowContentView] = useState(tabFromUrl === 'content');

    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    // CHANGED: userRecordId 상태 제거 — API에서 JWT로 사용자 식별
    const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
    // CHANGED: 콘텐츠 탭 state 추가
    const [contentUploads, setContentUploads] = useState<ContentUpload[]>([]);
    // CHANGED: 콘텐츠 로드 실패를 빈 상태와 구분 — 무음 처리되던 결함 수정
    const [contentError, setContentError] = useState(false);
    const [isContentSubmitModalOpen, setIsContentSubmitModalOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showClosedCampaigns, setShowClosedCampaigns] = useState(false);
    // CHANGED: 위치 필터 state 추가
    const [selectedLocation, setSelectedLocation] = useState<string>('전체');
    // CHANGED: 정렬 state + 정렬·필터 시트 열림 state
    const [sortKey, setSortKey] = useState<CampaignSortKey>(DEFAULT_SORT_KEY);
    const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
    // CHANGED: 알림 토글 state 추가
    const [notificationEnabled, setNotificationEnabled] = useState(true);

    // CHANGED: 콘텐츠 뷰 전환 핸들러
    const handleOpenContentView = () => {
        setShowContentView(true);
        window.history.replaceState(null, '', '/dashboard?tab=content');
        fetchContentUploads();
    };

    const handleCloseContentView = () => {
        setShowContentView(false);
        window.history.replaceState(null, '', '/dashboard');
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
                setContentError(false);
            } else {
                // CHANGED: 실패를 빈 상태로 위장하지 않고 에러 상태로 노출
                setContentError(true);
            }
        } catch (error) {
            console.error(error);
            setContentError(true);
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

    // CHANGED: 지역별 캠페인 수 집계 (필터 시트의 개수 표시용 — Baymard 권장)
    const locationCounts = useMemo(() => {
        const counts = new Map<string, number>();
        for (const campaign of campaigns) {
            if (!campaign.location) continue;
            counts.set(campaign.location, (counts.get(campaign.location) ?? 0) + 1);
        }
        return [...counts.entries()]
            .map(([location, count]) => ({ location, count }))
            .sort((a, b) => a.location.localeCompare(b.location, 'ko'));
    }, [campaigns]);

    // CHANGED: 지역 필터 → 정렬 적용 (정렬은 active/closed 분리 전에 전체 배열에 적용)
    const filteredCampaigns = useMemo(() => {
        const filtered = selectedLocation === '전체'
            ? campaigns
            : campaigns.filter(c => c.location === selectedLocation);
        return sortCampaigns(filtered, sortKey);
    }, [campaigns, selectedLocation, sortKey]);

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

    // CHANGED: 프리미엄 캠페인 패칭 — premiumId 없으면 스킵
    useEffect(() => {
        if (!userInfo) return;
        if (userInfo.premiumId) {
            fetchCampaigns();
        }
    }, [userInfo]);

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
                } else if (userInfo?.premiumId) {
                    // CHANGED: premiumId 없으면 프리미엄 캠페인 재패칭 스킵
                    fetchCampaigns();
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [showContentView, userInfo?.premiumId]);

    const handleLogout = async () => {
        await fetch('/api/auth/logout');
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-page pb-20">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-page/95 backdrop-blur-sm border-b border-line">
                <div className="max-w-7xl mx-auto px-5 py-4">
                    {/* CHANGED: 콘텐츠 뷰일 때 별도 헤더 */}
                    {showContentView ? (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleCloseContentView}
                                className="p-2 -ml-2 text-ink3 hover:text-ink transition-colors"
                                aria-label="캠페인 보기로 돌아가기"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <h1 className="text-lg font-bold text-ink">내 콘텐츠</h1>
                        </div>
                    ) : (
                        <>
                            {/* Top Row */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex flex-col gap-1">
                                    {/* CHANGED: 크리에이터 등급 뱃지 일시 삭제 */}
                                    <h1 className="text-xl font-bold text-ink truncate max-w-[200px]">
                                        {userInfo?.channelName || '로딩 중...'}
                                    </h1>
                                    <p className="text-xs text-ink3 flex items-center gap-1">오늘도 즐거운 캠핑 되세요!<BrandIcon name="tent" size={14} /></p>
                                </div>

                                {/* CHANGED (IA v3): 콘텐츠 아이콘 제거 — 메인 영역 ContentEntryBanner로 승격. 알림/로그아웃만 유지 */}
                                <div className="flex items-center gap-1">
                                    <NotificationToggle
                                        enabled={notificationEnabled}
                                        onToggle={handleNotificationToggle}
                                    />
                                    <button
                                        onClick={handleLogout}
                                        className="flex flex-col items-center gap-0.5 px-2 py-1 text-ink3 hover:text-ink transition-colors"
                                        aria-label="로그아웃"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        <span className="text-[10px]">로그아웃</span>
                                    </button>
                                </div>
                            </div>

                            {/* CHANGED: 입실 일정 등록 버튼 — 프리미엄(정산정보) 등록 시에만 노출 */}
                            {userInfo?.premiumId && (
                                <button
                                    onClick={() => setIsCheckinModalOpen(true)}
                                    className="w-full h-12 bg-brand text-black font-bold text-base rounded-xl hover:bg-brand-hover transition-colors shadow-lg shadow-brand/20 flex items-center justify-center gap-2"
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
                {/* CHANGED (IA v3): 콘텐츠 진입 배너 — 헤더 아이콘 대신 메인 영역 상단 노출 */}
                {!showContentView && userInfo && (
                    <div className="mb-4">
                        <ContentEntryBanner onClick={handleOpenContentView} />
                    </div>
                )}

                {/* 에러 메시지 */}
                {errorMessage && (
                    <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                        <p className="text-red-500 text-sm text-center font-medium">{errorMessage}</p>
                    </div>
                )}

                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm text-ink3">데이터를 불러오고 있습니다...</p>
                    </div>
                )}

                {/* ──── 프리미엄 캠페인 ──── */}
                {/* CHANGED: 정산정보 미등록 CTA — /premium-register 등록 폼 링크 */}
                {!loading && !showContentView && !userInfo?.premiumId && (
                    <div className="flex flex-col items-center justify-center py-16 gap-6">
                        {/* CHANGED: 🌟 이모지 → 메모하는 캠냥이 마스코트 */}
                        <Mascot expression="inspect-memo" size={96} />
                        <div className="text-center">
                            {/* CHANGED: 프리미엄 등록 = 원고료 지급을 위한 정산 정보 등록임을 명확화 */}
                            <h3 className="text-lg font-bold text-ink mb-2">정산 정보 등록 필요</h3>
                            <p className="text-sm text-ink3 leading-relaxed">
                                원고료 지급을 위해<br />
                                정산 정보를 먼저 등록해주세요.
                            </p>
                        </div>
                        <button
                            onClick={() => router.push('/premium-register')}
                            className="px-6 py-3 bg-brand text-black font-bold text-sm rounded-xl hover:bg-brand-hover transition-colors flex items-center gap-2"
                        >
                            {/* CHANGED: 이모지 제거 + 정산 정보 등록 의미 명확화 */}
                            <span>정산 정보 등록하고 프리미엄 시작하기</span>
                        </button>
                        <a
                            href={KAKAO_CHANNEL_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-ink3 hover:text-ink3 transition-colors underline"
                        >
                            문의사항은 카카오톡 채널로
                        </a>
                    </div>
                )}

                {!loading && !showContentView && userInfo?.premiumId && (
                    <>
                        {/* Stats Bar */}
                        {campaigns.length > 0 && (
                            <div className="flex gap-3 mb-4 overflow-x-auto pb-1 scrollbar-hide">
                                <div className="flex-1 min-w-[140px] bg-card border border-line rounded-xl p-4 flex flex-col justify-center">
                                    <span className="text-xs text-ink3 mb-1">전체 캠페인</span>
                                    <span className="text-xl font-bold text-ink">{campaigns.length}개</span>
                                </div>
                                <div className="flex-1 min-w-[140px] bg-card border border-line rounded-xl p-4 flex flex-col justify-center">
                                    <span className="text-xs text-ink3 mb-1">신청 가능</span>
                                    <span className="text-xl font-bold text-brand-strong">
                                        {campaigns.filter(c => !c.isClosed).length}개
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* CHANGED: 적용된 정렬·필터 요약 바 — 항상 보이게(Baymard) + 탭하면 시트 열림 */}
                        {campaigns.length > 0 && (
                            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                                <button
                                    onClick={() => setIsFilterSheetOpen(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full whitespace-nowrap bg-brand-bg text-brand-strong border border-brand/30 cursor-pointer hover:bg-brand-bg transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 12h10M11 20h2" />
                                    </svg>
                                    {sortLabel(sortKey)}
                                </button>
                                {selectedLocation !== '전체' && (
                                    <button
                                        onClick={() => setSelectedLocation('전체')}
                                        className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-full whitespace-nowrap bg-subtle text-ink border border-line cursor-pointer hover:border-strong transition-colors"
                                    >
                                        {selectedLocation}
                                        <svg className="w-3 h-3 text-ink3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
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
                                                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-card border border-line rounded-xl text-ink3 hover:text-ink hover:border-strong transition-colors"
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

                        {/* CHANGED: 빈 상태 추가 — 캠페인 0개 또는 필터 결과 0이던 백지 화면 갭 메움 */}
                        {filteredCampaigns.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 gap-5">
                                <Mascot expression="thinking" size={104} />
                                <div className="text-center">
                                    <h3 className="text-base font-bold text-ink mb-1.5">
                                        {selectedLocation !== '전체'
                                            ? `${selectedLocation} 캠페인이 없어요`
                                            : '진행 중인 캠페인이 없어요'}
                                    </h3>
                                    <p className="text-sm text-ink3 leading-relaxed">
                                        {selectedLocation !== '전체'
                                            ? '다른 지역을 둘러보거나 필터를 초기화해보세요'
                                            : '새 캠페인이 열리면 여기에 표시돼요'}
                                    </p>
                                </div>
                                {selectedLocation !== '전체' && (
                                    <button
                                        onClick={() => setSelectedLocation('전체')}
                                        className="px-5 py-2.5 bg-brand text-black font-bold text-sm rounded-full hover:bg-brand-hover transition-colors"
                                    >
                                        필터 초기화
                                    </button>
                                )}
                            </div>
                        )}

                        {/* CHANGED: 하단 스페이서 — 고정 정렬·필터 버튼이 마지막 카드 내용을 가리던 문제 해소 */}
                        <div className="h-24" aria-hidden />
                    </>
                )}

                {/* ──── 콘텐츠 뷰 (별도 화면) ──── */}
                {/* CHANGED: 탭이 아닌 헤더에서 진입하는 별도 뷰 */}
                {!loading && showContentView && (
                    <>
                        {/* 요약 + 제출 CTA */}
                        <div className="flex items-center justify-between mb-6">
                            <p className="text-sm text-ink3">
                                총 <span className="text-ink font-semibold">{contentUploads.length}건</span>의 콘텐츠
                            </p>
                            <button
                                onClick={() => setIsContentSubmitModalOpen(true)}
                                className="px-4 py-2 bg-brand text-black font-bold text-sm rounded-lg hover:bg-brand-hover transition-colors flex items-center gap-1.5"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                {/* CHANGED: 용어 통일 '제출' → '전달' */}
                                콘텐츠 전달
                            </button>
                        </div>

                        {/* CHANGED: 연도별 그룹핑 — 올해 풀카드, 이전 연도 콤팩트 */}
                        {/* CHANGED: 로드 실패 시 빈 상태 대신 에러 + 재시도 (무음 처리 결함 수정) */}
                        {contentError && contentUploads.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-5">
                                <Mascot expression="sorry" size={104} />
                                <div className="text-center">
                                    <h3 className="text-base font-bold text-ink mb-1.5">콘텐츠를 불러오지 못했어요</h3>
                                    <p className="text-sm text-ink3 leading-relaxed">
                                        잠시 후 다시 시도해주세요.<br />계속되면 카카오톡 채널로 문의해주세요.
                                    </p>
                                </div>
                                <button
                                    onClick={() => fetchContentUploads()}
                                    className="px-5 py-2.5 bg-brand text-black font-bold text-sm rounded-full hover:bg-brand-hover transition-colors"
                                >
                                    다시 시도
                                </button>
                            </div>
                        ) : contentUploads.length > 0 ? (
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
                                                <p className="text-xs text-ink3 font-medium">{currentYear}년</p>
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
                                                <p className="text-xs text-ink3 font-medium">{year}년</p>
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
                            // CHANGED: 빈 상태에 CTA 버튼 추가 + 용어 통일 '제출' → '전달'
                            <div className="flex flex-col items-center justify-center py-20 gap-5">
                                {/* CHANGED: 폴더 SVG → 두리번거리는 캠냥이 마스코트 */}
                                <Mascot expression="curious" size={104} />
                                <div className="text-center">
                                    <h3 className="text-base font-bold text-ink mb-1.5">아직 전달한 콘텐츠가 없어요</h3>
                                    <p className="text-sm text-ink3 leading-relaxed">
                                        협찬 후 업로드한 콘텐츠를<br />여기서 관리할 수 있어요
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsContentSubmitModalOpen(true)}
                                    className="mt-2 px-5 py-2.5 bg-brand text-black font-bold text-sm rounded-lg hover:bg-brand-hover transition-colors flex items-center gap-1.5"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    콘텐츠 전달하기
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>

            <CheckinModal
                isOpen={isCheckinModalOpen}
                onClose={() => setIsCheckinModalOpen(false)}
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

            {/* CHANGED: 캠페인 뷰 전용 — sticky 정렬·필터 버튼 + 바텀시트 */}
            {!loading && !showContentView && userInfo?.premiumId && campaigns.length > 0 && (
                <>
                    <button
                        onClick={() => setIsFilterSheetOpen(true)}
                        className="fixed left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-5 py-3 bg-brand text-black font-bold text-sm rounded-full shadow-lg shadow-black/10 hover:bg-brand-hover transition-colors cursor-pointer"
                        style={{ bottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 12h10M11 20h2" />
                        </svg>
                        정렬·필터
                        {selectedLocation !== '전체' && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
                    </button>

                    <FilterSortSheet
                        isOpen={isFilterSheetOpen}
                        onClose={() => setIsFilterSheetOpen(false)}
                        sortKey={sortKey}
                        selectedLocation={selectedLocation}
                        locationCounts={locationCounts}
                        totalCount={campaigns.length}
                        onApply={(nextSort, nextLocation) => {
                            setSortKey(nextSort);
                            setSelectedLocation(nextLocation);
                        }}
                    />
                </>
            )}
        </div>
    );
}
