// PartnerApplicationModal.tsx - 파트너 캠페인 신청 모달 (4단계 정책 확인 → 리뷰 → 제출)
'use client';

import { useState, useRef } from 'react';
import type { PartnerCampaign } from '@/types';

interface PartnerApplicationModalProps {
    isOpen: boolean;
    onClose: () => void;
    campaign: PartnerCampaign;
    onApplySuccess: () => void;
}

type ModalStep = 'policy1' | 'policy2' | 'policy3' | 'policy4' | 'review' | 'success' | 'error';

const KAKAO_CHANNEL_URL = 'http://pf.kakao.com/_fBxaQG';

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

    const resetModal = () => {
        setStep('policy1');
        setPolicyChecked(false);
        setCheckInDate('');
        setCheckInSite('');
        setErrorMessage('');
        isSubmittingRef.current = false;
    };

    const handleClose = () => {
        resetModal();
        onClose();
    };

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
                setStep('success');
                onApplySuccess();
            } else {
                setErrorMessage(data.error || '신청 중 오류가 발생했습니다.');
                setStep('error');
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

                    {/* Step 3: 취소/변경 정책 확인 */}
                    {step === 'policy3' && (
                        <div className="space-y-4">
                            <div className="bg-[#252525] border border-[#3A3A3A] rounded-lg p-4 space-y-2">
                                <p className="text-sm font-semibold text-white">취소/변경 정책</p>
                                <p className="text-sm text-[#B0B0B0]">
                                    캠지기는 매칭 후 취소/변경이 불가합니다.
                                </p>
                                <p className="text-sm text-[#B0B0B0]">
                                    크리에이터는 방문일 전까지 취소/변경이 가능합니다.
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
                                    위 취소/변경 정책을 확인하고 동의합니다.
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

                    {/* 성공 */}
                    {step === 'success' && (
                        <div className="text-center py-6 space-y-4">
                            <div className="text-5xl">🎉</div>
                            <p className="text-lg font-bold text-white">파트너 협찬 신청이 완료되었습니다!</p>
                            <p className="text-sm text-[#B0B0B0]">
                                쿠폰 코드는 운영팀 확인 후 포털에서 확인할 수 있습니다.
                            </p>
                            <button
                                onClick={handleClose}
                                className="w-full h-12 bg-[#01DF82] text-black font-bold rounded-lg hover:bg-[#00C972] transition-colors"
                            >
                                확인
                            </button>
                        </div>
                    )}

                    {/* 에러 */}
                    {step === 'error' && (
                        <div className="text-center py-6 space-y-4">
                            <div className="text-5xl">😥</div>
                            <p className="text-lg font-bold text-white">{errorMessage}</p>
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
