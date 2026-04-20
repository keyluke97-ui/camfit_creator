// PartnerApplicationModal.tsx - 파트너 캠페인 신청 모달
// CHANGED: 체크박스→텍스트입력, 입실 정보를 성공 화면으로 이동, 쿠폰 조건/사이트 종류 표시
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { PartnerCampaign } from '@/types';
import PartnerCouponDisplay from './PartnerCouponDisplay';

/**
 * 팔로워 쿠폰 안내 정보를 복사용 텍스트로 생성
 */
function buildCouponInfoText(campaign: PartnerCampaign, perPersonCoupon: number): string {
    const lines = [
        `[${campaign.accommodationName} 팔로워 쿠폰 안내]`,
        ``,
        `🎫 팔로워 쿠폰 입실 가능: ${campaign.couponStartDate} ~ ${campaign.couponEndDate}`,
        `🎟️ 1인당 팔로워 쿠폰: ${perPersonCoupon}장`,
        `💰 할인 금액: 평일 ${campaign.weekdayDiscount.toLocaleString()}원${campaign.weekendDiscount > 0 ? ` / 주말 ${campaign.weekendDiscount.toLocaleString()}원` : ''}`,
        `📅 적용 가능 요일: ${campaign.stayType}`,
        ...(campaign.holidayCouponApplied ? [`✅ 공휴일에도 쿠폰 사용 가능`] : []),
        ...(campaign.siteTypes.length > 0 ? [`🏕️ 적용 가능 존: ${campaign.siteTypes.join(', ')}`] : []),
    ];
    return lines.join('\n');
}

/**
 * 전체 협찬 정보를 카카오톡 복붙용 텍스트로 생성
 */
// CHANGED: 패키지 제거, 숙소소개·사이트종류·적용요일 추가
function buildCopyText(campaign: PartnerCampaign, couponCodes: { creator: string; follower: string }, perPersonCoupon: number): string {
    const lines = [
        `[캠핏 파트너 협찬 안내]`,
        ``,
        `📍 ${campaign.accommodationName}`,
        ``,
        `🎫 크리에이터 쿠폰 코드: ${couponCodes.creator || '(운영팀 확인 후 발급)'}`,
        ...(couponCodes.follower ? [`🎫 팔로워 쿠폰 코드: ${couponCodes.follower}`] : []),
        ``,
        `📅 크리에이터 방문 가능: ${campaign.visitStartDate} ~ ${campaign.visitEndDate}`,
        `🎫 팔로워 쿠폰 입실 가능: ${campaign.couponStartDate} ~ ${campaign.couponEndDate}`,
        `💰 팔로워 할인: 평일 ${campaign.weekdayDiscount.toLocaleString()}원${campaign.weekendDiscount > 0 ? ` / 주말 ${campaign.weekendDiscount.toLocaleString()}원` : ''}`,
        `🎟️ 1인당 팔로워 쿠폰: ${perPersonCoupon}장`,
        `📅 적용 가능 요일: ${campaign.stayType}`,
        ...(campaign.holidayCouponApplied ? [`✅ 공휴일에도 쿠폰 사용 가능`] : []),
        ...(campaign.siteTypes.length > 0 ? [`🏕️ 적용 가능 존: ${campaign.siteTypes.join(', ')}`] : []),
        ...(campaign.accommodationDescription ? [``, `📢 캠핑장 추천 포인트:`, campaign.accommodationDescription] : []),
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
// CHANGED: policy4(쿠폰 보안 정책) 단계 추가
type ModalStep = 'policy1' | 'policy2' | 'policy3' | 'policy4' | 'review' | 'success' | 'checkin' | 'checkinSuccess' | 'error';

const KAKAO_CHANNEL_URL = 'http://pf.kakao.com/_fBxaQG';
const CAMFIT_COUPON_URL = 'https://camfit.co.kr/mypage/coupon';

export default function PartnerApplicationModal({
    isOpen,
    onClose,
    campaign,
    onApplySuccess
}: PartnerApplicationModalProps) {
    const [step, setStep] = useState<ModalStep>('policy1');
    // CHANGED: 텍스트 타이핑 확인 제거 — 버튼 클릭 기반으로 전환 (프리미엄 모달과 일관)
    const [checkInDate, setCheckInDate] = useState('');
    const [checkInSite, setCheckInSite] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const isSubmittingRef = useRef(false);
    const [isSubmitting, setIsSubmitting] = useState(false); // CHANGED: 신청 버튼 로딩 UI용
    const [couponCodes, setCouponCodes] = useState({ creator: '', follower: '' });
    const [isClosedError, setIsClosedError] = useState(false);
    // CHANGED: 복사 버튼용 state
    const [allCopied, setAllCopied] = useState(false);
    const [couponInfoCopied, setCouponInfoCopied] = useState(false);

    const resetModal = () => {
        setStep('policy1');
        setCheckInDate('');
        setCheckInSite('');
        setErrorMessage('');
        isSubmittingRef.current = false;
        setCouponCodes({ creator: '', follower: '' });
        setIsClosedError(false);
        setAllCopied(false);
        setCouponInfoCopied(false);
    };

    // CHANGED: 모달 닫을 때 캠페인 목록 갱신 — 성공 화면 중 갱신으로 모달 사라지는 문제 방지
    const handleClose = () => {
        const wasSuccess = step === 'success' || step === 'checkin' || step === 'checkinSuccess';
        resetModal();
        onClose();
        if (wasSuccess) {
            onApplySuccess();
        }
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
        setIsSubmitting(true); // CHANGED: 로딩 UI 표시

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
                // CHANGED: onApplySuccess()를 여기서 호출하지 않음 — 성공 화면이 보이는 동안
                // 캠페인 목록 갱신으로 마감 처리되면 모달이 사라지는 문제 방지
                // 모달 닫기(handleClose) 시점에 갱신하도록 이동
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
            setIsSubmitting(false); // CHANGED: 로딩 UI 해제
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

    // CHANGED: 팔로워 쿠폰 안내 복사 핸들러
    const handleCopyCouponInfo = useCallback(async () => {
        const text = buildCouponInfoText(campaign, perPersonCoupon);
        try {
            await navigator.clipboard.writeText(text);
            setCouponInfoCopied(true);
            setTimeout(() => setCouponInfoCopied(false), 2000);
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCouponInfoCopied(true);
            setTimeout(() => setCouponInfoCopied(false), 2000);
        }
    }, [campaign, perPersonCoupon]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            {/* CHANGED: 성공/체크인 화면에서는 배경 클릭 닫기도 방지 */}
            <div className="absolute inset-0 bg-black/60" onClick={step === 'success' || step === 'checkin' || step === 'checkinSuccess' ? undefined : handleClose} />

            <div className="relative w-full max-w-md bg-[#1E1E1E] rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto">
                {/* 헤더 */}
                <div className="sticky top-0 bg-[#1E1E1E] border-b border-[#333333] px-5 py-4 flex items-center justify-between z-10">
                    <h2 className="text-lg font-bold text-white">
                        {step === 'success' || step === 'checkin' || step === 'checkinSuccess'
                            ? '신청 완료'
                            : step === 'error' ? '신청 실패' : '파트너 협찬 신청'}
                    </h2>
                    {/* CHANGED: 성공/체크인 화면에서 X 닫기 숨김 — 쿠폰 코드를 반드시 확인하도록 유도 */}
                    {step !== 'success' && step !== 'checkin' && step !== 'checkinSuccess' && (
                        <button onClick={handleClose} className="text-[#666666] hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                <div className="p-5">
                    {/* Step 1: 방문 가능 기간 + 매칭 즉시 완료 안내 */}
                    {step === 'policy1' && (
                        <div className="space-y-4">
                            {/* CHANGED: Step 진행률 인디케이터 추가 — 타이핑 확인 제거 보완 */}
                            <p className="text-xs text-[#666666] text-center">Step 1 / 4</p>
                            <div className="bg-[#252525] border border-[#3A3A3A] rounded-lg p-4">
                                <p className="text-sm text-[#9CA3AF] mb-1">크리에이터 방문 가능 기간</p>
                                <p className="text-base font-semibold text-white">
                                    {campaign.visitStartDate} ~ {campaign.visitEndDate}
                                </p>
                            </div>
                            {/* CHANGED: 크리에이터 쿠폰 안내 추가 — policy2 팔로워 쿠폰 안내와 동일 구조 */}
                            <div className="bg-[#252525] border border-[#3A3A3A] rounded-lg p-4 space-y-3">
                                <p className="text-sm font-semibold text-white">크리에이터 쿠폰 안내</p>
                                <div>
                                    <p className="text-xs text-[#9CA3AF] mb-0.5">제공 숙박 박수</p>
                                    <p className="text-sm font-semibold text-white">{campaign.creatorStayNights}박</p>
                                </div>
                                <div>
                                    <p className="text-xs text-[#9CA3AF] mb-0.5">할인 금액</p>
                                    <p className="text-sm font-semibold text-[#01DF82]">100% (무료 숙박)</p>
                                </div>
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

                            <div className="bg-[#252525] border border-[#3A3A3A] rounded-lg p-4">
                                {/* CHANGED: '매칭 완료' 용어 모호성 제거 — 즉시 확정 의미 명확화 */}
                                <p className="text-sm text-[#B0B0B0]">
                                    신청과 동시에 예약이 확정돼요 <span className="text-white font-semibold">(캠지기 승인 대기 없음)</span>.
                                </p>
                            </div>
                            {/* CHANGED: 타이핑 확인 제거 → 버튼 클릭 기반으로 전환 */}
                            <button
                                onClick={() => setStep('policy2')}
                                className="w-full h-12 bg-[#01DF82] text-black font-bold rounded-lg hover:bg-[#00C972] transition-colors"
                            >
                                방문 가능합니다
                            </button>
                        </div>
                    )}

                    {/* Step 2: 팔로워 쿠폰 조건 확인 */}
                    {/* CHANGED: 팔로워 방문 기간 + 쿠폰 조건 + 사이트 종류 표시 */}
                    {step === 'policy2' && (
                        <div className="space-y-4">
                            {/* CHANGED: Step 진행률 인디케이터 추가 */}
                            <p className="text-xs text-[#666666] text-center">Step 2 / 4</p>
                            <div className="bg-[#252525] border border-[#3A3A3A] rounded-lg p-4 space-y-3">
                                <p className="text-sm font-semibold text-white">팔로워 쿠폰 안내</p>
                                <div>
                                    <p className="text-xs text-[#9CA3AF] mb-0.5">팔로워 쿠폰 입실 가능 기간</p>
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

                            {/* CHANGED: 쿠폰 정보 복사 버튼 */}
                            <button
                                onClick={handleCopyCouponInfo}
                                className={`w-full h-10 flex items-center justify-center text-sm font-medium rounded-lg transition-colors ${
                                    couponInfoCopied
                                        ? 'bg-[#01DF82]/20 text-[#01DF82] border border-[#01DF82]/50'
                                        : 'bg-[#2A2A2A] text-white border border-[#3A3A3A] hover:bg-[#333333]'
                                }`}
                            >
                                {couponInfoCopied ? '복사 완료!' : '팔로워 쿠폰 조건 복사하기'}
                            </button>

                            {/* CHANGED: 타이핑 확인 제거 → 버튼 클릭 기반으로 전환 */}
                            <button
                                onClick={() => setStep('policy3')}
                                className="w-full h-12 bg-[#01DF82] text-black font-bold rounded-lg hover:bg-[#00C972] transition-colors"
                            >
                                쿠폰 조건 확인했어요
                            </button>
                        </div>
                    )}

                    {/* Step 3: 정책 동의 — 문구 디벨롭 */}
                    {/* CHANGED: 이모지 아이콘 + 14일 경고 최상단 이동 + 노쇼 강조 추가 */}
                    {step === 'policy3' && (
                        <div className="space-y-4">
                            {/* CHANGED: Step 진행률 인디케이터 추가 */}
                            <p className="text-xs text-[#666666] text-center">Step 3 / 4</p>
                            {/* CHANGED: 상단 경고 단축 — '잦은 취소' 중복 제거 (세부 항목에서 유지) */}
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                <p className="text-sm text-red-400 font-medium">
                                    🚨 최종 신청일로부터 14일 동안 예약하지 않을 시 자동 취소됩니다.
                                </p>
                            </div>

                            {/* CHANGED: 각 항목에 불릿(•) 마커 추가 + 쿠폰 코드 유출 경고 추가 */}
                            <div className="bg-[#252525] border border-[#3A3A3A] rounded-lg p-4 space-y-2">
                                <p className="text-sm font-semibold text-white">🚫 취소/변경 정책</p>
                                <ul className="space-y-1.5 pl-1">
                                    <li className="text-sm text-[#B0B0B0] flex gap-2">
                                        <span className="text-[#666666] shrink-0">•</span>
                                        <span>방문일 전까지 취소/변경이 가능합니다.</span>
                                    </li>
                                    <li className="text-sm text-[#B0B0B0] flex gap-2">
                                        <span className="text-[#666666] shrink-0">•</span>
                                        <span>취소 시 해당 일정의 예약이 불가해지며, 캠핑장에 <span className="text-yellow-400 font-medium">직접적인 금전적 손해</span>가 발생합니다.</span>
                                    </li>
                                    <li className="text-sm text-[#B0B0B0] flex gap-2">
                                        <span className="text-[#666666] shrink-0">•</span>
                                        <span>잦은 취소는 향후 파트너 협찬 참여가 제한될 수 있습니다.</span>
                                    </li>
                                    <li className="text-sm text-[#B0B0B0] flex gap-2">
                                        <span className="text-[#666666] shrink-0">•</span>
                                        <span><span className="text-red-400 font-medium">노쇼(No-show) 또는 당일 취소</span> 시 협찬은 무효 처리되며, 재방문이나 보상은 제공되지 않습니다.</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="bg-[#252525] border border-[#3A3A3A] rounded-lg p-4 space-y-2">
                                <p className="text-sm font-semibold text-white">📸 콘텐츠 제작 의무</p>
                                <ul className="space-y-1.5 pl-1">
                                    <li className="text-sm text-[#B0B0B0] flex gap-2">
                                        <span className="text-[#666666] shrink-0">•</span>
                                        <span>방문 후 안내된 기한 내에 콘텐츠를 제출해야 합니다. 미제출 또는 반복 지연 시 향후 참여가 제한됩니다.</span>
                                    </li>
                                    <li className="text-sm text-[#B0B0B0] flex gap-2">
                                        <span className="text-[#666666] shrink-0">•</span>
                                        <span>콘텐츠에 해당 캠핑장 관련 태그 또는 언급을 포함해야 합니다.</span>
                                    </li>
                                    <li className="text-sm text-[#B0B0B0] flex gap-2">
                                        <span className="text-[#666666] shrink-0">•</span>
                                        <span>제공받은 팔로워 쿠폰 코드는 콘텐츠를 통해 배포해야 합니다.</span>
                                    </li>
                                    {/* CHANGED: 쿠폰 유출 경고는 policy4(별도 단계)로 이동 */}
                                </ul>
                            </div>

                            <div className="bg-[#252525] border border-[#3A3A3A] rounded-lg p-4 space-y-2">
                                <p className="text-sm font-semibold text-white">©️ 저작권 및 활용</p>
                                <ul className="space-y-1.5 pl-1">
                                    <li className="text-sm text-[#B0B0B0] flex gap-2">
                                        <span className="text-[#666666] shrink-0">•</span>
                                        <span>제작된 콘텐츠는 캠핏 및 해당 캠핑장의 홍보 목적으로 업로드일로부터 12개월간 활용될 수 있습니다.</span>
                                    </li>
                                    <li className="text-sm text-[#B0B0B0] flex gap-2">
                                        <span className="text-[#666666] shrink-0">•</span>
                                        <span>게시된 콘텐츠는 사전 협의 없이 임의로 삭제할 수 없습니다.</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="bg-[#252525] border border-[#3A3A3A] rounded-lg p-4 space-y-2">
                                <p className="text-sm font-semibold text-white">🏕️ 입실 등록 안내</p>
                                <ul className="space-y-1.5 pl-1">
                                    <li className="text-sm text-[#B0B0B0] flex gap-2">
                                        <span className="text-[#666666] shrink-0">•</span>
                                        <span>쿠폰 발급 후 캠핑장에 직접 예약하시고, 반드시 입실일과 입실 사이트를 포털에 등록해주세요.</span>
                                    </li>
                                    <li className="text-sm text-[#B0B0B0] flex gap-2">
                                        <span className="text-[#666666] shrink-0">•</span>
                                        <span>입실 정보 미등록 시 협찬 진행 확인이 어렵습니다.</span>
                                    </li>
                                </ul>
                            </div>

                            <p className="text-xs text-[#9CA3AF] text-center">위 4가지 정책을 모두 확인하셨나요?</p>
                            {/* CHANGED: 타이핑 확인 제거 → 버튼 클릭 기반으로 전환 */}
                            <button
                                onClick={() => setStep('policy4')}
                                className="w-full h-12 bg-[#01DF82] text-black font-bold rounded-lg hover:bg-[#00C972] transition-colors"
                            >
                                정책에 동의합니다
                            </button>
                        </div>
                    )}

                    {/* CHANGED: Step 4: 팔로워 쿠폰 보안 정책 — 별도 단계로 분리 (중요도 높음) */}
                    {step === 'policy4' && (
                        <div className="space-y-4">
                            {/* CHANGED: Step 진행률 인디케이터 추가 */}
                            <p className="text-xs text-[#666666] text-center">Step 4 / 4</p>
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-3">
                                <p className="text-sm font-bold text-red-400">⚠️ 팔로워 쿠폰 코드 보안 정책</p>
                                {/* CHANGED: '외부 유출이 금지' → 행동 지시 톤으로 소프트 랜딩 */}
                                <p className="text-sm text-[#B0B0B0]">
                                    팔로워 쿠폰 코드는 <span className="text-red-400 font-medium">외부에 공개하지 말아주세요</span>.
                                    무분별한 유출 시 빠르게 마감되어 실제 팔로워에게 혜택이 돌아가지 않습니다.
                                </p>
                                <p className="text-sm font-semibold text-white mt-2">반드시 콘텐츠 내에서만 노출해주세요:</p>
                                <ul className="space-y-2 pl-1">
                                    <li className="text-sm text-[#B0B0B0] flex gap-2">
                                        <span className="text-[#666666] shrink-0">•</span>
                                        <span><span className="text-white font-medium">유튜버</span>: 영상 내 삽입 또는 더보기란에 기재</span>
                                    </li>
                                    <li className="text-sm text-[#B0B0B0] flex gap-2">
                                        <span className="text-[#666666] shrink-0">•</span>
                                        <span><span className="text-white font-medium">인스타그램</span>: DM 발송 (DM 발송 서비스 미사용 시 피드/릴스 캡션 삽입)</span>
                                    </li>
                                </ul>
                                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 mt-2">
                                    <p className="text-xs text-red-400 font-medium">
                                        위반 시 향후 파트너 협찬 참여가 제한됩니다.
                                    </p>
                                </div>
                            </div>

                            {/* CHANGED: 타이핑 확인 제거 → 버튼 클릭 기반으로 전환 */}
                            <button
                                onClick={() => setStep('review')}
                                className="w-full h-12 bg-[#01DF82] text-black font-bold rounded-lg hover:bg-[#00C972] transition-colors"
                            >
                                이해했습니다
                            </button>
                        </div>
                    )}

                    {/* CHANGED: 최종 리뷰 — 입실 정보 입력 제거 */}
                    {step === 'review' && (
                        <div className="space-y-4">
                            {/* CHANGED: 패키지 행 제거 (크리에이터에게 불필요) */}
                            {/* CHANGED: 크리에이터 숙박 행 추가 + 팔로워 쿠폰에 '할인' 키워드 추가 */}
                            <div className="bg-[#252525] border border-[#3A3A3A] rounded-lg p-4 space-y-3">
                                <ReviewRow label="캠핑장" value={campaign.accommodationName} />
                                <ReviewRow label="크리에이터 숙박" value={`${campaign.creatorStayNights}박 무료`} highlight />
                                <div className="border-t border-[#333333]" />
                                <ReviewRow label="팔로워 쿠폰 (평일)" value={`${campaign.weekdayDiscount.toLocaleString()}원 할인`} />
                                {campaign.weekendDiscount > 0 && (
                                    <ReviewRow label="팔로워 쿠폰 (주말)" value={`${campaign.weekendDiscount.toLocaleString()}원 할인`} />
                                )}
                                <ReviewRow label="크리에이터 방문 가능" value={`${campaign.visitStartDate} ~ ${campaign.visitEndDate}`} />
                                <ReviewRow label="팔로워 쿠폰 입실 가능" value={`${campaign.couponStartDate} ~ ${campaign.couponEndDate}`} />
                                <ReviewRow label="1인당 팔로워 쿠폰" value={`${perPersonCoupon}장`} />
                            </div>

                            {/* CHANGED: 정산 문구 제거 — 파트너 협찬에 정산 없음 */}
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                                <p className="text-xs text-yellow-400">
                                    입실일과 입실 사이트를 꼭 등록해주세요. 미등록 시 협찬 진행 확인이 어렵습니다.
                                </p>
                            </div>

                            {/* CHANGED: 신청 버튼 로딩 상태 — 기다려야 함을 인지시킴 */}
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="w-full h-12 bg-[#01DF82] text-black font-bold rounded-lg hover:bg-[#00C972] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                        {/* CHANGED: 로딩 카피 양식 통일 ({동사}하는 중…) */}
                                        신청하는 중…
                                    </span>
                                ) : '신청하기'}
                            </button>
                        </div>
                    )}

                    {/* CHANGED: 성공 화면 — 위계 재설계: 크리에이터 쿠폰 복사→캠핏 등록이 메인 플로우 */}
                    {step === 'success' && (
                        <div className="py-4 space-y-5">
                            {/* (A) 성공 메시지 */}
                            <div className="text-center">
                                <div className="text-4xl mb-2">🎉</div>
                                <p className="text-lg font-bold text-white">신청 완료!</p>
                                <p className="text-sm text-[#9CA3AF] mt-1">{campaign.accommodationName}</p>
                            </div>

                            {/* (B) Step 1: 크리에이터 쿠폰 복사 → 캠핏 등록 (메인 플로우) */}
                            <div className="bg-[#252525] border border-[#3A3A3A] rounded-xl p-4 space-y-3">
                                <p className="text-xs text-[#9CA3AF]">Step 1</p>
                                <p className="text-sm font-semibold text-white">크리에이터 쿠폰을 복사 후 캠핏에 등록하세요</p>

                                {couponCodes.creator ? (
                                    <PartnerCouponDisplay
                                        label="크리에이터 쿠폰 코드"
                                        couponCode={couponCodes.creator}
                                    />
                                ) : (
                                    <div className="bg-[#1E1E1E] rounded-lg p-3 text-center">
                                        <p className="text-sm text-[#9CA3AF]">
                                            쿠폰 코드는 운영팀 확인 후 포털에서 확인 가능
                                        </p>
                                    </div>
                                )}

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
                            </div>

                            {/* (C) Step 2: 입실 일정 등록 (서브 액션) */}
                            <div className="bg-[#252525] border border-[#3A3A3A] rounded-xl p-4 space-y-3">
                                <p className="text-xs text-[#9CA3AF]">Step 2</p>
                                <p className="text-sm font-semibold text-white">캠핑장에 직접 예약 후 입실 일정을 등록해주세요</p>
                                <button
                                    onClick={() => setStep('checkin')}
                                    className="w-full h-12 bg-[#2A2A2A] text-white font-bold rounded-lg hover:bg-[#333333] transition-colors border border-[#3A3A3A]"
                                >
                                    입실 일정 등록하기
                                </button>
                            </div>

                            {/* (D) 팔로워 쿠폰 + 전체 복사 (보조 정보) */}
                            {couponCodes.follower && (
                                <div className="bg-[#1E1E1E] border border-[#333333] rounded-xl p-4 space-y-3">
                                    <p className="text-xs text-[#9CA3AF]">팔로워 쿠폰 (콘텐츠 배포 시 사용)</p>
                                    <PartnerCouponDisplay
                                        label="팔로워 쿠폰 코드"
                                        couponCode={couponCodes.follower}
                                    />
                                </div>
                            )}

                            <button
                                onClick={handleCopyAll}
                                className={`w-full h-10 flex items-center justify-center text-sm font-medium rounded-lg transition-colors ${
                                    allCopied
                                        ? 'bg-[#01DF82]/20 text-[#01DF82] border border-[#01DF82]/50'
                                        : 'bg-[#333333] text-white hover:bg-[#3A3A3A]'
                                }`}
                            >
                                {/* CHANGED: CTA 버튼 이모지 제거 */}
                                {allCopied ? '복사 완료!' : '전체 정보 복사하기'}
                            </button>

                            <button
                                onClick={handleClose}
                                className="w-full h-10 text-[#666666] text-sm hover:text-[#9CA3AF] transition-colors"
                            >
                                닫기
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

// CHANGED: highlight prop 추가 — 크리에이터 숙박 행 초록색 강조용
function ReviewRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className="flex justify-between items-start">
            <span className="text-sm text-[#9CA3AF] shrink-0">{label}</span>
            <span className={`text-sm text-right ml-4 ${highlight ? 'text-[#01DF82] font-semibold' : 'text-white'}`}>{value}</span>
        </div>
    );
}
