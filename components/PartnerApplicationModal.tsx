// PartnerApplicationModal.tsx - 파트너 캠페인 신청 모달 (4단계 정책 확인 → 리뷰 → 제출)
// CHANGED: 정책 문구 8개 추가 + 쿠폰 즉시 발급 + 409 마감 자동 새로고침 (A2)
'use client';

import { useState, useRef, useEffect } from 'react';
import type { PartnerCampaign } from '@/types';
import PartnerCouponDisplay from './PartnerCouponDisplay';

interface PartnerApplicationModalProps {
    isOpen: boolean;
    onClose: () => void;
    campaign: PartnerCampaign;
    onApplySuccess: () => void;
}

type ModalStep = 'policy1' | 'policy2' | 'policy3' | 'policy4' | 'review' | 'success' | 'error';

const KAKAO_CHANNEL_URL = 'http://pf.kakao.com/_fBxaQG';
const CAMFIT_COUPON_URL = 'https://camfit.co.kr/mypage/coupon';

export default function PartnerApplicationModal({
    isOpen,
    onClose,
    campaign,
    onApplySuccess
}: PartnerApplicationModalProps) {
    const [step, setStep] = useState<ModalStep>('policy1');
    const [policyChecked, setPolicyChecked] = useState(false);
    const [checkInDate, setCheckInDate] = useState('');
    const [checkInSite, setCheckInSite] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const isSubmittingRef = useRef(false);
    // CHANGED: 쿠폰 코드 state 추가 (A2-9)
    const [couponCodes, setCouponCodes] = useState({ creator: '', follower: '' });
    // CHANGED: 마감 에러 자동 닫기용 (A2-10)
    const [isClosedError, setIsClosedError] = useState(false);

    const resetModal = () => {
        setStep('policy1');
        setPolicyChecked(false);
        setCheckInDate('');
        setCheckInSite('');
        setErrorMessage('');
        isSubmittingRef.current = false;
        setCouponCodes({ creator: '', follower: '' });
        setIsClosedError(false);
    };

    const handleClose = () => {
        resetModal();
        onClose();
    };

    // CHANGED: 마감 에러 자동 새로고침 (A2-10)
    useEffect(() => {
        if (isClosedError) {
            const timer = setTimeout(() => {
                handleClose();
                onApplySuccess();
            }, 2000);
            return () => clearTimeout(timer);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isClosedError]);

    const handleSubmit = async () => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;

        try {
            const response = await fetch('/api/partner/campaigns/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    campaignId: campaign.id,
                    checkInDate,
                    checkInSite
                })
            });

            const data = await response.json();

            if (response.ok) {
                // CHANGED: 쿠폰 코드 저장 (A2-9)
                setCouponCodes({
                    creator: data.creatorCouponCode || '',
                    follower: data.followerCouponCode || ''
                });
                setStep('success');
                onApplySuccess();
            } else {
                // CHANGED: 409 마감 에러 감지 (A2-10)
                if (response.status === 409 && data.error?.includes('마감')) {
                    setErrorMessage('파트너 협찬이 마감되었습니다.');
                    setIsClosedError(true);
                    setStep('error');
                } else {
                    setErrorMessage(data.error || '신청 중 오류가 발생했습니다.');
                    setStep('error');
                }
            }
        } catch (error) {
            console.error('Partner apply error:', error);
            setErrorMessage('네트워크 오류가 발생했습니다.');
            setStep('error');
        } finally {
            isSubmittingRef.current = false;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <div className="absolute inset-0 bg-black/60" onClick={handleClose} />

            <div className="relative w-full max-w-md bg-[#1E1E1E] rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto">
                {/* 헤더 */}
                <div className="sticky top-0 bg-[#1E1E1E] border-b border-[#333333] px-5 py-4 flex items-center justify-between z-10">
                    <h2 className="text-lg font-bold text-white">
                        {step === 'success' ? '신청 완료' : step === 'error' ? '신청 실패' : '파트너 협찬 신청'}
                    </h2>
                    <button onClick={handleClose} className="text-[#666666] hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-5">
                    {/* Step 1: 방문 가능 기간 확인 */}
                    {step === 'policy1' && (
                        <div className="space-y-4">
                            <div className="bg-[#252525] border border-[#3A3A3A] rounded-lg p-4">
                                <p className="text-sm text-[#9CA3AF] mb-1">방문 가능 기간</p>
                                <p className="text-base font-semibold text-white">
                                    {campaign.visitStartDate} ~ {campaign.visitEndDate}
                                </p>
                            </div>
                            {/* CHANGED: 매칭 즉시 완료 안내 추가 (A2-1) */}
                            <div className="bg-[#252525] border border-[#3A3A3A] rounded-lg p-4">
                                <p className="text-sm text-[#B0B0B0]">
                                    신청한 시점을 기준으로 즉시 <span className="text-white font-semibold">&lsquo;매칭 완료&rsquo;</span>로 간주됩니다.
                                </p>
                            </div>
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={policyChecked}
                                    onChange={(event) => setPolicyChecked(event.target.checked)}
                                    className="mt-0.5 w-5 h-5 rounded accent-[#01DF82]"
                                />
                                <span className="text-sm text-[#B0B0B0]">
                                    이 기간 내에 방문 가능합니다.
                                </span>
                            </label>
                            <button
                                onClick={() => { setPolicyChecked(false); setStep('policy2'); }}
                                disabled={!policyChecked}
                                className="w-full h-12 bg-[#01DF82] text-black font-bold rounded-lg hover:bg-[#00C972] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                다음
                            </button>
                        </div>
                    )}

                    {/* Step 2: 쿠폰 유효기간 확인 */}
                    {step === 'policy2' && (
                        <div className="space-y-4">
                            <div className="bg-[#252525] border border-[#3A3A3A] rounded-lg p-4">
                                <p className="text-sm text-[#9CA3AF] mb-1">팔로워 쿠폰 유효기간</p>
                                <p className="text-base font-semibold text-white">
                                    {campaign.couponStartDate} ~ {campaign.couponEndDate}
                                </p>
                            </div>
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={policyChecked}
                                    onChange={(event) => setPolicyChecked(event.target.checked)}
                                    className="mt-0.5 w-5 h-5 rounded accent-[#01DF82]"
                                />
                                <span className="text-sm text-[#B0B0B0]">
                                    팔로워 쿠폰이 이 기간에만 사용 가능함을 확인했습니다.
                                </span>
                            </label>
                            <button
                                onClick={() => { setPolicyChecked(false); setStep('policy3'); }}
                                disabled={!policyChecked}
                                className="w-full h-12 bg-[#01DF82] text-black font-bold rounded-lg hover:bg-[#00C972] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                다음
                            </button>
                        </div>
                    )}

                    {/* Step 3: 취소/변경 + 노쇼 + 콘텐츠 + 저작권 정책 통합 확인 */}
                    {/* CHANGED: 정책 문구 A2-2 ~ A2-7 추가 */}
                    {step === 'policy3' && (
                        <div className="space-y-4">
                            <div className="bg-[#252525] border border-[#3A3A3A] rounded-lg p-4 space-y-3">
                                <p className="text-sm font-semibold text-white">취소/변경 정책</p>
                                <p className="text-sm text-[#B0B0B0]">
                                    캠지기는 매칭 후 취소/변경이 불가합니다.
                                </p>
                                <p className="text-sm text-[#B0B0B0]">
                                    크리에이터는 방문일 전까지 취소/변경이 가능합니다.
                                </p>
                                {/* A2-2: 취소 시 금전적 손해 경고 */}
                                <p className="text-sm text-[#B0B0B0]">
                                    취소 시 해당 일정 예약 불가로 인해 캠핑장 사업주에게 <span className="text-yellow-400 font-medium">실질적인 금전적 손해</span>가 발생합니다.
                                </p>
                                {/* A2-3: 노쇼 처리 안내 */}
                                <p className="text-sm text-[#B0B0B0]">
                                    노쇼(No-show) 또는 당일 취소 시 협찬은 무효 처리되며, 재방문 또는 보상은 제공되지 않습니다.
                                </p>
                            </div>

                            {/* 콘텐츠 제작 및 저작권 정책 */}
                            <div className="bg-[#252525] border border-[#3A3A3A] rounded-lg p-4 space-y-3">
                                <p className="text-sm font-semibold text-white">콘텐츠 제작 및 저작권</p>
                                {/* A2-4: 콘텐츠 제작 기한/페널티 */}
                                <p className="text-sm text-[#B0B0B0]">
                                    안내된 기한 내 콘텐츠 미제출 또는 반복 지연 시 향후 파트너 협찬 참여가 제한됩니다.
                                </p>
                                {/* A2-5: 저작권 및 활용 동의 */}
                                <p className="text-sm text-[#B0B0B0]">
                                    제작된 콘텐츠가 캠핏 및 해당 캠핑장의 홍보 목적으로 활용되는 것에 동의합니다. 활용 기간은 업로드일 기준 12개월입니다.
                                </p>
                                {/* A2-6: 삭제 금지 정책 */}
                                <p className="text-sm text-[#B0B0B0]">
                                    기간이 지난 과거 게시물에 대해 특별한 협의 없는 임의 삭제는 불가합니다.
                                </p>
                            </div>

                            {/* A2-7: 14일 자동취소 경고 */}
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                <p className="text-sm text-red-400 font-medium">
                                    🚨 최종 신청일로부터 14일 동안 예약하지 않을 시 자동 취소로 간주되며, 잦은 취소는 추후 파트너 협찬 참여가 어려울 수 있습니다.
                                </p>
                            </div>

                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={policyChecked}
                                    onChange={(event) => setPolicyChecked(event.target.checked)}
                                    className="mt-0.5 w-5 h-5 rounded accent-[#01DF82]"
                                />
                                <span className="text-sm text-[#B0B0B0]">
                                    위 정책을 모두 확인하고 동의합니다.
                                </span>
                            </label>
                            <button
                                onClick={() => { setPolicyChecked(false); setStep('policy4'); }}
                                disabled={!policyChecked}
                                className="w-full h-12 bg-[#01DF82] text-black font-bold rounded-lg hover:bg-[#00C972] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                다음
                            </button>
                        </div>
                    )}

                    {/* Step 4: 입실 희망일 + 사이트 입력 */}
                    {step === 'policy4' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-[#9CA3AF] mb-1.5">입실 희망일</label>
                                <input
                                    type="date"
                                    value={checkInDate}
                                    min={campaign.visitStartDate}
                                    max={campaign.visitEndDate}
                                    onChange={(event) => setCheckInDate(event.target.value)}
                                    className="w-full h-12 bg-[#252525] border border-[#3A3A3A] rounded-lg px-4 text-white focus:border-[#01DF82] outline-none transition-colors"
                                />
                                <p className="text-xs text-[#666666] mt-1">
                                    {campaign.visitStartDate} ~ {campaign.visitEndDate} 내 선택
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm text-[#9CA3AF] mb-1.5">입실 사이트</label>
                                <input
                                    type="text"
                                    value={checkInSite}
                                    onChange={(event) => setCheckInSite(event.target.value)}
                                    placeholder="예: A-1, 오토캠핑 3번"
                                    className="w-full h-12 bg-[#252525] border border-[#3A3A3A] rounded-lg px-4 text-white placeholder:text-[#555555] focus:border-[#01DF82] outline-none transition-colors"
                                />
                            </div>
                            <button
                                onClick={() => setStep('review')}
                                disabled={!checkInDate || !checkInSite}
                                className="w-full h-12 bg-[#01DF82] text-black font-bold rounded-lg hover:bg-[#00C972] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                최종 확인
                            </button>
                        </div>
                    )}

                    {/* 최종 리뷰 */}
                    {step === 'review' && (
                        <div className="space-y-4">
                            <div className="bg-[#252525] border border-[#3A3A3A] rounded-lg p-4 space-y-3">
                                <ReviewRow label="캠핑장" value={campaign.accommodationName} />
                                <ReviewRow label="패키지" value={campaign.packageType} />
                                <ReviewRow label="평일 할인" value={`${campaign.weekdayDiscount.toLocaleString()}원`} />
                                {campaign.weekendDiscount > 0 && (
                                    <ReviewRow label="주말 할인" value={`${campaign.weekendDiscount.toLocaleString()}원`} />
                                )}
                                <ReviewRow label="방문 기간" value={`${campaign.visitStartDate} ~ ${campaign.visitEndDate}`} />
                                <ReviewRow label="입실 희망일" value={checkInDate} />
                                <ReviewRow label="입실 사이트" value={checkInSite} />
                                <ReviewRow label="쿠폰 유효기간" value={`${campaign.couponStartDate} ~ ${campaign.couponEndDate}`} />
                            </div>

                            {/* CHANGED: 입실일 등록 필수 안내 (A2-8) */}
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                                <p className="text-xs text-yellow-400">
                                    입실일, 입실 사이트가 등록되지 않을 경우 일반 협찬으로 간주되어 원고료 지급이 어려울 수 있습니다.
                                </p>
                            </div>

                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                                <p className="text-xs text-yellow-400">
                                    예약 취소/변경은 카카오톡 채널로 문의해주세요.
                                </p>
                            </div>

                            <button
                                onClick={handleSubmit}
                                className="w-full h-12 bg-[#01DF82] text-black font-bold rounded-lg hover:bg-[#00C972] transition-colors"
                            >
                                신청하기
                            </button>
                        </div>
                    )}

                    {/* CHANGED: 성공 화면 전면 개편 — 쿠폰 즉시 발급 (A2-9) */}
                    {step === 'success' && (
                        <div className="py-4 space-y-5">
                            <div className="text-center">
                                <div className="text-5xl mb-3">🎉</div>
                                <p className="text-lg font-bold text-white">파트너 협찬 신청이 완료되었습니다!</p>
                            </div>

                            {/* 크리에이터 쿠폰 코드 */}
                            {couponCodes.creator ? (
                                <PartnerCouponDisplay
                                    label="크리에이터 쿠폰 코드"
                                    couponCode={couponCodes.creator}
                                />
                            ) : (
                                <div className="bg-[#252525] border border-[#3A3A3A] rounded-lg p-4 text-center">
                                    <p className="text-sm text-[#9CA3AF]">
                                        쿠폰 코드는 운영팀 확인 후 포털에서 확인할 수 있습니다.
                                    </p>
                                </div>
                            )}

                            {/* 팔로워 쿠폰 코드 */}
                            {couponCodes.follower && (
                                <PartnerCouponDisplay
                                    label="팔로워 쿠폰 코드"
                                    couponCode={couponCodes.follower}
                                />
                            )}

                            {/* 캠핏 쿠폰 등록 CTA */}
                            {couponCodes.creator && (
                                <a
                                    href={CAMFIT_COUPON_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full h-12 flex items-center justify-center bg-[#01DF82] text-black font-bold rounded-lg hover:bg-[#00C972] transition-colors"
                                >
                                    캠핏 쿠폰 등록하러 가기 →
                                </a>
                            )}

                            {/* 입실일 등록 안내 */}
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                                <p className="text-sm text-blue-400">
                                    📢 잊지 마세요! 예약 완료 후 꼭 다시 돌아와서 입실일 등록을 해주셔야 정산이 가능합니다.
                                </p>
                            </div>

                            <button
                                onClick={handleClose}
                                className="w-full h-12 bg-[#2A2A2A] text-white font-medium rounded-lg hover:bg-[#333333] transition-colors"
                            >
                                닫기
                            </button>
                        </div>
                    )}

                    {/* 에러 */}
                    {step === 'error' && (
                        <div className="text-center py-6 space-y-4">
                            <div className="text-5xl">😥</div>
                            {/* CHANGED: 에러 애니메이션 (A2-11) */}
                            <p className="text-lg font-bold text-white animate-pulse">{errorMessage}</p>
                            {/* CHANGED: 마감 에러 시 자동 닫기 안내 (A2-10) */}
                            {isClosedError ? (
                                <p className="text-sm text-[#9CA3AF]">잠시 후 자동으로 닫힙니다...</p>
                            ) : (
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleClose}
                                        className="flex-1 h-12 bg-[#2A2A2A] text-white font-medium rounded-lg hover:bg-[#333333] transition-colors"
                                    >
                                        닫기
                                    </button>
                                    <a
                                        href={KAKAO_CHANNEL_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 h-12 flex items-center justify-center bg-[#FEE500] text-[#3C1E1E] font-bold rounded-lg hover:bg-[#FFDA00] transition-colors"
                                    >
                                        카카오톡 문의
                                    </a>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * 리뷰 화면의 레이블-값 행
 */
function ReviewRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between items-start">
            <span className="text-sm text-[#9CA3AF] shrink-0">{label}</span>
            <span className="text-sm text-white text-right ml-4">{value}</span>
        </div>
    );
}
