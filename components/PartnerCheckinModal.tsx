// PartnerCheckinModal.tsx - 파트너 신청 체크인 정보 수정 + 취소/변경 모달
// CHANGED: window.confirm → 모달 내 '이해' 입력 단계 + 변경/취소 완료 화면 추가 (A3)
'use client';

import { useState, useEffect, useRef } from 'react';
import type { PartnerApplication } from '@/types';
import PartnerCouponDisplay from './PartnerCouponDisplay';

interface PartnerCheckinModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const KAKAO_CHANNEL_URL = 'http://pf.kakao.com/_fBxaQG';
const CAMFIT_COUPON_URL = 'https://camfit.co.kr/mypage/coupon';

// CHANGED: 확인 UX 강화를 위한 새 단계 추가 (A3-1 ~ A3-4)
type ModalStep = 'list' | 'confirm' | 'success' | 'confirmChange' | 'confirmCancel' | 'changeSuccess' | 'cancelSuccess';

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
    // CHANGED: '이해' 입력 확인용 state (A3-2, A3-3)
    const [confirmInput, setConfirmInput] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchApplications();
            setStep('list');
            setErrorMessage('');
            setConfirmInput('');
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

    // CHANGED: window.confirm 제거 → 모달 내 confirmChange/confirmCancel 단계로 전환 (A3-2, A3-3)
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
                if (status === '변경') {
                    setStep('changeSuccess');
                } else {
                    setStep('cancelSuccess');
                }
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

    // CHANGED: 변경/취소 확인 단계 시작 (A3-2, A3-3)
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

                    {/* 목록 */}
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

                                    {/* 체크인 정보 */}
                                    {application.checkInDate && (
                                        <div className="text-sm text-[#B0B0B0] mb-2">
                                            입실: {application.checkInDate} / {application.checkInSite}
                                        </div>
                                    )}

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

                                    {/* 액션 버튼 */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => startEdit(application)}
                                            className="flex-1 h-10 bg-[#01DF82] text-black font-bold text-sm rounded-lg hover:bg-[#00C972] transition-colors"
                                        >
                                            입실 정보 수정
                                        </button>
                                        {/* CHANGED: window.confirm → confirmChange 단계 (A3-2) */}
                                        <button
                                            onClick={() => startConfirmChange(application)}
                                            className="h-10 px-3 bg-[#2A2A2A] text-[#B0B0B0] text-sm rounded-lg hover:bg-[#333333] transition-colors"
                                        >
                                            변경
                                        </button>
                                        {/* CHANGED: window.confirm → confirmCancel 단계 (A3-3) */}
                                        <button
                                            onClick={() => startConfirmCancel(application)}
                                            className="h-10 px-3 bg-[#2A2A2A] text-red-400 text-sm rounded-lg hover:bg-[#333333] transition-colors"
                                        >
                                            취소
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* 카카오톡 문의 안내 */}
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

                    {/* CHANGED: 변경 확인 단계 — '이해' 입력 필요 (A3-2) */}
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
                                    변경 후 새로운 쿠폰 코드로 다시 예약해주세요.
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

                    {/* CHANGED: 취소 확인 단계 — '이해' 입력 필요 (A3-3) */}
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
                                    취소 후 되돌릴 수 없으며, 캠핑장 사업주에게 금전적 손해가 발생할 수 있습니다.
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

                    {/* CHANGED: 변경 완료 — 쿠폰 코드 재표시 (A3-1) */}
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

                            {/* 쿠폰 코드 재표시 */}
                            {selectedApplication.creatorCouponCode && (
                                <PartnerCouponDisplay
                                    label="크리에이터 쿠폰 코드"
                                    couponCode={selectedApplication.creatorCouponCode}
                                />
                            )}

                            {/* 캠핏 쿠폰 등록 CTA */}
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

                    {/* CHANGED: 취소 완료 — 카카오톡 안내 (A3-4) */}
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
