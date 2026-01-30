'use client';

import { useState, useEffect } from 'react';
import type { Application } from '@/types';

interface CheckinModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type ActionType = 'change' | 'cancel' | null;

export default function CheckinModal({ isOpen, onClose }: CheckinModalProps) {
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(false);

    // 각 application별 입력 데이터
    const [formData, setFormData] = useState<Record<string, { date: string; site: string }>>({});

    // 저장 상태 추적
    const [savingId, setSavingId] = useState<string | null>(null);
    const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

    // 예약 변경/취소 플로우
    const [step, setStep] = useState(1); // 1: 리스트, 2: 확인, 3: 완료
    const [selectedApp, setSelectedApp] = useState<Application | null>(null);
    const [actionType, setActionType] = useState<ActionType>(null);
    const [confirmInput, setConfirmInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [couponInfo, setCouponInfo] = useState<{ code: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchApplications();
            // Reset all states
            setStep(1);
            setSelectedApp(null);
            setActionType(null);
            setConfirmInput('');
            setCouponInfo(null);
            setSavedIds(new Set());
        }
    }, [isOpen]);

    const fetchApplications = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/applications/my');
            const data = await res.json();

            if (res.ok) {
                const apps = data.applications || [];
                setApplications(apps);
                // 기존 데이터로 formData 초기화
                const initialData: Record<string, { date: string; site: string }> = {};
                apps.forEach((app: Application) => {
                    initialData[app.id] = {
                        date: app.checkInDate || '',
                        site: app.checkInSite || ''
                    };
                });
                setFormData(initialData);
            } else {
                console.error(data.error);
            }
        } catch (error) {
            console.error('Failed to fetch applications', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (appId: string, field: 'date' | 'site', value: string) => {
        setFormData(prev => ({
            ...prev,
            [appId]: {
                ...prev[appId],
                [field]: value
            }
        }));
    };

    const handleSave = async (appId: string) => {
        const data = formData[appId];
        if (!data?.date || !data?.site) {
            return; // 유효성 검사 실패 시 무시
        }

        setSavingId(appId);
        try {
            const res = await fetch('/api/applications/checkin', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recordId: appId,
                    checkInDate: data.date,
                    checkInSite: data.site
                })
            });

            if (res.ok) {
                // 로컬 상태 업데이트
                setApplications(prev => prev.map(app =>
                    app.id === appId
                        ? { ...app, checkInDate: data.date, checkInSite: data.site }
                        : app
                ));
                setSavedIds(prev => new Set(prev).add(appId));
            }
        } catch (error) {
            console.error('Save failed', error);
        } finally {
            setSavingId(null);
        }
    };

    // 예약 변경/취소 시작
    const handleActionStart = (app: Application, action: ActionType) => {
        setSelectedApp(app);
        setActionType(action);
        setConfirmInput('');
        setStep(2);
    };

    // 확인 후 실행
    const handleConfirmAction = async () => {
        if (confirmInput !== '이해') return;
        if (!selectedApp || !actionType) return;

        setIsProcessing(true);
        try {
            const res = await fetch('/api/applications/status', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recordId: selectedApp.id,
                    status: actionType === 'change' ? '변경' : '취소'
                })
            });

            if (res.ok) {
                if (actionType === 'change') {
                    setCouponInfo({ code: selectedApp.couponCode || '쿠폰코드 없음' });
                    // 로컬 상태 업데이트
                    setApplications(prev => prev.map(app =>
                        app.id === selectedApp.id
                            ? { ...app, checkInDate: '', checkInSite: '', reservationStatus: '변경' }
                            : app
                    ));
                    setFormData(prev => ({
                        ...prev,
                        [selectedApp.id]: { date: '', site: '' }
                    }));
                } else {
                    // 취소 시 목록에서 제거
                    setApplications(prev => prev.filter(app => app.id !== selectedApp.id));
                }
                setStep(3);
            }
        } catch (error) {
            console.error('Action failed', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBackToList = () => {
        setStep(1);
        setSelectedApp(null);
        setActionType(null);
        setConfirmInput('');
        setCouponInfo(null);
    };

    if (!isOpen) return null;

    // 앱이 등록 완료 상태인지 확인
    const isRegistered = (app: Application) => !!(app.checkInDate && app.checkInSite);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#1E1E1E] w-full max-w-lg rounded-2xl border border-[#333333] shadow-2xl relative max-h-[90vh] flex flex-col">
                {/* 헤더 */}
                <div className="p-5 border-b border-[#333333] flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold text-white">
                        {step === 1 && '입실 일정 등록'}
                        {step === 2 && (actionType === 'change' ? '예약 변경 확인' : '예약 취소 확인')}
                        {step === 3 && (actionType === 'change' ? '예약 변경 완료' : '예약 취소 완료')}
                    </h2>
                    {step === 1 && (
                        <button onClick={onClose} className="text-[#888888] hover:text-white">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* 콘텐츠 */}
                <div className="flex-1 overflow-y-auto p-5">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="w-8 h-8 border-2 border-[#01DF82] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : step === 1 ? (
                        /* Step 1: 카드 리스트 */
                        applications.length === 0 ? (
                            <div className="text-center py-10 text-[#888888] bg-[#111111] rounded-lg">
                                <p>프리미엄 협찬 신청 내역이 없습니다.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {applications.map(app => (
                                    <div
                                        key={app.id}
                                        className="bg-[#111111] border border-[#333333] rounded-xl p-4 space-y-4"
                                    >
                                        {/* 캠핑장 이름 */}
                                        <h3 className="text-white font-bold text-lg">{app.accommodationName}</h3>

                                        {isRegistered(app) ? (
                                            /* 등록 완료 상태 */
                                            <div className="space-y-3">
                                                <div className="flex gap-4">
                                                    <div className="flex-1">
                                                        <span className="text-xs text-[#888888]">입실일</span>
                                                        <p className="text-white font-medium">{app.checkInDate}</p>
                                                    </div>
                                                    <div className="flex-1">
                                                        <span className="text-xs text-[#888888]">입실 사이트</span>
                                                        <p className="text-white font-medium">{app.checkInSite}</p>
                                                    </div>
                                                </div>

                                                {/* 저장 완료 메시지 */}
                                                <p className="text-sm text-[#01DF82] font-medium">✨ 예약 정보가 저장되었습니다.</p>

                                                {/* 변경/취소 버튼 */}
                                                <div className="grid grid-cols-2 gap-2 pt-2">
                                                    <button
                                                        onClick={() => handleActionStart(app, 'change')}
                                                        className="h-10 border border-[#444444] text-[#CCCCCC] rounded-lg text-sm hover:bg-[#2A2A2A] transition-colors"
                                                    >
                                                        예약 변경
                                                    </button>
                                                    <button
                                                        onClick={() => handleActionStart(app, 'cancel')}
                                                        className="h-10 border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-500/10 transition-colors"
                                                    >
                                                        예약 취소
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* 미등록 상태 - 입력 폼 */
                                            <div className="space-y-3">
                                                <div className="flex gap-3">
                                                    <div className="flex-1">
                                                        <label className="text-xs text-[#888888] mb-1 block">입실일</label>
                                                        <input
                                                            type="date"
                                                            className="w-full h-10 bg-[#1E1E1E] border border-[#333333] rounded-lg px-3 text-white text-sm focus:border-[#01DF82] outline-none"
                                                            value={formData[app.id]?.date || ''}
                                                            onChange={(e) => handleInputChange(app.id, 'date', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="text-xs text-[#888888] mb-1 block">입실 사이트</label>
                                                        <input
                                                            type="text"
                                                            placeholder="예: A-1"
                                                            className="w-full h-10 bg-[#1E1E1E] border border-[#333333] rounded-lg px-3 text-white text-sm focus:border-[#01DF82] outline-none"
                                                            value={formData[app.id]?.site || ''}
                                                            onChange={(e) => handleInputChange(app.id, 'site', e.target.value)}
                                                        />
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => handleSave(app.id)}
                                                    disabled={savingId === app.id || !formData[app.id]?.date || !formData[app.id]?.site}
                                                    className="w-full h-11 bg-[#01DF82] text-black font-bold rounded-lg hover:bg-[#00C972] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {savingId === app.id ? '저장 중...' : '등록하기'}
                                                </button>

                                                {savedIds.has(app.id) && (
                                                    <p className="text-sm text-[#01DF82] text-center font-medium">✅ 저장 완료!</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )
                    ) : step === 2 ? (
                        /* Step 2: 확인 화면 */
                        <div className="space-y-6">
                            <div className="bg-[#2A2A2A] p-4 rounded-lg space-y-3 text-sm text-[#B0B0B0]">
                                {actionType === 'change' ? (
                                    <>
                                        <h3 className="text-white font-bold text-lg mb-2">📅 예약 변경 안내</h3>
                                        <p>
                                            <span className="text-[#01DF82]">제작 기한 준수</span>: 캠지기님이 설정한 제작 기한 안에 방문 후 콘텐츠 제작이 가능해야 합니다.
                                        </p>
                                        <p>변경 절차 완료 시 기존 예약 정보가 초기화되며, <strong className="text-white">쿠폰 코드</strong>를 통해 새로운 일정으로 재예약하셔야 합니다.</p>
                                    </>
                                ) : (
                                    <>
                                        <h3 className="text-white font-bold text-lg mb-2">⚠️ 예약 취소 주의사항</h3>
                                        <p className="text-red-400">
                                            프리미엄 협찬의 경우 취소가 반복될 경우 <strong>향후 참여가 제한</strong>될 수 있습니다.
                                        </p>
                                        <p>취소 시 해당 일정 예약 불가로 인해 캠핑장 사업주에게 실질적인 금전적 손해가 발생합니다.</p>
                                    </>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    위 내용을 이해하셨다면 <span className="text-[#01DF82]">'이해'</span>를 입력해주세요.
                                </label>
                                <input
                                    type="text"
                                    value={confirmInput}
                                    onChange={(e) => setConfirmInput(e.target.value)}
                                    placeholder="이해"
                                    className="w-full h-12 px-4 bg-[#111] border border-[#333] rounded-lg text-white focus:border-[#01DF82] focus:outline-none transition-colors"
                                />
                            </div>
                        </div>
                    ) : (
                        /* Step 3: 완료 화면 */
                        <div className="space-y-6 text-center py-4">
                            <div className="w-16 h-16 mx-auto bg-[#01DF82]/20 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-[#01DF82]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>

                            {actionType === 'change' && couponInfo ? (
                                <>
                                    <h3 className="text-xl font-bold text-white">예약 변경이 완료되었습니다!</h3>
                                    <div className="bg-[#2A2A2A] border border-[#01DF82] p-6 rounded-xl space-y-4">
                                        <p className="text-[#B0B0B0] text-sm">재예약을 위한 쿠폰 코드</p>
                                        <p className="text-2xl font-mono font-bold text-[#01DF82] tracking-wider break-all">
                                            {couponInfo.code}
                                        </p>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(couponInfo.code);
                                            }}
                                            className="px-6 py-2 bg-[#111] border border-[#333] rounded-full text-white text-sm font-medium hover:bg-[#333] transition-colors"
                                        >
                                            코드 복사하기
                                        </button>
                                    </div>
                                    <a
                                        href="https://camfit.co.kr/mypage/coupon/register"
                                        rel="noreferrer"
                                        className="block w-full h-14 flex items-center justify-center bg-[#01DF82] text-black font-bold text-lg rounded-xl hover:bg-[#00C972] transition-colors"
                                    >
                                        캠핏 쿠폰 등록하러 가기
                                    </a>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-xl font-bold text-white">예약이 취소되었습니다.</h3>
                                    <p className="text-[#B0B0B0]">취소 관련 문의는 카카오톡 채널로 연락주세요.</p>
                                    <a
                                        href="http://pf.kakao.com/_fBxaQG"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-block px-6 py-3 bg-[#FEE500] text-black font-bold rounded-xl hover:bg-[#E5D000] transition-colors"
                                    >
                                        카카오톡 채널 문의하기
                                    </a>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* 푸터 버튼 */}
                {step === 2 && (
                    <div className="p-5 border-t border-[#333333] flex gap-3 flex-shrink-0">
                        <button
                            onClick={handleBackToList}
                            className="flex-1 h-12 bg-[#2A2A2A] text-white font-medium rounded-lg hover:bg-[#333] transition-colors"
                        >
                            취소
                        </button>
                        <button
                            onClick={handleConfirmAction}
                            disabled={confirmInput !== '이해' || isProcessing}
                            className={`flex-[2] h-12 font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${actionType === 'cancel'
                                    ? 'bg-red-500 text-white hover:bg-red-600'
                                    : 'bg-[#01DF82] text-black hover:bg-[#00C972]'
                                }`}
                        >
                            {isProcessing ? '처리 중...' : '확인'}
                        </button>
                    </div>
                )}

                {step === 3 && (
                    <div className="p-5 border-t border-[#333333] flex-shrink-0">
                        <button
                            onClick={handleBackToList}
                            className="w-full h-12 bg-[#2A2A2A] text-white font-medium rounded-lg hover:bg-[#333] transition-colors"
                        >
                            목록으로 돌아가기
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
