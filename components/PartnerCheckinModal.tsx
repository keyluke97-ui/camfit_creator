// PartnerCheckinModal.tsx - 파트너 신청 체크인 정보 수정 + 취소/변경 모달
// CHANGED: 미등록/등록 분기 UI + 쿠폰 정보 복사 버튼 + 프리미엄 CheckinModal 패턴 적용
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { PartnerApplication } from '@/types';
import PartnerCouponDisplay from './PartnerCouponDisplay';

interface PartnerCheckinModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const KAKAO_CHANNEL_URL = 'http://pf.kakao.com/_fBxaQG';
const CAMFIT_COUPON_URL = 'https://camfit.co.kr/mypage/coupon';

type ModalStep = 'list' | 'confirm' | 'success' | 'confirmChange' | 'confirmCancel' | 'changeSuccess' | 'cancelSuccess';

/**
 * 입실 등록 여부 체크
 */
function isRegistered(application: PartnerApplication): boolean {
    return !!(application.checkInDate && application.checkInSite);
}

/**
 * 쿠폰 정보 복사용 텍스트 생성
 */
function buildCheckinCopyText(application: PartnerApplication): string {
    const perPersonCoupon = application.totalRecruitCount > 0
        ? Math.floor(application.followerCouponCount / application.totalRecruitCount)
        : 0;

    const lines = [
        `[${application.accommodationName} 파트너 협찬 안내]`,
        ``,
        ...(application.creatorCouponCode ? [`🎫 크리에이터 쿠폰 코드: ${application.creatorCouponCode}`] : []),
        ...(application.followerCouponCode ? [`🎫 팔로워 쿠폰 코드: ${application.followerCouponCode}`] : []),
        `🎟️ 1인당 팔로워 쿠폰: ${perPersonCoupon}장`,
        `💰 팔로워 할인: 평일 ${application.weekdayDiscount.toLocaleString()}원${application.weekendDiscount > 0 ? ` / 주말 ${application.weekendDiscount.toLocaleString()}원` : ''}`,
        ...(application.stayType ? [`📅 적용 가능 요일: ${application.stayType}`] : []),
        ...(application.holidayCouponApplied ? [`✅ 공휴일에도 쿠폰 사용 가능`] : []),
        ...(application.siteTypes.length > 0 ? [`🏕️ 적용 가능 존: ${application.siteTypes.join(', ')}`] : []),
        `📅 방문 기간: ${application.visitStartDate} ~ ${application.visitEndDate}`,
        `🎫 쿠폰 유효기간: ${application.couponStartDate} ~ ${application.couponEndDate}`,
        ...(application.accommodationDescription ? [``, `📝 숙소 소개:`, application.accommodationDescription] : []),
        ``,
        `👉 캠핏 쿠폰 등록: ${CAMFIT_COUPON_URL}`,
    ];
    return lines.join('\n');
}

export default function PartnerCheckinModal({
    isOpen,
    onClose
}: PartnerCheckinModalProps) {
    const [applications, setApplications] = useState<PartnerApplication[]>([]);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<ModalStep>('list');
    const [selectedApplication, setSelectedApplication] = useState<PartnerApplication | null>(null);
    const [checkInDate, setCheckInDate] = useState('');
    const [checkInSite, setCheckInSite] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const isSubmittingRef = useRef(false);
    const [confirmInput, setConfirmInput] = useState('');
    // CHANGED: 인라인 입실 등록용 — 어떤 application의 폼이 열려있는지
    const [inlineEditId, setInlineEditId] = useState<string | null>(null);
    const [inlineDate, setInlineDate] = useState('');
    const [inlineSite, setInlineSite] = useState('');
    // CHANGED: 쿠폰 정보 복사 상태
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchApplications();
            setStep('list');
            setErrorMessage('');
            setConfirmInput('');
            setInlineEditId(null);
            setCopiedId(null);
        }
    }, [isOpen]);

    const fetchApplications = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/partner/applications/my');
            const data = await response.json();
            if (response.ok) {
                setApplications(data.applications || []);
            }
        } catch (error) {
            console.error('Fetch partner applications error:', error);
        } finally {
            setLoading(false);
        }
    };

    // CHANGED: 인라인 입실 등록 제출 (미등록 상태에서)
    const handleInlineCheckinSubmit = async (applicationId: string) => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;

        try {
            const response = await fetch('/api/partner/applications/checkin', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recordId: applicationId,
                    checkInDate: inlineDate,
                    checkInSite: inlineSite
                })
            });

            if (response.ok) {
                setInlineEditId(null);
                fetchApplications();
            } else {
                const data = await response.json();
                setErrorMessage(data.error || '등록 중 오류가 발생했습니다.');
            }
        } catch (error) {
            console.error('Partner inline checkin error:', error);
            setErrorMessage('네트워크 오류가 발생했습니다.');
        } finally {
            isSubmittingRef.current = false;
        }
    };

    const handleCheckinSubmit = async () => {
        if (isSubmittingRef.current || !selectedApplication) return;
        isSubmittingRef.current = true;

        try {
            const response = await fetch('/api/partner/applications/checkin', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recordId: selectedApplication.id,
                    checkInDate,
                    checkInSite
                })
            });

            if (response.ok) {
                setStep('success');
                fetchApplications();
            } else {
                const data = await response.json();
                setErrorMessage(data.error || '수정 중 오류가 발생했습니다.');
            }
        } catch (error) {
            console.error('Partner checkin submit error:', error);
            setErrorMessage('네트워크 오류가 발생했습니다.');
        } finally {
            isSubmittingRef.current = false;
        }
    };

    const handleStatusChange = async (status: '변경' | '취소') => {
        if (isSubmittingRef.current || !selectedApplication) return;
        isSubmittingRef.current = true;

        try {
            const response = await fetch('/api/partner/applications/status', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recordId: selectedApplication.id, status })
            });

            if (response.ok) {
                fetchApplications();
                setStep(status === '변경' ? 'changeSuccess' : 'cancelSuccess');
            } else {
                const data = await response.json();
                setErrorMessage(data.error || '상태 변경 중 오류가 발생했습니다.');
                setStep('list');
            }
        } catch (error) {
            console.error('Partner status change error:', error);
            setErrorMessage('네트워크 오류가 발생했습니다.');
            setStep('list');
        } finally {
            isSubmittingRef.current = false;
        }
    };

    const startEdit = (application: PartnerApplication) => {
        setSelectedApplication(application);
        setCheckInDate(application.checkInDate || '');
        setCheckInSite(application.checkInSite || '');
        setStep('confirm');
    };

    const startConfirmChange = (application: PartnerApplication) => {
        setSelectedApplication(application);
        setConfirmInput('');
        setStep('confirmChange');
    };

    const startConfirmCancel = (application: PartnerApplication) => {
        setSelectedApplication(application);
        setConfirmInput('');
        setStep('confirmCancel');
    };

    // CHANGED: 쿠폰 정보 복사 핸들러
    const handleCopyInfo = useCallback(async (application: PartnerApplication) => {
        const text = buildCheckinCopyText(application);
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
        setCopiedId(application.id);
        setTimeout(() => setCopiedId(null), 2000);
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />

            <div className="relative w-full max-w-md bg-[#1E1E1E] rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto">
                {/* 헤더 */}
                <div className="sticky top-0 bg-[#1E1E1E] border-b border-[#333333] px-5 py-4 flex items-center justify-between z-10">
                    <h2 className="text-lg font-bold text-white">파트너 입실 일정</h2>
                    <button onClick={onClose} className="text-[#666666] hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-5">
                    {errorMessage && (
                        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                            <p className="text-red-400 text-sm">{errorMessage}</p>
                        </div>
                    )}

                    {/* 목록 — CHANGED: 미등록/등록 분기 UI */}
                    {step === 'list' && (
                        <>
                            {loading && (
                                <div className="flex justify-center py-10">
                                    <div className="w-8 h-8 border-4 border-[#01DF82] border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}

                            {!loading && applications.length === 0 && (
                                <div className="text-center py-10">
                                    <p className="text-[#666666] text-sm">파트너 신청 내역이 없습니다.</p>
                                </div>
                            )}

                            {!loading && applications.map((application) => (
                                <div key={application.id} className="mb-4 bg-[#252525] border border-[#3A3A3A] rounded-lg p-4">
                                    <h3 className="text-base font-bold text-white mb-2">
                                        {application.accommodationName || '캠핑장'}
                                    </h3>

                                    {/* 상태 */}
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="px-2 py-0.5 text-xs font-medium bg-[#01DF82]/15 text-[#01DF82] border border-[#01DF82]/30 rounded-full">
                                            {application.applicationStatus || '신청완료'}
                                        </span>
                                        {application.reservationStatus && (
                                            <span className="px-2 py-0.5 text-xs font-medium bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 rounded-full">
                                                {application.reservationStatus}
                                            </span>
                                        )}
                                    </div>

                                    {/* 쿠폰 코드 */}
                                    <div className="space-y-2 mb-3">
                                        <PartnerCouponDisplay
                                            label="크리에이터 쿠폰"
                                            couponCode={application.creatorCouponCode}
                                        />
                                        <PartnerCouponDisplay
                                            label="팔로워 쿠폰"
                                            couponCode={application.followerCouponCode}
                                        />
                                    </div>

                                    {/* CHANGED: 쿠폰 정보 복사 버튼 */}
                                    <button
                                        onClick={() => handleCopyInfo(application)}
                                        className={`w-full h-9 flex items-center justify-center text-xs font-medium rounded-lg mb-3 transition-colors ${
                                            copiedId === application.id
                                                ? 'bg-[#01DF82]/20 text-[#01DF82] border border-[#01DF82]/50'
                                                : 'bg-[#1E1E1E] text-[#9CA3AF] border border-[#3A3A3A] hover:bg-[#333333]'
                                        }`}
                                    >
                                        {copiedId === application.id ? '복사 완료!' : '쿠폰 정보 복사하기'}
                                    </button>

                                    {/* CHANGED: 미등록/등록 분기 — 프리미엄 CheckinModal 패턴 */}
                                    {isRegistered(application) ? (
                                        <>
                                            {/* 등록됨: 읽기 전용 표시 + 변경/취소 */}
                                            <div className="bg-[#1E1E1E] rounded-lg p-3 mb-3">
                                                <div className="flex items-center gap-1.5 mb-2">
                                                    <span className="text-xs text-[#01DF82]">✨</span>
                                                    <span className="text-xs text-[#01DF82]">예약 정보가 저장되었습니다.</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <p className="text-xs text-[#9CA3AF]">입실일</p>
                                                        <p className="text-sm text-white">{application.checkInDate}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-[#9CA3AF]">입실 사이트</p>
                                                        <p className="text-sm text-white">{application.checkInSite}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => startEdit(application)}
                                                    className="flex-1 h-10 bg-[#01DF82] text-black font-bold text-sm rounded-lg hover:bg-[#00C972] transition-colors"
                                                >
                                                    입실 정보 수정
                                                </button>
                                                <button
                                                    onClick={() => startConfirmChange(application)}
                                                    className="h-10 px-3 bg-[#2A2A2A] text-[#B0B0B0] text-sm rounded-lg hover:bg-[#333333] transition-colors"
                                                >
                                                    변경
                                                </button>
                                                <button
                                                    onClick={() => startConfirmCancel(application)}
                                                    className="h-10 px-3 bg-[#2A2A2A] text-red-400 text-sm rounded-lg hover:bg-[#333333] transition-colors"
                                                >
                                                    취소
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {/* 미등록: 인라인 입실 등록 폼 */}
                                            {inlineEditId === application.id ? (
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="block text-xs text-[#9CA3AF] mb-1">입실 희망일</label>
                                                        <input
                                                            type="date"
                                                            value={inlineDate}
                                                            min={application.visitStartDate}
                                                            max={application.visitEndDate}
                                                            onChange={(event) => setInlineDate(event.target.value)}
                                                            className="w-full h-10 bg-[#1E1E1E] border border-[#3A3A3A] rounded-lg px-3 text-sm text-white focus:border-[#01DF82] outline-none transition-colors"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-[#9CA3AF] mb-1">입실 사이트</label>
                                                        <input
                                                            type="text"
                                                            value={inlineSite}
                                                            onChange={(event) => setInlineSite(event.target.value)}
                                                            placeholder="예: A-1, 오토캠핑 3번"
                                                            className="w-full h-10 bg-[#1E1E1E] border border-[#3A3A3A] rounded-lg px-3 text-sm text-white placeholder:text-[#555555] focus:border-[#01DF82] outline-none transition-colors"
                                                        />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setInlineEditId(null)}
                                                            className="flex-1 h-10 bg-[#2A2A2A] text-white text-sm rounded-lg hover:bg-[#333333] transition-colors"
                                                        >
                                                            취소
                                                        </button>
                                                        <button
                                                            onClick={() => handleInlineCheckinSubmit(application.id)}
                                                            disabled={!inlineDate || !inlineSite}
                                                            className="flex-1 h-10 bg-[#01DF82] text-black font-bold text-sm rounded-lg hover:bg-[#00C972] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                        >
                                                            등록하기
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2.5">
                                                        <p className="text-xs text-yellow-400">
                                                            입실 정보가 아직 등록되지 않았습니다. 등록해주세요.
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setInlineEditId(application.id);
                                                            setInlineDate('');
                                                            setInlineSite('');
                                                        }}
                                                        className="w-full h-10 bg-[#01DF82] text-black font-bold text-sm rounded-lg hover:bg-[#00C972] transition-colors"
                                                    >
                                                        입실 정보 등록
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}

                            {/* 카카오톡 문의 안내 */}
                            {!loading && applications.length > 0 && (
                                <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                                    <p className="text-xs text-yellow-400 mb-2">
                                        예약 취소/변경은 카카오톡 채널로 문의해주세요.
                                    </p>
                                    <a
                                        href={KAKAO_CHANNEL_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FEE500] text-[#3C1E1E] text-xs font-bold rounded-lg hover:bg-[#FFDA00] transition-colors"
                                    >
                                        카카오톡 문의
                                    </a>
                                </div>
                            )}
                        </>
                    )}

                    {/* 체크인 수정 확인 */}
                    {step === 'confirm' && selectedApplication && (
                        <div className="space-y-4">
                            <h3 className="text-base font-bold text-white">
                                {selectedApplication.accommodationName}
                            </h3>
                            <div>
                                <label className="block text-sm text-[#9CA3AF] mb-1.5">입실 희망일</label>
                                <input
                                    type="date"
                                    value={checkInDate}
                                    min={selectedApplication.visitStartDate}
                                    max={selectedApplication.visitEndDate}
                                    onChange={(event) => setCheckInDate(event.target.value)}
                                    className="w-full h-12 bg-[#252525] border border-[#3A3A3A] rounded-lg px-4 text-white focus:border-[#01DF82] outline-none transition-colors"
                                />
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
                                    onClick={() => setStep('list')}
                                    className="flex-1 h-12 bg-[#2A2A2A] text-white font-medium rounded-lg hover:bg-[#333333] transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleCheckinSubmit}
                                    disabled={!checkInDate || !checkInSite}
                                    className="flex-1 h-12 bg-[#01DF82] text-black font-bold rounded-lg hover:bg-[#00C972] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    저장
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 성공 (입실 정보 수정) */}
                    {step === 'success' && (
                        <div className="text-center py-6 space-y-4">
                            <div className="text-5xl">✅</div>
                            <p className="text-lg font-bold text-white">입실 정보가 수정되었습니다.</p>
                            <button
                                onClick={() => setStep('list')}
                                className="w-full h-12 bg-[#01DF82] text-black font-bold rounded-lg hover:bg-[#00C972] transition-colors"
                            >
                                확인
                            </button>
                        </div>
                    )}

                    {/* 변경 확인 단계 */}
                    {step === 'confirmChange' && selectedApplication && (
                        <div className="space-y-4">
                            <h3 className="text-base font-bold text-white">
                                예약 변경 — {selectedApplication.accommodationName}
                            </h3>
                            <div className="bg-[#252525] border border-[#3A3A3A] rounded-lg p-4 space-y-2">
                                <p className="text-sm text-[#B0B0B0]">
                                    예약 변경 시 기존 입실 정보(입실일, 입실 사이트)가 초기화됩니다.
                                </p>
                                <p className="text-sm text-[#B0B0B0]">
                                    변경 후 쿠폰 코드를 사용해 다시 예약해주세요.
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm text-[#9CA3AF] mb-1.5">
                                    확인을 위해 <span className="text-white font-semibold">&lsquo;이해&rsquo;</span>를 입력해주세요
                                </label>
                                <input
                                    type="text"
                                    value={confirmInput}
                                    onChange={(event) => setConfirmInput(event.target.value)}
                                    placeholder="이해"
                                    className="w-full h-12 bg-[#252525] border border-[#3A3A3A] rounded-lg px-4 text-white placeholder:text-[#555555] focus:border-[#01DF82] outline-none transition-colors"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setConfirmInput(''); setStep('list'); }}
                                    className="flex-1 h-12 bg-[#2A2A2A] text-white font-medium rounded-lg hover:bg-[#333333] transition-colors"
                                >
                                    돌아가기
                                </button>
                                <button
                                    onClick={() => handleStatusChange('변경')}
                                    disabled={confirmInput !== '이해'}
                                    className="flex-1 h-12 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    변경 요청
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 취소 확인 단계 */}
                    {step === 'confirmCancel' && selectedApplication && (
                        <div className="space-y-4">
                            <h3 className="text-base font-bold text-white">
                                예약 취소 — {selectedApplication.accommodationName}
                            </h3>
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-2">
                                <p className="text-sm text-red-400 font-medium">
                                    정말 이 예약을 취소하시겠습니까?
                                </p>
                                <p className="text-sm text-[#B0B0B0]">
                                    취소 후 되돌릴 수 없으며, 캠핑장에 금전적 손해가 발생할 수 있습니다.
                                </p>
                                <p className="text-sm text-[#B0B0B0]">
                                    잦은 취소는 추후 파트너 협찬 참여가 제한될 수 있습니다.
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm text-[#9CA3AF] mb-1.5">
                                    확인을 위해 <span className="text-white font-semibold">&lsquo;이해&rsquo;</span>를 입력해주세요
                                </label>
                                <input
                                    type="text"
                                    value={confirmInput}
                                    onChange={(event) => setConfirmInput(event.target.value)}
                                    placeholder="이해"
                                    className="w-full h-12 bg-[#252525] border border-[#3A3A3A] rounded-lg px-4 text-white placeholder:text-[#555555] focus:border-[#01DF82] outline-none transition-colors"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setConfirmInput(''); setStep('list'); }}
                                    className="flex-1 h-12 bg-[#2A2A2A] text-white font-medium rounded-lg hover:bg-[#333333] transition-colors"
                                >
                                    돌아가기
                                </button>
                                <button
                                    onClick={() => handleStatusChange('취소')}
                                    disabled={confirmInput !== '이해'}
                                    className="flex-1 h-12 bg-red-500 text-white font-bold rounded-lg hover:bg-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    취소 확인
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 변경 완료 — 쿠폰 코드 재표시 */}
                    {step === 'changeSuccess' && selectedApplication && (
                        <div className="py-4 space-y-5">
                            <div className="text-center">
                                <div className="text-5xl mb-3">✅</div>
                                <p className="text-lg font-bold text-white">예약 변경이 요청되었습니다.</p>
                            </div>

                            <div className="bg-[#252525] border border-[#3A3A3A] rounded-lg p-4">
                                <p className="text-sm text-[#B0B0B0]">
                                    기존 예약 정보가 초기화되었습니다. 쿠폰 코드를 사용해 새로운 일정으로 재예약해주세요.
                                </p>
                            </div>

                            {selectedApplication.creatorCouponCode && (
                                <PartnerCouponDisplay
                                    label="크리에이터 쿠폰 코드"
                                    couponCode={selectedApplication.creatorCouponCode}
                                />
                            )}

                            {selectedApplication.creatorCouponCode && (
                                <a
                                    href={CAMFIT_COUPON_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full h-12 flex items-center justify-center bg-[#01DF82] text-black font-bold rounded-lg hover:bg-[#00C972] transition-colors"
                                >
                                    캠핏 쿠폰 등록하러 가기 →
                                </a>
                            )}

                            <button
                                onClick={() => setStep('list')}
                                className="w-full h-12 bg-[#2A2A2A] text-white font-medium rounded-lg hover:bg-[#333333] transition-colors"
                            >
                                목록으로 돌아가기
                            </button>
                        </div>
                    )}

                    {/* 취소 완료 — 카카오톡 안내 */}
                    {step === 'cancelSuccess' && (
                        <div className="text-center py-6 space-y-4">
                            <div className="text-5xl">🗑️</div>
                            <p className="text-lg font-bold text-white">예약이 취소되었습니다.</p>
                            <p className="text-sm text-[#B0B0B0]">
                                추가 문의사항이 있으시면 카카오톡 채널로 연락해주세요.
                            </p>
                            <a
                                href={KAKAO_CHANNEL_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full h-12 flex items-center justify-center bg-[#FEE500] text-[#3C1E1E] font-bold rounded-lg hover:bg-[#FFDA00] transition-colors"
                            >
                                카카오톡 문의
                            </a>
                            <button
                                onClick={() => setStep('list')}
                                className="w-full h-12 bg-[#2A2A2A] text-white font-medium rounded-lg hover:bg-[#333333] transition-colors"
                            >
                                목록으로 돌아가기
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
