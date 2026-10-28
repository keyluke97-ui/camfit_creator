// OfferDetailModal.tsx - 제안 상세 + 수락/거절 (지명형 1b — Phase C2·C6)
'use client';

import { useEffect, useState } from 'react';
import { formatRemaining } from '@/lib/offerRules';
import { OFFER_STATUS_ACCEPTED, buildCouponDeepLink, formatDiscount, COUPON_APPLY_DAYS_CONFIG } from '@/lib/constants';
import type { Offer, CouponApplyDays } from '@/types';
import OfferRejectForm from './OfferRejectForm';

interface OfferDetailModalProps {
    offer: Offer | null;
    now: number;
    saving: boolean;
    errorMessage: string;
    onClose: () => void;
    onAccept: (offer: Offer) => void;
    onReject: (offer: Offer, reason: string, detail: string) => void;
}

type Step = 'detail' | 'confirmAccept' | 'reject';

/** 조건 한 줄 */
function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-3 py-2 border-b border-line last:border-b-0">
            <span className="text-xs text-ink3 shrink-0">{label}</span>
            <span className="text-sm text-ink text-right">{value}</span>
        </div>
    );
}

/**
 * 제안 상세.
 *
 * ⚠️ **`제안서 전문`은 그대로 보여준다.** 다시 쓰지 않는다 — 계약서 §4.3에 따라
 *    "그런 조건인 줄 몰랐다"에 대응하려면 그 사람이 본 문장이 남아 있어야 한다.
 *    위쪽 조건 요약은 훑어보기용이고, 원문을 대체하지 않는다.
 *
 * ⚠️ **담당자 연락처·이메일은 표시하지 않는다.** 매칭 확정 전 비공개 원칙이라
 *    애초에 API 응답에도 담기지 않는다(verify-contract가 매핑 여부를 검사한다).
 *
 * ⚠️ **쿠폰 코드는 `확정` 상태에서만 보인다.** 확인 창 단계에서는 서버가 빈 문자열을 준다 —
 *    거절한 사람이 코드를 본 적이 없어야 그 코드를 다음 제안에 재배포할 수 있다(Q2).
 */
// 제안이 바뀌면 부모가 `key`로 리마운트시킨다 — 단계·복사 상태가 자동으로 초기화된다.
// 이펙트에서 setState로 되돌리면 렌더가 한 번 더 돌고, React 19 린트도 이를 막는다.
export default function OfferDetailModal({
    offer, now, saving, errorMessage, onClose, onAccept, onReject,
}: OfferDetailModalProps) {
    const [step, setStep] = useState<Step>('detail');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        document.body.style.overflow = offer ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [offer]);

    if (!offer) return null;

    const isAccepted = offer.status === OFFER_STATUS_ACCEPTED;
    const remaining = offer.deadline === null ? Infinity : offer.deadline - now;
    const isExpired = !isAccepted && Number.isFinite(remaining) && remaining <= 0;
    const canAct = !isAccepted && !isExpired;

    const nights = offer.minNights && offer.maxNights
        ? (offer.minNights === offer.maxNights ? `${offer.minNights}박` : `${offer.minNights}~${offer.maxNights}박`)
        : offer.minNights ? `${offer.minNights}박 이상` : '';
    const applyDaysLabel = COUPON_APPLY_DAYS_CONFIG[offer.couponApplyDays as CouponApplyDays]?.label || offer.couponApplyDays;

    const copyCode = async () => {
        try {
            await navigator.clipboard.writeText(offer.creatorCouponCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
            <div
                className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-card rounded-t-2xl sm:rounded-2xl p-5 flex flex-col gap-4"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-ink truncate">{offer.accommodationName || '캠핑장'}</h2>
                        {offer.region && <p className="text-xs text-ink3 mt-0.5">{offer.region}</p>}
                    </div>
                    <button type="button" onClick={onClose} className="text-ink3 text-xl leading-none px-1" aria-label="닫기">×</button>
                </div>

                {step === 'detail' && (
                    <>
                        <div className="bg-brand-bg border border-brand/30 rounded-lg px-4 py-3 flex items-baseline justify-between">
                            <span className="text-xs text-brand-strong font-medium">협찬 금액</span>
                            <span className="text-xl font-bold text-ink">{offer.amount.toLocaleString()}원</span>
                        </div>

                        {isAccepted ? (
                            <div className="bg-subtle border border-line rounded-lg p-4 flex flex-col gap-2">
                                <p className="text-sm font-bold text-ink">수락하신 제안이에요</p>
                                {offer.creatorCouponCode ? (
                                    <>
                                        <p className="text-xs text-ink2">아래 쿠폰으로 직접 예약해주세요.</p>
                                        <div className="bg-card border border-line rounded-lg px-3 py-2.5 flex items-center justify-between gap-2">
                                            <code className="text-sm font-bold text-ink break-all">{offer.creatorCouponCode}</code>
                                            <button
                                                type="button"
                                                onClick={copyCode}
                                                className="shrink-0 text-xs font-medium px-2.5 py-1.5 rounded-md bg-brand text-black hover:bg-brand-hover transition-colors"
                                            >
                                                {copied ? '복사됨' : '복사'}
                                            </button>
                                        </div>
                                        <a
                                            href={buildCouponDeepLink(offer.creatorCouponCode)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-brand-strong font-medium underline"
                                        >
                                            쿠폰 등록하러 가기
                                        </a>
                                    </>
                                ) : (
                                    <p className="text-xs text-ink2">쿠폰이 발행되는 중이에요. 잠시 후 다시 확인해주세요.</p>
                                )}
                            </div>
                        ) : isExpired ? (
                            <div className="bg-subtle border border-line rounded-lg p-3">
                                <p className="text-xs text-ink2">회신 기한이 지났어요. 궁금하신 점은 카카오톡 채널로 문의해주세요.</p>
                            </div>
                        ) : (
                            <div className="bg-subtle border border-line rounded-lg p-3">
                                <p className="text-xs text-ink2">
                                    회신 기한 <b className="text-ink">{offer.deadline === null ? '없음' : formatRemaining(remaining)}</b>
                                    {' · '}수락하시면 예약용 쿠폰 코드를 보여드려요.
                                </p>
                            </div>
                        )}

                        <div className="border border-line rounded-lg px-4 py-1">
                            {offer.siteTypes.length > 0 && <Row label="협찬 사이트" value={offer.siteTypes.join(' · ')} />}
                            {offer.visitStartDate && offer.visitEndDate && (
                                <Row label="방문 가능 기간" value={`${offer.visitStartDate} ~ ${offer.visitEndDate}`} />
                            )}
                            {offer.visitDays > 0 && <Row label="숙박 일수" value={`${offer.visitDays}일`} />}
                            {offer.couponDiscount > 0 && (
                                <Row label="팔로워 쿠폰" value={`${formatDiscount(offer.couponDiscount)}${applyDaysLabel ? ` · ${applyDaysLabel}` : ''}`} />
                            )}
                            {offer.couponPerPerson > 0 && <Row label="인당 쿠폰 장수" value={`${offer.couponPerPerson}장`} />}
                            {nights && <Row label="예약 조건" value={`${nights} 예약에 사용`} />}
                        </div>

                        {offer.accommodationUrl && (
                            <a
                                href={offer.accommodationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full h-11 flex items-center justify-center bg-subtle border border-line rounded-lg text-sm font-medium text-ink hover:border-strong transition-colors"
                            >
                                캠핑장 둘러보기
                            </a>
                        )}

                        {offer.message && (
                            <div>
                                <p className="text-xs font-medium text-ink2 mb-1.5">캠지기 메시지</p>
                                <p className="text-sm text-ink whitespace-pre-wrap bg-subtle rounded-lg p-3 leading-relaxed">{offer.message}</p>
                            </div>
                        )}

                        {offer.proposalText && (
                            <div>
                                <p className="text-xs font-medium text-ink2 mb-1.5">제안서 전문</p>
                                <p className="text-sm text-ink whitespace-pre-wrap bg-subtle rounded-lg p-3 leading-relaxed">{offer.proposalText}</p>
                            </div>
                        )}

                        {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}

                        {canAct && (
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setStep('reject')}
                                    disabled={saving}
                                    className="flex-1 h-12 bg-subtle text-ink font-bold rounded-lg border border-line hover:border-strong transition-colors disabled:opacity-60"
                                >
                                    거절하기
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStep('confirmAccept')}
                                    disabled={saving}
                                    className="flex-1 h-12 bg-brand text-black font-bold rounded-lg hover:bg-brand-hover transition-colors disabled:opacity-60"
                                >
                                    수락하기
                                </button>
                            </div>
                        )}
                    </>
                )}

                {step === 'confirmAccept' && (
                    <div className="flex flex-col gap-4">
                        <div>
                            <p className="text-sm font-bold text-ink mb-1">이 조건으로 수락하시겠어요?</p>
                            <p className="text-xs text-ink2">수락하면 매칭이 확정되고, 캠지기에게 바로 전달돼요.</p>
                        </div>
                        <ul className="flex flex-col gap-2 bg-subtle rounded-lg p-4 text-xs text-ink2 leading-relaxed">
                            <li>· 협찬 금액과 조건은 제안서에 적힌 그대로 확정돼요</li>
                            <li>· 예약용 쿠폰 코드는 수락 후에 이 화면에서 보여드려요</li>
                            <li>· 등록하신 채널 전부에 콘텐츠를 올리는 조건이에요</li>
                            <li>· 확정 후 취소는 캠핏에 문의가 필요해요</li>
                        </ul>
                        {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setStep('detail')}
                                disabled={saving}
                                className="flex-1 h-12 bg-subtle text-ink font-bold rounded-lg border border-line hover:border-strong transition-colors disabled:opacity-60"
                            >
                                돌아가기
                            </button>
                            <button
                                type="button"
                                onClick={() => onAccept(offer)}
                                disabled={saving}
                                className="flex-1 h-12 bg-brand text-black font-bold rounded-lg hover:bg-brand-hover transition-colors disabled:opacity-60"
                            >
                                {saving ? '처리 중...' : '수락 확정'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 'reject' && (
                    <>
                        {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}
                        <OfferRejectForm
                            saving={saving}
                            onCancel={() => setStep('detail')}
                            onSubmit={(reason, detail) => onReject(offer, reason, detail)}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
