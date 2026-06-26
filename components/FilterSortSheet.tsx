// FilterSortSheet.tsx - 정렬 + 지역 필터 통합 바텀시트 (모바일 퍼스트)
// CHANGED: 캠페인 정렬/필터 통합 시트 신규 생성 (sticky 버튼에서 진입)
'use client';

import { useState } from 'react';
import { SORT_OPTIONS, DEFAULT_SORT_KEY } from '@/lib/campaignSort';
import type { CampaignSortKey } from '@/types';

interface FilterSortSheetProps {
    isOpen: boolean;
    onClose: () => void;
    sortKey: CampaignSortKey;
    selectedLocation: string;
    // 지역별 캠페인 수 (가나다순, '전체' 제외). count는 결과 개수 표시용
    locationCounts: { location: string; count: number }[];
    totalCount: number; // '전체' 옵션의 개수
    onApply: (sortKey: CampaignSortKey, location: string) => void;
}

export default function FilterSortSheet({
    isOpen,
    onClose,
    sortKey,
    selectedLocation,
    locationCounts,
    totalCount,
    onApply,
}: FilterSortSheetProps) {
    // 배치 적용 — '적용' 누르기 전까진 draft에만 반영 (Baymard 모바일 권장 패턴)
    const [draftSort, setDraftSort] = useState<CampaignSortKey>(sortKey);
    const [draftLocation, setDraftLocation] = useState<string>(selectedLocation);

    // 시트가 닫힘→열림으로 전환될 때 현재 적용값으로 draft 동기화
    // (effect 대신 React 공식 권장 '렌더 중 이전 props 비교' 패턴 — set-state-in-effect 회피)
    const [wasOpen, setWasOpen] = useState(isOpen);
    if (isOpen !== wasOpen) {
        setWasOpen(isOpen);
        if (isOpen) {
            setDraftSort(sortKey);
            setDraftLocation(selectedLocation);
        }
    }

    // CTA에 표시할 결과 개수 (정렬은 개수에 영향 없음, 지역만 반영)
    const resultCount =
        draftLocation === '전체'
            ? totalCount
            : locationCounts.find((item) => item.location === draftLocation)?.count ?? 0;

    const handleReset = () => {
        setDraftSort(DEFAULT_SORT_KEY);
        setDraftLocation('전체');
    };

    const handleApply = () => {
        onApply(draftSort, draftLocation);
        onClose();
    };

    return (
        <div className={`fixed inset-0 z-50 ${isOpen ? '' : 'pointer-events-none'}`} aria-hidden={!isOpen}>
            {/* 백드롭 */}
            <div
                className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />

            {/* 시트 패널 */}
            <div
                className={`absolute bottom-0 left-0 right-0 max-w-md mx-auto bg-card border-t border-line rounded-t-2xl transition-transform duration-300 ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
                role="dialog"
                aria-modal="true"
                aria-label="정렬 및 필터"
            >
                {/* 핸들 + 헤더 */}
                <div className="flex flex-col items-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-subtle" />
                </div>
                <div className="flex items-center justify-between px-5 pt-2 pb-3">
                    <h2 className="text-base font-bold text-ink">정렬·필터</h2>
                    <button
                        onClick={handleReset}
                        className="text-xs text-ink3 hover:text-ink transition-colors cursor-pointer"
                    >
                        초기화
                    </button>
                </div>

                <div className="px-5 pb-2 max-h-[60vh] overflow-y-auto">
                    {/* 정렬 섹션 */}
                    <section className="mb-5">
                        <h3 className="text-xs font-medium text-ink3 mb-2">정렬</h3>
                        <div className="flex flex-col gap-2">
                            {SORT_OPTIONS.map((option) => {
                                const active = draftSort === option.key;
                                return (
                                    <button
                                        key={option.key}
                                        onClick={() => setDraftSort(option.key)}
                                        className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm cursor-pointer transition-colors ${
                                            active
                                                ? 'bg-brand-bg border border-brand text-ink'
                                                : 'bg-subtle border border-line text-ink2 hover:border-strong'
                                        }`}
                                    >
                                        <span>{option.label}</span>
                                        {active && (
                                            <svg className="w-4 h-4 text-brand-strong" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {/* 지역 필터 섹션 */}
                    {locationCounts.length > 0 && (
                        <section className="mb-2">
                            <h3 className="text-xs font-medium text-ink3 mb-2">지역</h3>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setDraftLocation('전체')}
                                    className={`px-3 py-1.5 text-xs rounded-full whitespace-nowrap cursor-pointer transition-colors ${
                                        draftLocation === '전체'
                                            ? 'bg-brand text-black font-medium'
                                            : 'bg-subtle text-ink3 border border-line'
                                    }`}
                                >
                                    전체 ({totalCount})
                                </button>
                                {locationCounts.map(({ location, count }) => (
                                    <button
                                        key={location}
                                        onClick={() => setDraftLocation(location)}
                                        className={`px-3 py-1.5 text-xs rounded-full whitespace-nowrap cursor-pointer transition-colors ${
                                            draftLocation === location
                                                ? 'bg-brand text-black font-medium'
                                                : 'bg-subtle text-ink3 border border-line'
                                        }`}
                                    >
                                        {location} ({count})
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* 푸터 CTA — 결과 개수 실시간 반영 (Baymard 권장) */}
                <div className="px-5 py-4 border-t border-line" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
                    <button
                        onClick={handleApply}
                        className="w-full py-3 bg-brand text-black font-bold rounded-xl hover:bg-brand-hover transition-colors cursor-pointer"
                    >
                        캠페인 {resultCount}개 보기
                    </button>
                </div>
            </div>
        </div>
    );
}
