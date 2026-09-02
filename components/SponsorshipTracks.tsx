// SponsorshipTracks.tsx - 협찬 2분기(신청하기 / 제안받기) 진입 카드
// CHANGED (2026-09-02): '내 협찬 프로필' 배너 + '받은 제안' 배너를 흡수한다.
//   협찬 경로가 둘이라는 사실이 지금까지 화면에 없었다 — 신청하기는 본문(캠페인 목록)이고
//   제안받기는 배너 한 줄이라 두 갈래가 대등해 보이지 않았다.
// ⚠️ 뱃지·문구·이동지는 lib/sponsorshipTrackRules.ts가 정한다. 여기엔 표현만 둔다.
'use client';

import { resolveApplyTrack, resolveOfferTrack } from '@/lib/sponsorshipTrackRules';
import type { ApplyTrackDestination, OfferTrackDestination } from '@/lib/sponsorshipTrackRules';
import type { ReviewStatus } from '@/types';

interface SponsorshipTracksProps {
    hasPremiumId: boolean;
    openCampaignCount: number;
    reviewStatus: ReviewStatus;
    isPublic: boolean;
    offerCount: number;
    pendingCount: number;
    newOfferCount: number;
    onApplyClick: (destination: ApplyTrackDestination) => void;
    onOfferClick: (destination: OfferTrackDestination) => void;
}

export default function SponsorshipTracks({
    hasPremiumId,
    openCampaignCount,
    reviewStatus,
    isPublic,
    offerCount,
    pendingCount,
    newOfferCount,
    onApplyClick,
    onOfferClick,
}: SponsorshipTracksProps) {
    const apply = resolveApplyTrack({ hasPremiumId, openCampaignCount });
    const offer = resolveOfferTrack({ reviewStatus, isPublic, offerCount, pendingCount, newOfferCount });
    // 반려만 위험 톤. 나머지는 브랜드 그린을 유지해 '제안받기'가 늘 같은 자리로 읽히게 한다.
    const isRejected = offer.tone === 'danger';

    return (
        // CHANGED: aria-label 대신 pill을 aria-labelledby로 참조 — 라벨과 보이는 제목이
        //          어긋나면 스크린리더가 비슷한 말을 두 번 읽는다.
        <section
            className="bg-card border border-line rounded-[14px] p-3.5 mb-4"
            aria-labelledby="sponsorship-tracks-title"
        >
            {/* CHANGED: text-ink3(#9da0a5)는 bg-subtle 위에서 2.43:1로 사실상 안 읽힌다.
                         이 한 줄이 '경로가 둘'이라는 이 화면의 목적을 담은 문장이라 ink2(5.37:1)로 올린다.
                         brand-strong은 여기서 3.19:1이라 대안이 못 된다. */}
            <span
                id="sponsorship-tracks-title"
                className="inline-block text-[10px] font-bold tracking-wider text-ink2 bg-subtle rounded-full px-2.5 py-1 mb-3"
            >
                협찬 받는 방법 2가지
            </span>

            {/* CHANGED: aria-label을 두지 않는다. 접근 가능한 이름이 자식 텍스트를 덮어써서
                         뱃지('새 제안 N'·'비공개')가 스크린리더에 도달하지 않는다.
                         자식만으로 이미 완전한 한국어 이름이 나온다. */}
            <button
                type="button"
                onClick={() => onApplyClick(apply.destination)}
                className="w-full text-left bg-card border border-strong rounded-lg px-3.5 py-3 mb-2.5 hover:border-brand transition-colors"
            >
                <span className="block text-[15px] font-bold text-ink">신청하기</span>
                <span className="block text-xs text-ink2 mt-1">{apply.message}</span>
            </button>

            {/* CHANGED: 반려 톤은 red-700. red-600은 bg-red-500/10(합성 #ffeaeb) 위에서
                         4.14:1로 AA(4.5) 미달이다. 레포 관행인 red-500은 3.30:1로 더 낮다.
                         테두리 없는 브랜드 톤과 높이를 맞추려고 border-transparent를 둔다. */}
            {/* ⚠️ Tailwind v4에서 `border` 단독의 기본색은 currentColor다(v3의 gray-200에서 바뀜).
                     OfferTrackTone에 톤을 추가하면 border-* 색도 반드시 함께 지정해라. */}
            <button
                type="button"
                onClick={() => onOfferClick(offer.destination)}
                className={`w-full text-left rounded-lg px-3.5 py-3 border transition-colors ${
                    isRejected
                        ? 'bg-red-500/10 border-red-500/60 hover:border-red-500'
                        : 'bg-brand border-transparent hover:bg-brand-hover'
                }`}
            >
                {/* ⚠️ 이 flex 래퍼가 접근 가능한 이름의 띄어쓰기를 만든다. 자식 span들이
                         flex item이라 blockify되어 "제안받기 새 제안 1 …"로 분리돼 읽힌다.
                         평범한 inline span으로 바꾸면 "제안받기새 제안 1"로 붙는다. */}
                <span className="flex items-center gap-1.5">
                    <span className={`text-[15px] font-bold ${isRejected ? 'text-red-700' : 'text-black'}`}>
                        제안받기
                    </span>
                    {offer.badge && (
                        <span
                            className={`text-[10px] font-bold rounded px-1.5 py-0.5 tracking-wide ${
                                isRejected
                                    ? 'text-red-700 border border-red-500'
                                    : 'bg-black text-brand'
                            }`}
                        >
                            {offer.badge}
                        </span>
                    )}
                </span>
                <span className={`block text-xs mt-1 ${isRejected ? 'text-red-700' : 'text-black/70'}`}>
                    {offer.message}
                </span>
            </button>
        </section>
    );
}
