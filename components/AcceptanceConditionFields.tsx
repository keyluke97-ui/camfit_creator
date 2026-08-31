// AcceptanceConditionFields.tsx - 협찬 수락 조건 입력
// 지역 2단(기준→방문가능→원거리 추가금) + 요일·사이트유형·최소단가. (스펙 §6.4 / D5)
// CHANGED: 2026-08-31 — 기준 지역은 더 이상 입력이 아니다. 정산 주소에서 서버가 확정한 값을 표시만 한다.
'use client';

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
import { pruneWonjeongRegions } from '@/lib/creatorProfileRules';

type ConditionPatch = Partial<{
    // ⚠️ baseRegion 없음 — 정산 주소 파생 앵커라 크리에이터가 못 바꾼다(2026-08-31).
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
    baseRegion: string;          // 정산 주소에서 확정된 기준 지역. 확정 불가 시 '' → 원거리 추가금 잠김
    settlementRegistered: boolean; // 정산 정보 등록 여부. 안내 문구가 갈린다(등록 후엔 포털에서 주소를 못 고친다)
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
    settlementRegistered,
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
    // CHANGED: 2026-08-31 — 프리필 useEffect 삭제. onChange(=patchProfile)가 매 렌더 새 identity라
    //   effect가 매 렌더 돌았고, 가드가 `!baseRegion` 하나뿐이라 사용자가 기준 지역을 비우면
    //   즉시 되채워졌다("최초 1회 프리필"이라는 주석과 실제 동작이 달랐다).
    //   이제 기준 지역은 정산 주소에서 서버가 정하므로 폼이 쓸 일 자체가 없다.

    // 방문 가능 지역 변경 → 원거리 추가금 지역 정리.
    // CHANGED: 2026-08-31 — 전에는 겹침만 걷어내서, 방문 가능 지역을 전부 지우면
    //   추가금 값이 payload에 그대로 남아 저장됐다(화면에서는 블록이 사라져 보이지도 않는다).
    //   규칙은 pruneWonjeongRegions에 두고 서버(validateWonjeongSelection)와 같은 술어를 쓴다.
    function handleVisitRegionsChange(next: string[]) {
        onChange({
            visitRegions: next,
            wonjeongRegions: pruneWonjeongRegions(next, wonjeongRegions),
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

    // 원거리 추가금 후보 = 기준 지역(정산 주소 확정) 맵 중 방문 가능(기본가)으로 이미 고른 지역 제외
    const wonjeongCandidates = getWonjeongCandidates(baseRegion).filter(
        (region) => !visitRegions.includes(region)
    );
    const surcharge = WONJEONG_SURCHARGE.toLocaleString();
    const visitConditionSummary = buildVisitConditionSummary(companions, petAllowed, droneUsed);

    return (
        <div className="space-y-5">
            {/* 1. 기준 지역 — 표시 전용. 정산 주소에서 확정한다.
                CHANGED: 2026-08-31 — select 삭제. 자기신고였을 때는 WONJEONG_MAP이 좌우 대칭이라
                자기 거주지를 원거리 추가금으로 켤 수 있는 기준 지역이 반드시 존재했다
                (경기 거주 → 기준 '전라남도' → 후보에 경기도 포함). 집 앞에 추가금이 붙는 구멍이었다. */}
            <div>
                {/* CHANGED: 2026-08-31 카피 — 라벨을 '기준 지역'에서 바꿨다.
                    '기준 지역'은 Airtable 필드명이자 우리끼리 쓰는 말이다. 이 화면을 보는 사람은
                    크리에이터고, 그에게 이 칸은 그냥 자기가 사는 곳이다. */}
                <label className="block text-sm font-medium text-ink mb-2">
                    내가 사는 지역 <span className="text-ink3 font-normal">(먼 거리인지 재는 기준이 돼요)</span>
                </label>
                {baseRegion ? (
                    <div className="w-full h-12 px-4 bg-subtle border border-line rounded-lg flex items-center justify-between gap-2">
                        <span className="text-sm text-ink font-medium">{baseRegion}</span>
                        <span className="text-xs text-ink3 shrink-0">정산 주소에서 가져왔어요</span>
                    </div>
                ) : (
                    <div className="w-full px-4 py-3 bg-subtle border border-line rounded-lg">
                        {/* CHANGED: 2026-08-31 — 등록 여부로 안내를 가른다.
                            등록된 정산 정보는 포털에서 못 고친다(SettlementConfirmCard도 카카오 문의로 보낸다).
                            "주소를 정확히 등록해주세요"는 그 사람들에게 할 수 없는 일을 시키는 문장이다. */}
                        {settlementRegistered ? (
                            <>
                                <p className="text-sm text-ink2">정산 주소로 사시는 지역을 확인하지 못했어요.</p>
                                <p className="text-xs text-ink3 mt-1 leading-relaxed">
                                    먼 지역 추가금을 받으시려면 카카오톡 채널로 주소 확인을 요청해주세요.
                                    나머지 조건은 지금 그대로 저장하셔도 괜찮아요.
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-sm text-ink2">정산 정보를 아직 등록하지 않으셨어요.</p>
                                <p className="text-xs text-ink3 mt-1 leading-relaxed">
                                    아래 <strong>정산 정보</strong>를 등록하시면 주소로 사시는 지역이 정해지고,
                                    먼 지역 추가금도 받으실 수 있어요.
                                </p>
                            </>
                        )}
                    </div>
                )}
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

            {/* 3. 원거리 추가금 (사는 지역 확정 + 후보 있을 때만) */}
            {/* CHANGED: 1a-v2 D4 — 방문 가능 지역을 1개 이상 고른 뒤에만 노출.
                저장은 강제하지 않는다(저장 안 한 사람이 추가금을 영영 못 보는 것 방지). */}
            {/* CHANGED: 2026-08-31 카피 — 세 가지를 고쳤다.
                ① "유류비" → "추가금". 유류비는 영수증 내고 받는 실비로 읽힌다. 실제론 고정액이다.  (RETIRED-OK: 개정 이력)
                ② "할증"도 안 쓴다. 할증은 **내는** 사람 쪽 단어다(택시 할증·심야 할증).
                   이 화면을 보는 크리에이터는 **받는** 쪽이라 "할증을 받으세요"가 어색하고,
                   자칫 자기가 더 내야 하는 것으로 읽힌다.
                ③ "안 가신다고 하신 지역 중에" → "먼 지역이에요". 전자는 방문 가능 지역을
                   적게 고를수록 보상이 커지는 프레이밍이라, 일부러 덜 고르고 추가금으로 돌리는 걸
                   화면이 권하는 꼴이었다. 보상 근거는 "안 골랐다"가 아니라 "멀다"다. */}
            {visitRegions.length > 0 && wonjeongCandidates.length > 0 && (
                <div className="rounded-xl border border-brand/30 bg-brand-bg p-4">
                    <p className="text-sm font-bold text-ink mb-1">먼 지역은 {surcharge}원을 더 받으실 수 있어요</p>
                    {/* CHANGED: 1a-v2 D1 — '자동수락이 켜져 있을 때' 문구 제거(토글 폐지). */}
                    <p className="text-xs text-ink2 leading-relaxed mb-1">
                        {baseRegion}에서 먼 곳이라 이동에 시간이 더 들어요. 그만큼
                        기본 협찬가에 <strong className="text-brand-strong">{surcharge}원</strong>을 더 얹어 드려요.
                        그래도 가실 수 있는 곳을 골라주세요.
                    </p>
                    <p className="text-xs text-ink3 leading-relaxed mb-3">
                        기름값을 영수증으로 정산해 드리는 게 아니라, 거리에 따라 정해진 금액이에요.
                        금액이 올라가는 만큼 그 지역 제안은 줄어들 수도 있어요.
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

            {/* 5. 방문 가능한 사이트 종류 */}
            {/* CHANGED: 2026-08-31 카피 — '수용'은 행정 문서 말투다(수용 인원·수용 시설).
                Airtable 필드명은 `수용 사이트 종류`로 두되 화면에는 사람 말로 적는다. */}
            <div>
                <label className="block text-sm font-medium text-ink mb-2">방문 가능한 사이트 종류</label>
                <MultiSelectChips
                    options={SPONSOR_SITE_TYPES}
                    selected={acceptSiteTypes}
                    onChange={(next) => onChange({ acceptSiteTypes: next })}
                />
            </div>
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


            {/* CHANGED: 2026-08-25 — 여기서부터는 매칭 조건이 아니라 참고 정보다.
                섹션 제목이 "협찬 수락 조건"이고 설명이 "이 조건에 맞는 제안만 받아요"라,
                구분을 안 두면 크리에이터가 인원·반려동물·드론도 필터로 쓰인다고 읽는다.
                캠지기측도 같은 이유로 자기 화면 라벨을 "방문 조건" → "이렇게 방문해요"로 바꿨다. */}
            <div className="pt-2">
                <p className="text-sm font-medium text-ink">여기서부터는 참고 정보예요</p>
                <p className="text-xs text-ink3 mt-0.5">
                    제안을 거르는 데는 쓰이지 않아요. 캠지기가 미리 알아두면 좋은 것들이에요.
                </p>
                <div className="mt-2 h-px bg-subtle" />
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

            {/* CHANGED: 1a-v2 D1 — '개별 승인 없이 자동 확정'은 사실과 다르다.
                전체 흐름 고지는 PublishRequestCard가 담당하므로 여기선 조건 매칭만 안내한다.
                ⚠️ 2026-08-25 — 이 주석이 전에 주장하던 "무응답 시 자동 확정"은 실재하지 않는다.
                   캠지기 계약서 v2 §4.2가 "무응답 시 자동 확정을 쓰지 않는다"로 정했고
                   해당 자동화도 없다. 화면 문구 정합은 제안수신함 계획 Q3에서 결론 낸다. */}
            <p className="text-xs text-ink3 leading-relaxed">
                지역·요일·사이트 종류·금액에 맞는 제안만 도착합니다. 제안이 오면 이메일로 알려드려요.
            </p>
        </div>
    );
}
