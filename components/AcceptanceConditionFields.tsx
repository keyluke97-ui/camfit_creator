// AcceptanceConditionFields.tsx - 협찬 수락 조건 입력
// 지역 2단(기준→방문가능→원정 제안) + 요일·사이트유형·최소단가. (스펙 §6.4 / D5)
'use client';

import { useEffect } from 'react';
import MultiSelectChips from './MultiSelectChips';
import {
    VISIT_REGIONS,
    VISIT_DAYS,
    SPONSOR_SITE_TYPES,
    WONJEONG_SURCHARGE,
    getWonjeongCandidates,
} from '@/lib/constants';

type ConditionPatch = Partial<{
    baseRegion: string;
    visitRegions: string[];
    wonjeongRegions: string[];
    visitDays: string[];
    acceptSiteTypes: string[];
    minSponsorAmount: number;
}>;

interface AcceptanceConditionFieldsProps {
    baseRegion: string;
    baseRegionPrefill: string;   // 정산 주소에서 파싱한 기준 지역 후보 (미설정 시 프리필)
    visitRegions: string[];
    wonjeongRegions: string[];
    visitDays: string[];
    acceptSiteTypes: string[];
    minSponsorAmount: number;
    onChange: (patch: ConditionPatch) => void;
}

export default function AcceptanceConditionFields({
    baseRegion,
    baseRegionPrefill,
    visitRegions,
    wonjeongRegions,
    visitDays,
    acceptSiteTypes,
    minSponsorAmount,
    onChange,
}: AcceptanceConditionFieldsProps) {
    // 주소 파싱 기준 지역을 최초 1회 프리필(사용자가 아직 미설정일 때만).
    // baseRegion이 채워지면 가드로 재실행돼도 no-op → 무한 루프 없음.
    useEffect(() => {
        if (!baseRegion && baseRegionPrefill && VISIT_REGIONS.includes(baseRegionPrefill)) {
            onChange({ baseRegion: baseRegionPrefill });
        }
    }, [baseRegion, baseRegionPrefill, onChange]);

    // 기준 지역 변경 → 원정 후보 밖으로 벗어난 기존 선택 제거(서버 ⊆ WONJEONG_MAP 검증과 정합)
    function handleBaseRegionChange(value: string) {
        const candidates = getWonjeongCandidates(value);
        onChange({
            baseRegion: value,
            wonjeongRegions: wonjeongRegions.filter((region) => candidates.includes(region)),
        });
    }

    // 방문 가능 지역 변경 → 겹치는 원정 지역 제거(서버 ∩ visitRegions = ∅ 상호배타 검증과 정합)
    function handleVisitRegionsChange(next: string[]) {
        onChange({
            visitRegions: next,
            wonjeongRegions: wonjeongRegions.filter((region) => !next.includes(region)),
        });
    }

    function setWonjeong(region: string, on: boolean) {
        const next = on
            ? wonjeongRegions.includes(region)
                ? wonjeongRegions
                : [...wonjeongRegions, region]
            : wonjeongRegions.filter((value) => value !== region);
        onChange({ wonjeongRegions: next });
    }

    // 원정 제안 후보 = 기준 지역 맵 중 방문 가능(기본가)으로 이미 고른 지역 제외
    const wonjeongCandidates = getWonjeongCandidates(baseRegion).filter(
        (region) => !visitRegions.includes(region)
    );
    const surcharge = WONJEONG_SURCHARGE.toLocaleString();

    return (
        <div className="space-y-5">
            {/* 1. 기준 지역 */}
            <div>
                <label className="block text-sm font-medium text-ink mb-2">
                    기준 지역 <span className="text-ink3 font-normal">(거주 지역 — 원정 제안 기준)</span>
                </label>
                <select
                    value={baseRegion}
                    onChange={(event) => handleBaseRegionChange(event.target.value)}
                    className="w-full h-12 px-4 bg-card border border-line rounded-lg text-ink text-sm focus:border-brand focus:outline-none transition-colors"
                >
                    <option value="">선택해주세요</option>
                    {VISIT_REGIONS.map((region) => (
                        <option key={region} value={region}>
                            {region}
                        </option>
                    ))}
                </select>
            </div>

            {/* 2. 방문 가능 지역 (기본가) */}
            <div>
                <label className="block text-sm font-medium text-ink mb-2">
                    방문 가능 지역 <span className="text-ink3 font-normal">(기본 협찬가로 방문)</span>
                </label>
                <MultiSelectChips
                    options={VISIT_REGIONS}
                    selected={visitRegions}
                    onChange={handleVisitRegionsChange}
                />
            </div>

            {/* 3. 원정 제안 (기준 지역 선택 + 후보 있을 때만) */}
            {wonjeongCandidates.length > 0 && (
                <div className="rounded-lg border border-line bg-subtle p-4">
                    <p className="text-sm font-medium text-ink mb-1">
                        원정도 받으시겠어요? <span className="text-brand-strong font-semibold">유류비 +{surcharge}원</span>
                    </p>
                    <p className="text-xs text-ink3 leading-relaxed mb-3">
                        원정 지역은 캠지기가 유류비 {surcharge}원을 얹어 제안하면, 자동수락이 켜져 있을 때 자동 확정됩니다.
                    </p>
                    <div className="space-y-2">
                        {wonjeongCandidates.map((region) => {
                            const on = wonjeongRegions.includes(region);
                            return (
                                <div
                                    key={region}
                                    className="flex items-center justify-between gap-3"
                                >
                                    <span className="text-sm text-ink">{region}</span>
                                    <div className="flex gap-1.5 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setWonjeong(region, true)}
                                            aria-pressed={on}
                                            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                                                on
                                                    ? 'bg-brand-bg text-brand-strong border-brand/30 font-medium'
                                                    : 'bg-card text-ink3 border-line hover:border-brand'
                                            }`}
                                        >
                                            예
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setWonjeong(region, false)}
                                            aria-pressed={!on}
                                            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                                                !on
                                                    ? 'bg-subtle text-ink border-strong font-medium'
                                                    : 'bg-card text-ink3 border-line hover:border-strong'
                                            }`}
                                        >
                                            아니오
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 4. 방문 가능 요일 */}
            <div>
                <label className="block text-sm font-medium text-ink mb-2">방문 가능 요일</label>
                <MultiSelectChips
                    options={VISIT_DAYS}
                    selected={visitDays}
                    onChange={(next) => onChange({ visitDays: next })}
                />
            </div>

            {/* 5. 수용 사이트 종류 */}
            <div>
                <label className="block text-sm font-medium text-ink mb-2">수용 사이트 종류</label>
                <MultiSelectChips
                    options={SPONSOR_SITE_TYPES}
                    selected={acceptSiteTypes}
                    onChange={(next) => onChange({ acceptSiteTypes: next })}
                />
            </div>

            {/* 6. 최소 협찬 단가 */}
            <div>
                <label className="block text-sm font-medium text-ink mb-2">
                    최소 협찬 단가 <span className="text-ink3 font-normal">(이 금액 이상 제안만 받아요)</span>
                </label>
                <div className="relative">
                    <input
                        type="number"
                        inputMode="numeric"
                        value={minSponsorAmount || ''}
                        onChange={(event) => onChange({ minSponsorAmount: Number(event.target.value) || 0 })}
                        placeholder="예: 300000"
                        className="w-full h-12 px-4 pr-10 bg-card border border-line rounded-lg text-ink text-sm focus:border-brand focus:outline-none transition-colors placeholder:text-ink3"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-ink3 text-sm">원</span>
                </div>
            </div>

            <p className="text-xs text-ink3 leading-relaxed">
                조건에 맞는 제안만 도착하고, 캠지기가 선입금하면 개별 승인 없이 자동 확정됩니다.
            </p>
        </div>
    );
}
