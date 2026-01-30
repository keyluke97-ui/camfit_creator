'use client';

import { useState, useEffect } from 'react';
import type { Application } from '@/types';

interface CheckinModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CheckinModal({ isOpen, onClose }: CheckinModalProps) {
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedAppId, setSelectedAppId] = useState<string>('');
    const [checkInDate, setCheckInDate] = useState('');
    const [checkInSite, setCheckInSite] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // UI State
    const [mode, setMode] = useState<'read' | 'write' | 'none'>('none');
    const [message, setMessage] = useState(''); // Success or Error message
    const [couponInfo, setCouponInfo] = useState<{ code: string; url: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchApplications();
            // Reset states
            setMessage('');
            setCouponInfo(null);
            setMode('none');
            setSelectedAppId('');
            setCheckInDate('');
            setCheckInSite('');
        }
    }, [isOpen]);

    const fetchApplications = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/applications/my');
            const data = await res.json();

            if (res.ok) {
                setApplications(data.applications || []);
            } else {
                console.error(data.error);
            }
        } catch (error) {
            console.error('Failed to fetch applications', error);
        } finally {
            setLoading(false);
        }
    };

    // 신청 건 선택 시 모드 결정
    const handleSelectApplication = (appId: string) => {
        setSelectedAppId(appId);
        const app = applications.find(a => a.id === appId);

        if (app) {
            // 이미 입실 정보가 있으면 Read Mode, 없으면 Write Mode
            // 단, 예약 변경/취소 상태가 '변경'이거나 '취소'이면 WriteMode (혹은 초기화된 상태) 일 수 있음
            // 로직: 입실일이 있으면 ReadMode
            if (app.checkInDate && app.checkInSite) {
                setMode('read');
                setCheckInDate(app.checkInDate);
                setCheckInSite(app.checkInSite);
            } else {
                setMode('write');
                setCheckInDate('');
                setCheckInSite('');
            }
            // 메시지 초기화
            setMessage('');
            setCouponInfo(null);
        }
    };

    const handleSave = async () => {
        if (!selectedAppId || !checkInDate || !checkInSite) {
            alert('입실일과 입실 사이트를 모두 입력해주세요.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/applications/checkin', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recordId: selectedAppId,
                    checkInDate,
                    checkInSite
                })
            });

            if (res.ok) {
                setMessage('입실 정보가 성공적으로 저장되었습니다.');
                // 로컬 데이터 업데이트 및 모드 전환
                setApplications(prev => prev.map(app =>
                    app.id === selectedAppId
                        ? { ...app, checkInDate, checkInSite }
                        : app
                ));
                setMode('read');
            } else {
                const data = await res.json();
                alert(data.error || '저장에 실패했습니다.');
            }
        } catch (error) {
            alert('오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // 예약 변경 플로우
    const handleChangeReservation = async () => {
        const confirmed = window.confirm('캠지기님이 설정한 제작 기한 안에 방문 후 콘텐츠 제작이 가능해야 합니다.\n이에 동의하시나요?');
        if (!confirmed) return;

        const app = applications.find(a => a.id === selectedAppId);
        if (!app) return;

        setIsSubmitting(true);
        try {
            // 1. 상태 업데이트 및 데이터 초기화 API 호출
            const res = await fetch('/api/applications/status', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recordId: selectedAppId,
                    status: '변경'
                })
            });

            if (res.ok) {
                // 2. 쿠폰 정보 노출
                setCouponInfo({
                    code: app.couponCode || '쿠폰코드 없음',
                    url: 'https://camfit.co.kr/mypage/coupons' // 예시 URL, 실제 외부 링크로 교체 필요
                });

                // 3. 로컬 상태 업데이트 (초기화)
                setApplications(prev => prev.map(a =>
                    a.id === selectedAppId
                        ? { ...a, checkInDate: '', checkInSite: '', reservationStatus: '변경' }
                        : a
                ));
                setMode('write'); // 다시 쓰기 모드로 전환 (혹은 쿠폰만 보여주고 닫기?)
                // 여기서는 쿠폰 정보를 보여주는 것으로 완료
            } else {
                alert('요청 처리에 실패했습니다.');
            }
        } catch (error) {
            console.error(error);
            alert('오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // 예약 취소 플로우
    const handleCancelReservation = async () => {
        const confirmed = window.confirm('프리미엄 협찬의 경우 취소가 반복될 경우 향후 참여가 어려울 수 있습니다.\n정말 취소하시겠습니까?');
        if (!confirmed) return;

        setIsSubmitting(true);
        try {
            // 1. 상태 업데이트 (취소)
            const res = await fetch('/api/applications/status', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recordId: selectedAppId,
                    status: '취소'
                })
            });

            if (res.ok) {
                alert('예약이 취소되었습니다. 카카오톡 채널로 이동합니다.');
                window.open('http://pf.kakao.com/_fBxaQG', '_blank');
                onClose(); // 모달 닫기
            } else {
                alert('요청 처리에 실패했습니다.');
            }
        } catch (error) {
            console.error(error);
            alert('오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const copyCouponCode = () => {
        if (couponInfo?.code) {
            navigator.clipboard.writeText(couponInfo.code);
            alert('쿠폰 코드가 복사되었습니다.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#1E1E1E] w-full max-w-md rounded-2xl p-6 border border-[#333333] shadow-2xl relative max-h-[90vh] overflow-y-auto">
                {/* 닫기 버튼 */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-[#888888] hover:text-white"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <h2 className="text-xl font-bold text-white mb-6">입실 일정 등록 및 관리</h2>

                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="w-8 h-8 border-2 border-[#01DF82] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : applications.length === 0 ? (
                    <div className="text-center py-10 text-[#888888] bg-[#111111] rounded-lg">
                        <p>프리미엄 협찬 신청 내역이 없습니다.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* 1. 협찬 선택 */}
                        <div>
                            <label className="block text-sm text-[#B0B0B0] mb-2">협찬 내역 선택</label>
                            <select
                                className="w-full h-12 bg-[#111111] border border-[#333333] rounded-lg px-4 text-white focus:border-[#01DF82] outline-none"
                                value={selectedAppId}
                                onChange={(e) => handleSelectApplication(e.target.value)}
                            >
                                <option value="">선택해주세요</option>
                                {applications.map(app => (
                                    <option key={app.id} value={app.id}>
                                        {app.accommodationName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* 선택된 내역이 있을 때만 표시 */}
                        {selectedAppId && (
                            <>
                                {/* 쿠폰 정보 (예약 변경 시 노출) */}
                                {couponInfo && (
                                    <div className="p-4 bg-[#01DF82]/10 border border-[#01DF82]/30 rounded-lg animate-fade-in text-center">
                                        <p className="text-sm text-[#01DF82] mb-2 font-bold">재예약을 위한 쿠폰 코드입니다.</p>
                                        <div className="flex items-center gap-2 justify-center mb-3">
                                            <code className="bg-[#111111] px-3 py-1 rounded text-white font-mono">
                                                {couponInfo.code}
                                            </code>
                                            <button
                                                onClick={copyCouponCode}
                                                className="text-xs bg-[#333333] px-2 py-1 rounded text-[#B0B0B0]"
                                            >
                                                복사
                                            </button>
                                        </div>
                                        <a
                                            href="https://camfit.co.kr/mypage/coupons"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-block text-xs text-white bg-[#01DF82] px-3 py-2 rounded-lg font-bold hover:bg-[#00C972]"
                                        >
                                            캠핏 쿠폰 등록하러 가기 &rarr;
                                        </a>
                                        <p className="text-xs text-[#666666] mt-2">
                                            위 링크로 이동하여 쿠폰을 등록하고 변경된 일정으로 예약해주세요.
                                        </p>
                                    </div>
                                )}

                                {/* 모드별 UI */}
                                {mode === 'write' && !couponInfo && (
                                    <div className="space-y-4 animate-fade-in">
                                        <div>
                                            <label className="block text-sm text-[#B0B0B0] mb-2">입실일</label>
                                            <input
                                                type="date"
                                                className="w-full h-12 bg-[#111111] border border-[#333333] rounded-lg px-4 text-white focus:border-[#01DF82] outline-none"
                                                value={checkInDate}
                                                onChange={(e) => setCheckInDate(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-[#B0B0B0] mb-2">입실 사이트</label>
                                            <input
                                                type="text"
                                                placeholder="예: A1, B3"
                                                className="w-full h-12 bg-[#111111] border border-[#333333] rounded-lg px-4 text-white focus:border-[#01DF82] outline-none"
                                                value={checkInSite}
                                                onChange={(e) => setCheckInSite(e.target.value)}
                                            />
                                        </div>
                                        <button
                                            onClick={handleSave}
                                            disabled={isSubmitting}
                                            className="w-full h-12 bg-[#01DF82] text-black font-bold rounded-lg hover:bg-[#00C972] transition-colors disabled:opacity-50"
                                        >
                                            {isSubmitting ? '저장 중...' : '저장하기'}
                                        </button>
                                    </div>
                                )}

                                {mode === 'read' && !couponInfo && (
                                    <div className="space-y-4 animate-fade-in">
                                        {/* 완료 상태 메시지 */}
                                        <div className="p-4 bg-[#111111] border border-[#333333] rounded-lg text-center">
                                            <div className="flex flex-col gap-1 mb-2">
                                                <span className="text-xs text-[#888888]">등록된 입실일</span>
                                                <span className="text-white font-bold">{checkInDate}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs text-[#888888]">등록된 사이트</span>
                                                <span className="text-white font-bold">{checkInSite}</span>
                                            </div>
                                            <p className="mt-4 text-sm text-[#01DF82] font-bold">✨ 예약 정보가 저장되었습니다.</p>
                                        </div>

                                        {/* 액션 버튼 */}
                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <button
                                                onClick={handleChangeReservation}
                                                className="h-10 border border-[#444444] text-[#CCCCCC] rounded-lg text-sm hover:bg-[#2A2A2A]"
                                            >
                                                예약 변경
                                            </button>
                                            <button
                                                onClick={handleCancelReservation}
                                                className="h-10 border border-red-500/30 text-red-500 rounded-lg text-sm hover:bg-red-500/10"
                                            >
                                                예약 취소
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
