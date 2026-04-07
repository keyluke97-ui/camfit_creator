// PartnerApplicationModal.tsx - 파트너 캠페인 신청 모달
// CHANGED: 체크박스→텍스트입력, 입실 정보를 성공 화면으로 이동, 쿠폰 조건/사이트 종류 표시
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { PartnerCampaign } from '@/types';
import PartnerCouponDisplay from './PartnerCouponDisplay';

/**
 * 전체 협찬 정보를 카카오톡 복붙용 텍스트로 생성
 */
function buildCopyText(campaign: PartnerCampaign, couponCodes: { creator: string; follower: string }, perPersonCoupon: number): string {
    const lines = [
        `[캠핏 파트너 협찬 안내]`,
        ``,
        `📍 ${campaign.accommodationName}`,
        `📦 패키지: ${campaign.packageType}`,
        ``,
        `🎫 크리에이터 쿠폰 코드: ${couponCodes.creator || '(운영팀 확인 후 발급)'}`,
        ...(couponCodes.follower ? [`🎫 팔로워 쿠폰 코드: ${couponCodes.follower}`] : []),
        ``,
        `📅 방문 기간: ${campaign.visitStartDate} ~ ${campaign.visitEndDate}`,
        `🎫 쿠폰 유효기간: ${campaign.couponStartDate} ~ ${campaign.couponEndDate}`,
        `💰 팔로워 할인: 평일 ${campaign.weekdayDiscount.toLocaleString()}원${campaign.weekendDiscount > 0 ? ` / 주말 ${campaign.weekendDiscount.toLocaleString()}원` : ''}`,
        `🎟️ 1인당 팔로워 쿠폰: ${perPersonCoupon}장`,
        ``,
        `👉 캠핏 쿠폰 등록: https://camfit.co.kr/mypage/coupon`,
    ];
    return lines.join('\n');
}

interface PartnerApplicationModalProps {
    isOpen: boolean;
    onClose: () => void;
    campaign: PartnerCampaign;
    onApplySuccess: () => void;
}

// CHANGED: policy4(입실 정보) 제거 → 성공 화면에서 처리, checkin 단계 추가
type ModalStep = 'policy1' | 'policy2' | 'policy3' | 'review' | 'success' | 'checkin' | 'checkinSuccess' | 'error';

const KAKAO_CHANNEL_URL = 'http://pf.kakao.com/_fBxaQG';
const CAMFIT_COUPON_URL = 'https://camfit.co.kr/mypage/coupon';

export default function PartnerApplicationModal({
    isOpen,
    onClose,
    campaign,
    onApplySuccess
}: PartnerApplicationModalProps) {
    const [step, setStep] = useState<ModalStep>('policy1');
    // CHANGED: 체크박스 → 텍스트 입력 ('가능'/'동의')
    const [confirmInput, setConfirmInput] = useState('');
    const [checkInDate, setCheckInDate] = useState('');
    const [checkInSite, setCheckInSite] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const isSubmittingRef = useRef(false);
    const [couponCodes, setCouponCodes] = useState({ creator: '', follower: '' });
    const [isClosedError, setIsClosedError] = useState(false);
    // CHANGED: 전체 복사 버튼용 state
    const [allCopied, setAllCopied] = useState(false);

    const resetModal = () => {
        setStep('policy1');
        setConfirmInput('');
        setCheckInDate('');
        setCheckInSite('');
        setErrorMessage('');
        isSubmittingRef.current = false;
        setCouponCodes({ creator: '', follower: '' });
        setIsClosedError(false);
        setAllCopied(false);
    };

    const handleClose = () => {
        resetModal();
        onClose();
    };

    // 마감 에러 자동 새로고침 (A2-10)
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

    // CHANGED: 입실 정보 없이 신청
    const handleSubmit = async () => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;

        try {
            const response = await fetch('/api/partner/campaigns/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ campaignId: campaign.id })
            });

            const data = await response.json();

            if (response.ok) {
                setCouponCodes({
                    creator: data.creatorCouponCode || '',
                    follower: data.followerCouponCode || ''
                });
                setStep('success');
                onApplySuccess();
            } else {
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

    // CHANGED: 성공 화면에서 입실 정보 등록
    const handleCheckinSubmit = async () => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;

        try {
            // 신청 목록에서 가장 최근 신청을 조회하여 recordId 획득
            const listResponse = await fetch('/api/partner/applications/my');
            const listData = await listResponse.json();
            const myApps = listData.applications || [];
            const latestApp = myApps.find(
                (app: { campaignId: string }) => app.campaignId === campaign.id
            );

            if (!latestApp) {
                setErrorMessage('신청 내역을 찾을 수 없습니다.');
                return;
            }

            const response = await fetch('/api/partner/applications/checkin', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recordId: latestApp.id,
                    checkInDate,
                    checkInSite
                })
            });

            if (response.ok) {
                setStep('checkinSuccess');
            } else {
                const data = await response.json();
                setErrorMessage(data.error || '등록 중 오류가 발생했습니다.');
            }
        } catch (error) {
            console.error('Partner checkin submit error:', error);
            setErrorMessage('네트워크 오류가 발생했습니다.');
        } finally {
            isSubmittingRef.current = false;
        }
    };

    // CHANGED: 1인당 팔로워 쿠폰 수 계산 (팔로워쿠폰수 / 총모집인원, 정수 절삭)
    const perPersonCoupon = campaign.totalRecruitCount > 0
        ? Math.floor(campaign.followerCouponCount / campaign.totalRecruitCount)
        : 0;

    // CHANGED: 전체 정보 복사 핸들러
    const handleCopyAll = useCallback(async () => {
        const text = buildCopyText(campaign, couponCodes, perPersonCoupon);
        try {
            await navigator.clipboard.writeText(text);
            setAllCopied(true);
            setTimeout(() => setAllCopied(false), 2000);
        } catch {
            // fallback: textarea 방식
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setAllCopied(true);
            setTimeout(() => setAllCopied(false), 2000);
        }
    }, [campaign, couponCodes, perPersonCoupon]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <div className="absolute inset-0 bg-black/60" onClick={handleClose} />

            <div className="relative w-full max-w-md bg-[#1E1E1E] rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto">
                {/* 헤더 */}
                <div className="sticky top-0 bg-[#1E1E1E] border-b border-[#333333] px-5 py-4 flex items-center justify-between z-10">
                    <h2 className="text-lg font-bold text-white">
                        {step === 'success' || step === 'checkin' || step === 'checkinSuccess'
                            ? '신청 완료'
                            : step === 'error' ? '신청 실패' : '파트너 협찬 신청'}
                    </h2>
                    <button onClick={handleClose} className="text-[#666666] hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-5">
                    {/* Step 1: 방문 가능 기간 + 매칭 즉시 완료 안내 */}
                    {step === 'policy1' && (
                        <div className="space-y-4">
                            <div className="bg-[#252525] border border-[#3A3A3A] rounded-lg p-4">
                                <p className="text-sm text-[#9CA3AF] mb-1">크리에이터 방문 가능 기간</p>
                                <p className="text-base font-semibold text-white">
                                    {campaign.visitStartDate} ~ {campaign.visitEndDate}
                                </p>
                            </div>
                            <div className="bg-[#252525] border border-[#3A3A3A] rounded-lg p-4">
                                <p className="text-sm text-[#B0B0B0]">
                                    신청한 시점을 기준으로 즉시 <span className="text-white font-semibold">&lsquo;매칭 완료&rsquo;</span>로 간주됩니다.
                                </p>
                            </div>
                            {/* CHANGED: 체크박스 → '가능' 텍스트 입력 */}
                            <div>
                                <label className="block text-sm text-[#9CA3AF] mb-1.5">
                                    이 기간 내 방문이 가능하시면 <span className="text-white font-semibold">&lsquo;가능&rsquo;</span>을 입력해주세요
                                </label>
                                <input
                                    type="text"
                                    value={confirmInput}
                                    onChange={(event) => setConfirmInput(event.target.value)}
                                    placeholder="가능"
                                    className="w-full h-12 bg-[#252525] border border-[#3A3A3A] rounded-lg px-4 text-white placeholder:text-[#555555] focus:border-[#01DF82] outline-none transition-colors"
                                />
                            </div>
                            <button
                                onClick={() => { setConfirmInput(''); setStep('policy2'); }}
                                disabled={confirmInput !== '가능'}
                                className="w-full h-12 bg-[#01DF82] text-black font-bold rounded-lg hover:bg-[#00C972] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                다음
                            </button>
                        </div>
                    )}

                    {/* Step 2: 팔로워 쿠폰 조건 확인 */}
                    {/* CHANGED: 팔로워 방문 기간 + 쿠폰 조건 + 사이트 종류 표시 */}
                    {step === 'policy2' && (
                        <div className="space-y-4">
                            <div className="bg-[#252525] border border-[#3A3A3A] rounded-lg p-4 space-y-3">
                                <p className="text-sm font-semibold text-white">팔로워 쿠폰 안내</p>
                                <div>
                                    <p className="text-xs text-[#9CA3AF] mb-0.5">쿠폰 유효기간</p>
                                    <p className="text-sm font-semibold text-white">
                                        {campaign.couponStartDate} ~ {campaign.couponEndDate}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-[#9CA3AF] mb-0.5">1인당 팔로워 쿠폰</p>
                                    <p className="text-sm font-semibold text-white">{perPersonCoupon}장</p>
                                </div>
                                <div>
                                    <p className="text-xs text-[#9CA3AF] mb-0.5">할인 금액 (팔로워 쿠폰)</p>
                                    <p className="text-sm text-white">
                                        평일 {campaign.weekdayDiscount.toLocaleString()}원
                                        {campaign.weekendDiscount > 0 && ` / 주말 ${campaign.weekendDiscount.toLocaleString()}원`}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-[#9CA3AF] mb-0.5">적용 가능 요일</p>
                                    <p className="text-sm text-white">{campaign.stayType}</p>
                                    {campaign.holidayCouponApplied && (
                                        <p className="text-xs text-orange-400 mt-0.5">공휴일에도 쿠폰 사용 가능</p>
                                    )}
                                </div>
                                {/* CHANGED: 제공 가능한 사이트 종류 표시 */}
                                {campaign.siteTypes.length > 0 && (
                                    <div>
                                        <p className="text-xs text-[#9CA3AF] mb-0.5">적용 가능 존</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {campaign.siteTypes.map((type) => (
                                                <span key={type} className="px-2 py-0.5 text-xs bg-[#333333] text-[#B0B0B0] rounded">
                                                    {type}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* CHANGED: 체크박스 → '가능' 텍스트 입력 */}
                            <div>
                                <label className="block text-sm text-[#9CA3AF] mb-1.5">
                                    팔로워 쿠폰 조건을 확인하셨으면 <span className="text-white font-semibold">&lsquo;가능&rsquo;</span>을 입력해주세요
                                </label>
                                <input
                                    type="text"
                                    value={confirmInput}
                                    onChange={(event) => setConfirmInput(event.target.value)}
                                    placeholder="가능"
                                    className="w-full h-12 bg-[#252525] border border-[#3A3A3A] rounded-lg px-4 text-white placeholder:text-[#555555] focus:border-[#01DF82] outline-none transition-colors"
                                />
                            </div>
                            <button
                                onClick={() => { setConfirmInput(''); setStep('policy3'); }}
                                disabled={confirmInput !== '가능'}
                                className="w-full h-12 bg-[#01DF82] text-black font-bold rounded-lg hover:bg-[#00C972] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                다음
                            </button>
                        </div>
                    )}

                    {/* Step 3: 취소/변경 + 노쇼 + 콘텐츠 + 저작권 정책 */}
                    {/* CHANGED: '캠지기는~' 문구 삭제, 체크박스 → '동의' 텍스트 입력 */}
                    {step === 'policy3' && (
                        <div className="space-y-4">
                            <div className="bg-[#252525] border border-[#3A3A3A] rounded-lg p-4 space-y-2">
                                <p className="text-sm font-semibold text-white">취소/변경 정책</p>
                                <p className="text-sm text-[#B0B0B0]">
                                    방문일 전까지 취소/변경이 가능합니다.
                                </p>
                                <p className="text-sm text-[#B0B0B0]">
                                    취소 시 해당 일정 예약 불가로 인해 캠핑장 사업주에게 <span className="text-yellow-400 font-medium">실질적인 금전적 손해</span>가 발생합니다.
                                </p>
                                <p className="text-sm text-[#B0B0B0]">
                                    노쇼(No-show) 또는 당일 취소 시 협찬은 무효 처리되며, 재방문 또는 보상은 제공되지 않습니다.
                                </p>
                            </div>

                            <div className="bg-[#252525] border border-[#3A3A3A] rounded-lg p-4 space-y-2">
                                <p className="text-sm font-semibold text-white">콘텐츠 제작 및 저작권</p>
                                <p className="text-sm text-[#B0B0B0]">
                                    안내된 기한 내 콘텐츠 미제출 또는 반복 지연 시 향후 파트너 협찬 참여가 제한됩니다.
                                </p>
                                <p className="text-sm text-[#B0B0B0]">
                                    제작된 콘텐츠가 캠핏 및 해당 캠핑장의 홍보 목적으로 활용되는 것에 동의합니다. 활용 기간은 업로드일 기준 12개월입니다.
                                </p>
                                <p className="text-sm text-[#B0B0B0]">
                                    기간이 지난 과거 게시물에 대해 특별한 협의 없는 임의 삭제는 불가합니다.
                                </p>
                            </div>

                            {/* 14일 자동취소 경고 */}
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                <p className="text-sm text-red-400 font-medium">
                                    🚨 최종 신청일로부터 14일 동안 예약하지 않을 시 자동 취소로 간주되며, 잦은 취소는 추후 파트너 협찬 참여가 어려울 수 있습니다.
                                </p>
                            </div>

                            {/* CHANGED: 체크박스 → '동의' 텍스트 입력 */}
                            <div>
                                <label className="block text-sm text-[#9CA3AF] mb-1.5">
                                    위 정책에 동의하시면 <span className="text-white font-semibold">&lsquo;동의&rsquo;</span>를 입력해주세요
                                </label>
                                <input
                                    type="text"
                                    value={confirmInput}
                                    onChange={(event) => setConfirmInput(event.target.value)}
                                    placeholder="동의"
                                    className="w-full h-12 bg-[#252525] border border-[#3A3A3A] rounded-lg px-4 text-white placeholder:text-[#555555] focus:border-[#01DF82] outline-none transition-colors"
                                />
                            </div>
                            <button
                                onClick={() => { setConfirmInput(''); setStep('review'); }}
                                disabled={confirmInput !== '동의'}
                                className="w-full h-12 bg-[#01DF82] text-black font-bold rounded-lg hover:bg-[#00C972] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                다음
                            </button>
                        </div>
                    )}

                    {/* CHANGED: 최종 리뷰 — 입실 정보 입력 제거 */}
                    {step === 'review' && (
                        <div className="space-y-4">
                            <div className="bg-[#252525] border border-[#3A3A3A] rounded-lg p-4 space-y-3">
                                <ReviewRow label="캠핑장" value={campaign.accommodationName} />
                                <ReviewRow label="패키지" value={campaign.packageType} />
                                <ReviewRow label="팔로워 쿠폰 (평일)" value={`${campaign.weekdayDiscount.toLocaleString()}원`} />
                                {campaign.weekendDiscount > 0 && (
                                    <ReviewRow label="팔로워 쿠폰 (주말)" value={`${campaign.weekendDiscount.toLocaleString()}원`} />
                                )}
                                <ReviewRow label="방문 기간" value={`${campaign.visitStartDate} ~ ${campaign.visitEndDate}`} />
                                <ReviewRow label="쿠폰 유효기간" value={`${campaign.couponStartDate} ~ ${campaign.couponEndDate}`} />
                                <ReviewRow label="1인당 팔로워 쿠폰" value={`${perPersonCoupon}장`} />
                            </div>

                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                                <p className="text-xs text-yellow-400">
                                    입실일, 입실 사이트가 등록되지 않을 경우 일반 협찬으로 간주되어 원고료 지급이 어려울 수 있습니다.
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

                    {/* CHANGED: 성공 화면 — 쿠폰 먼저 → 캠핏 링크 → 입실 등록 버튼 */}
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

                            {/* CHANGED: 전체 복사 버튼 + 카카오톡 안내 */}
                            <button
                                onClick={handleCopyAll}
                                className={`w-full h-12 flex items-center justify-center font-bold rounded-lg transition-colors ${
                                    allCopied
                                        ? 'bg-[#01DF82]/20 text-[#01DF82] border border-[#01DF82]/50'
                                        : 'bg-[#2A2A2A] text-white border border-[#3A3A3A] hover:bg-[#333333]'
                                }`}
                            >
                                {allCopied ? '복사 완료!' : '전체 정보 복사하기'}
                            </button>

                            <div className="bg-[#252525] border border-[#3A3A3A] rounded-lg p-3 space-y-1">
                                <p className="text-xs text-[#B0B0B0]">
                                    💬 메모장, 카톡 나에게 보내기로 저장해두시면 편해요!
                                </p>
                                <p className="text-xs text-[#666666]">
                                    이메일로도 관련 내용이 전송됩니다.
                                </p>
                            </div>

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

                            {/* 입실 일정 등록 안내 + 버튼 */}
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                                <p className="text-sm text-blue-400">
                                    📢 예약 완료 후 꼭 입실일 등록을 해주셔야 정산이 가능합니다.
                                </p>
                            </div>

                            <button
                                onClick={() => setStep('checkin')}
                                className="w-full h-12 bg-[#2A2A2A] text-white font-bold rounded-lg hover:bg-[#333333] transition-colors border border-[#01DF82]/50"
                            >
                                입실 일정 등록하기
                            </button>

                            <button
                                onClick={handleClose}
                                className="w-full h-10 text-[#9CA3AF] text-sm hover:text-white transition-colors"
                            >
                                나중에 등록하기
                            </button>
                        </div>
                    )}

                    {/* CHANGED: 입실 정보 등록 화면 (성공 후) */}
                    {step === 'checkin' && (
                        <div className="space-y-4">
                            <h3 className="text-base font-bold text-white">입실 일정 등록</h3>

                            {errorMessage && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                    <p className="text-red-400 text-sm">{errorMessage}</p>
                                </div>
                            )}

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
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('success')}
                                    className="flex-1 h-12 bg-[#2A2A2A] text-white font-medium rounded-lg hover:bg-[#333333] transition-colors"
                                >
                                    돌아가기
                                </button>
                                <button
                                    onClick={handleCheckinSubmit}
                                    disabled={!checkInDate || !checkInSite}
                                    className="flex-1 h-12 bg-[#01DF82] text-black font-bold rounded-lg hover:bg-[#00C972] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    등록하기
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 입실 등록 성공 */}
                    {step === 'checkinSuccess' && (
                        <div className="text-center py-6 space-y-4">
                            <div className="text-5xl">✅</div>
                            <p className="text-lg font-bold text-white">입실 일정이 등록되었습니다!</p>
                            <p className="text-sm text-[#B0B0B0]">
                                입실일: {checkInDate} / 사이트: {checkInSite}
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
                            <p className="text-lg font-bold text-white animate-pulse">{errorMessage}</p>
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

function ReviewRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between items-start">
            <span className="text-sm text-[#9CA3AF] shrink-0">{label}</span>
            <span className="text-sm text-white text-right ml-4">{value}</span>
        </div>
    );
}
