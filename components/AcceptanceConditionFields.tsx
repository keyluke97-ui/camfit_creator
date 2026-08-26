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
    COMPANION_MIN,
    COMPANION_MAX,
    getWonjeongCandidates,
} from '@/lib/constants';
import { buildVisitConditionSummary } from '@/lib/sponsorshipTerms';

type ConditionPatch = Partial<{
    baseRegion: string;
    visitRegions: string[];
    wonjeongRegions: string[];
    visitDays: string[];
    acceptSiteTypes: string[];
    minSponsorAmount: number;
    // CHANGED: 2026-08-12 현장 조건
    companions: number;
    petAllowed: boolean;
    droneUsed: boolean;
}>;

interface AcceptanceConditionFieldsProps {
    baseRegion: string;
    baseRegionPrefill: string;   // 정산 주소에서 파싱한 기준 지역 후보 (미설정 시 프리필)
    visitRegions: string[];
    wonjeongRegions: string[];
    visitDays: string[];
    acceptSiteTypes: string[];
    minSponsorAmount: number;
    companions: number;
    petAllowed: boolean;
    droneUsed: boolean;
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
    companions,
    petAllowed,
    droneUsed,
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
    const visitConditionSummary = buildVisitConditionSummary(companions, petAllowed, droneUsed);

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
            {/* CHANGED: 1a-v2 D4 — 방문 가능 지역을 1개 이상 고른 뒤에만 원정 제안 노출.
                저장은 강제하지 않는다(저장 안 한 사람이 원정을 영영 못 보는 것 방지). */}
            {visitRegions.length > 0 && wonjeongCandidates.length > 0 && (
                <div className="rounded-xl border border-brand/30 bg-brand-bg p-4">
                    <p className="text-sm font-bold text-ink mb-1">더 받으실 수 있어요</p>
                    {/* CHANGED: 1a-v2 D1 — '자동수락이 켜져 있을 때' 문구 제거(토글 폐지). */}
                    <p className="text-xs text-ink2 leading-relaxed mb-3">
                        안 가신다고 하신 지역 중에 유류비 {surcharge}원을 더 드리면 가주실 곳이 있나요?
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
                                                    // CHANGED: 1a-v2 D4 — 컨테이너가 bg-brand-bg로 바뀌어
                                                    // 선택 칩(brand-bg)이 배경에 묻혔다. 채움 대비로 교체.
                                                    ? 'bg-brand text-black border-brand font-bold'
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

            {/* CHANGED: 2026-08-25 — 스펙 E3 폐기. 동반 인원은 필수가 아니라 참고값이다.
                E3는 "캠지기가 사이트를 그 인원에 맞춰 잡아둔다"를 전제로 했으나 사실이 아니다.
                실제로는 크리에이터가 쿠폰을 받아 직접 예약하고(프리미엄 협찬과 동일),
                인원은 방문마다 달라진다(가족 동반 / 혼자). 못박아 받으면 틀린 숫자를 받는다. */}
            <div>
                <label className="block text-sm font-medium text-ink mb-1">
                    동반 인원 <span className="text-ink3 font-normal">(선택)</span>
                </label>
                <p className="text-xs text-ink3 mb-2">
                    보통 몇 분이 함께 가시나요? 캠지기가 참고만 하는 정보라 방문마다 달라져도 괜찮아요.
                    예약은 받으신 쿠폰으로 직접 하시게 됩니다.
                </p>
                <div className="relative">
                    <input
                        type="number"
                        inputMode="numeric"
                        min={COMPANION_MIN}
                        max={COMPANION_MAX}
                        value={companions || ''}
                        onChange={(event) => onChange({ companions: Number(event.target.value) || 0 })}
                        placeholder="예: 2"
                        className="w-full h-12 px-4 pr-10 bg-card border border-line rounded-lg text-ink text-sm focus:border-brand focus:outline-none transition-colors placeholder:text-ink3"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-ink3 text-sm">명</span>
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <button
                    type="button"
                    onClick={() => onChange({ petAllowed: !petAllowed })}
                    aria-pressed={petAllowed}
                    className={`w-full h-12 px-4 rounded-lg border text-sm text-left transition-colors ${
                        petAllowed
                            ? 'bg-brand-bg text-brand-strong border-brand/30 font-medium'
                            : 'bg-card text-ink2 border-line hover:border-strong'
                    }`}
                >
                    {petAllowed ? '\u2713 ' : ''}반려동물과 함께 방문해요
                </button>
                <button
                    type="button"
                    onClick={() => onChange({ droneUsed: !droneUsed })}
                    aria-pressed={droneUsed}
                    className={`w-full h-12 px-4 rounded-lg border text-sm text-left transition-colors ${
                        droneUsed
                            ? 'bg-brand-bg text-brand-strong border-brand/30 font-medium'
                            : 'bg-card text-ink2 border-line hover:border-strong'
                    }`}
                >
                    {droneUsed ? '\u2713 ' : ''}드론으로 촬영해요
                </button>
                <p className="text-xs text-ink3">
                    두 가지는 캠핑장마다 가능 여부가 달라요. 체크하시면 캠지기가 미리 확인해줍니다.
                </p>
            </div>

            {/* CHANGED: 2026-08-12 — 캠지기에게 어떻게 보이는지 그 자리에서 확인시킨다.
                문구는 buildVisitConditionSummary 한 곳에서만 만든다(캠지기 카드·제안서와 동일 문장). */}
            {visitConditionSummary && (
                <div className="bg-subtle border border-line rounded-lg p-3">
                    <p className="text-xs text-ink3 mb-1">캠지기에게 이렇게 보여요</p>
                    <p className="text-sm text-ink font-medium">{visitConditionSummary}</p>
                </div>
            )}

            {/* 6. 협찬 금액 */}
            {/* CHANGED: 1a-v2 D5 — '이 금액 이상'은 협상 여지가 있다는 오해를 준다.
                캠지기는 금액을 바꿀 수 없고 이 값 그대로 제안한다. */}
            <div>
                <label className="block text-sm font-medium text-ink mb-2">
                    협찬 금액 <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-ink2 mb-2 leading-relaxed">
                    캠지기가 <strong className="text-brand-strong">이 금액으로</strong> 제안합니다.<br />
                    등록하신 채널 <strong>전부</strong>에 콘텐츠를 올리는 조건의 금액이에요.
                    채널을 추가하시면 금액도 함께 다시 봐주세요.
                </p>
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

            {/* CHANGED: 1a-v2 D1 — '개별 승인 없이 자동 확정'은 사실과 다르다.
                실제 흐름은 제안서 이메일 → 24~48시간 확인 → 무응답 시 자동 확정이다.
                전체 흐름 고지는 PublishRequestCard가 담당하므로 여기선 조건 매칭만 안내한다. */}
            <p className="text-xs text-ink3 leading-relaxed">
                이 조건에 맞는 제안만 도착합니다. 제안이 오면 이메일로 알려드리고, 24~48시간 안에 확인해주시면 돼요.
            </p>
        </div>
    );
}
