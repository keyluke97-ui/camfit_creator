// OfferCard.tsx - 제안 수신함 목록 카드 (지명형 1b — Phase C1)
'use client';

import { formatRemaining } from '@/lib/offerRules';
import { OFFER_STATUS_ACCEPTED } from '@/lib/constants';
import type { Offer } from '@/types';

interface OfferCardProps {
    offer: Offer;
    now: number;
    /** 아직 열어보지 않은 제안 — 기기 로컬 기록 기준 (lib/offerSeen) */
    isNew: boolean;
    onOpen: (offer: Offer) => void;
}

/**
 * 목록 카드. 훑어보는 화면이라 **판단에 필요한 것만** 싣는다 —
 * 어디서, 얼마에, 언제까지. 조건 전문은 상세에서 본다.
 *
 * 마감 임박(24시간 미만)은 색으로 구분한다. 확인 창이 2영업일이라
 * 하루가 남았다는 건 사실상 마지막 날이라는 뜻이다.
 */
export default function OfferCard({ offer, now, isNew, onOpen }: OfferCardProps) {
    const isAccepted = offer.status === OFFER_STATUS_ACCEPTED;
    const remaining = offer.deadline === null ? Infinity : offer.deadline - now;
    const isExpired = !isAccepted && Number.isFinite(remaining) && remaining <= 0;
    const isUrgent = !isAccepted && Number.isFinite(remaining) && remaining > 0 && remaining < 24 * 3_600_000;

    return (
        <button
            type="button"
            onClick={() => onOpen(offer)}
            className={`w-full text-left bg-card border rounded-xl p-4 flex flex-col gap-3 transition-colors ${
                isNew ? 'border-brand shadow-[0_0_0_3px_rgba(1,223,130,0.12)]' : 'border-line hover:border-brand'
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                        {isNew && (
                            <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand text-black tracking-wide">
                                NEW
                            </span>
                        )}
                        <p className="text-base font-bold text-ink truncate">{offer.accommodationName || '캠핑장'}</p>
                    </div>
                    {offer.region && <p className="text-xs text-ink3 mt-0.5">{offer.region}</p>}
                </div>
                {isAccepted ? (
                    <span className="shrink-0 text-[11px] font-medium px-2 py-1 rounded-full bg-brand-bg text-brand-strong border border-brand/30">
                        수락 완료
                    </span>
                ) : isExpired ? (
                    <span className="shrink-0 text-[11px] font-medium px-2 py-1 rounded-full bg-subtle text-ink3 border border-line">
                        마감된 제안
                    </span>
                ) : (
                    <span className="shrink-0 text-[11px] font-medium px-2 py-1 rounded-full bg-brand-bg text-brand-strong border border-brand/30">
                        회신 대기
                    </span>
                )}
            </div>

            <div className="bg-subtle rounded-lg px-3 py-2.5 flex items-baseline justify-between">
                <span className="text-xs text-ink2">협찬 금액</span>
                <span className="text-lg font-bold text-ink">
                    {offer.amount.toLocaleString()}<span className="text-sm font-medium text-ink2 ml-0.5">원</span>
                </span>
            </div>

            {isAccepted ? (
                <p className="text-xs text-brand-strong font-medium">예약용 쿠폰 코드를 확인하세요</p>
            ) : isExpired ? (
                <p className="text-xs text-ink3">회신 기한이 지났어요</p>
            ) : offer.deadline === null ? (
                <p className="text-xs text-ink2">회신해주시면 매칭이 확정돼요</p>
            ) : (
                <p className={`text-xs font-medium ${isUrgent ? 'text-red-500' : 'text-ink2'}`}>
                    회신 기한 {formatRemaining(remaining)}
                </p>
            )}
        </button>
    );
}
