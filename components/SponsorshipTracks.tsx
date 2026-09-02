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
        <section
            className="bg-card border border-line rounded-[14px] p-3.5 mb-4"
            aria-label="협찬 받는 방법"
        >
            <span className="inline-block text-[10px] font-bold tracking-wider text-ink3 bg-subtle rounded-full px-2.5 py-1 mb-3">
                협찬 받는 방법 2가지
            </span>

            <button
                onClick={() => onApplyClick(apply.destination)}
                className="w-full text-left bg-card border border-strong rounded-lg px-3.5 py-3 mb-2.5 hover:border-brand transition-colors"
                aria-label={`신청하기 — ${apply.message}`}
            >
                <span className="block text-[15px] font-bold text-ink">신청하기</span>
                <span className="block text-xs text-ink2 mt-1">{apply.message}</span>
            </button>

            <button
                onClick={() => onOfferClick(offer.destination)}
                className={`w-full text-left rounded-lg px-3.5 py-3 transition-colors ${
                    isRejected
                        ? 'bg-red-500/10 border border-red-500/30 hover:border-red-500'
                        : 'bg-brand hover:bg-brand-hover'
                }`}
                aria-label={`제안받기 — ${offer.message}`}
            >
                <span className="flex items-center gap-1.5">
                    <span className={`text-[15px] font-bold ${isRejected ? 'text-red-600' : 'text-black'}`}>
                        제안받기
                    </span>
                    {offer.badge && (
                        <span
                            className={`text-[10px] font-bold rounded px-1.5 py-0.5 tracking-wide ${
                                isRejected
                                    ? 'text-red-600 border border-red-500/40'
                                    : 'bg-black text-brand'
                            }`}
                        >
                            {offer.badge}
                        </span>
                    )}
                </span>
                <span className={`block text-xs mt-1 ${isRejected ? 'text-red-600' : 'text-black/70'}`}>
                    {offer.message}
                </span>
            </button>
        </section>
    );
}
