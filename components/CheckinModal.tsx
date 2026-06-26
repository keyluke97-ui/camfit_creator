'use client';

import { useState, useEffect, useRef } from 'react';
import type { Application } from '@/types';
// CHANGED: 협찬 조건 복사 텍스트는 통합 빌더(couponText)로 일원화 — 기존 쿠폰 헬퍼 import 제거
import { buildSponsorshipSummary } from '@/lib/couponText';
// CHANGED: 통합 — 쿠폰 박스 + 완료 목록 추출 (파일 크기 컨벤션 준수)
import { CheckinCouponBox, CompletedAppsList, ReservationCouponDone } from './CheckinSections';
// CHANGED: 캠냥이 마스코트 + 오브젝트 아이콘
import Mascot from './Mascot';
import BrandIcon from './BrandIcon';

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

    // CHANGED: 인라인 에러 메시지 (alert 대체)
    const [errorMessage, setErrorMessage] = useState('');
    // CHANGED: 협찬 조건 복사 피드백
    const [copiedAppId, setCopiedAppId] = useState<string | null>(null);

    // CHANGED: 더블클릭 방지용 동기적 잠금
    const isSavingRef = useRef(false);
    const isConfirmingRef = useRef(false);

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
            setErrorMessage(''); // CHANGED: 에러 메시지 초기화
            isSavingRef.current = false; // CHANGED: 잠금 해제
            isConfirmingRef.current = false; // CHANGED: 잠금 해제
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
            return;
        }

        // CHANGED: 통합 — couponEvent 캠페인이면 방문 가능 기간 클라이언트 검증 (서버는 미적용 — 프리미엄 신청은 입실 미리 등록 안 함)
        const app = applications.find(a => a.id === appId);
        if (app?.couponEvent) {
            const { visitStartDate, visitEndDate } = app.couponEvent;
            if (visitStartDate && data.date < visitStartDate) {
                setErrorMessage(`방문 가능 시작일(${visitStartDate}) 이후로 선택해주세요.`);
                return;
            }
            if (visitEndDate && data.date > visitEndDate) {
                setErrorMessage(`방문 가능 종료일(${visitEndDate}) 이전으로 선택해주세요.`);
                return;
            }
        }

        // CHANGED: 동기적 잠금으로 더블클릭 차단
        if (isSavingRef.current) return;
        isSavingRef.current = true;

        setSavingId(appId);
        setErrorMessage(''); // CHANGED: 이전 에러 초기화
        try {
            const res = await fetch('/api/applications/checkin', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recordId: appId,
                    checkInDate: data.date,
                    checkInSite: data.site,
                    // CHANGED: 변경(reservationStatus='변경') 상태에서 재등록하면 '재등록' 마커 기록
                    isReRegister: applications.find((a) => a.id === appId)?.reservationStatus === '변경'
                })
            });

            if (res.ok) {
                setApplications(prev => prev.map(a =>
                    a.id === appId
                        ? {
                            ...a,
                            checkInDate: data.date,
                            checkInSite: data.site,
                            // CHANGED: 재등록이면 로컬 상태도 '재등록'으로 반영
                            reservationStatus: a.reservationStatus === '변경' ? '재등록' : a.reservationStatus
                        }
                        : a
                ));
                setSavedIds(prev => new Set(prev).add(appId));
            } else {
                const errorData = await res.json();
                // CHANGED: alert → 인라인 에러 메시지
                setErrorMessage(errorData.error || '저장에 실패했습니다.');
            }
        } catch (error) {
            console.error('Save failed', error);
            setErrorMessage('네트워크 오류가 발생했습니다. 다시 시도해주세요.'); // CHANGED: catch에서도 인라인 에러
        } finally {
            setSavingId(null);
            isSavingRef.current = false; // CHANGED: 잠금 해제
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

        // CHANGED: 동기적 잠금으로 더블클릭 차단
        if (isConfirmingRef.current) return;
        isConfirmingRef.current = true;

        setIsProcessing(true);
        setErrorMessage(''); // CHANGED: 이전 에러 초기화
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
                    setApplications(prev => prev.filter(app => app.id !== selectedApp.id));
                }
                setStep(3);
            } else {
                const errorData = await res.json();
                // CHANGED: alert → 인라인 에러 메시지
                setErrorMessage(errorData.error || '요청 처리에 실패했습니다.');
            }
        } catch (error) {
            console.error('Action failed', error);
            setErrorMessage('네트워크 오류가 발생했습니다. 다시 시도해주세요.'); // CHANGED: catch에서도 인라인 에러
        } finally {
            setIsProcessing(false);
            isConfirmingRef.current = false; // CHANGED: 잠금 해제
        }
    };

    const handleBackToList = () => {
        setStep(1);
        setSelectedApp(null);
        setActionType(null);
        setConfirmInput('');
        setCouponInfo(null);
        setErrorMessage(''); // CHANGED: 목록으로 돌아갈 때 에러 초기화
    };

    // CHANGED: 협찬 조건 복사 — 신청완료(ApplicationModal)와 동일한 통합 빌더 사용(드리프트 제거)
    const handleCopyConditions = async (app: Application) => {
        const text = buildSponsorshipSummary({
            accommodationName: app.accommodationName,
            myCouponCode: app.couponCode,
            deadline: app.deadline,
            highlights: app.highlights,
            detailUrl: app.detailUrl,
            couponEvent: app.couponEvent,
            followerCouponCode: app.followerCouponCode,
        });
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
        setCopiedAppId(app.id);
        setTimeout(() => setCopiedAppId(null), 2000);
    };

    if (!isOpen) return null;

    // 앱이 등록 완료 상태인지 확인
    const isRegistered = (app: Application) => !!(app.checkInDate && app.checkInSite);

    // CHANGED: 입실일 지난 캠페인 분리 + 정렬
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const isPast = (app: Application) => isRegistered(app) && app.checkInDate < today;

    const activeApps = applications
        .filter(app => !isPast(app))
        .sort((a, b) => {
            // 미등록이 가장 위
            const aRegistered = isRegistered(a);
            const bRegistered = isRegistered(b);
            if (!aRegistered && bRegistered) return -1;
            if (aRegistered && !bRegistered) return 1;
            // 등록된 것끼리는 입실일 가까운 순
            if (a.checkInDate && b.checkInDate) return a.checkInDate.localeCompare(b.checkInDate);
            return 0;
        });

    const completedApps = applications
        .filter(app => isPast(app))
        .sort((a, b) => b.checkInDate.localeCompare(a.checkInDate)); // 최근 완료 순

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-card w-full max-w-lg rounded-2xl border border-line shadow-2xl relative max-h-[90vh] flex flex-col">
                {/* 헤더 */}
                <div className="p-5 border-b border-line flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold text-ink">
                        {step === 1 && '입실 일정 등록'}
                        {step === 2 && (actionType === 'change' ? '예약 변경 확인' : '신청 취소 확인')}
                        {step === 3 && (actionType === 'change' ? '예약 변경 완료' : '신청 취소 완료')}
                    </h2>
                    {step === 1 && (
                        <button onClick={onClose} className="text-ink3 hover:text-ink">
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
                            <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : step === 1 ? (
                        /* Step 1: 카드 리스트 */
                        applications.length === 0 ? (
                            <div className="text-center py-10 text-ink3 bg-page rounded-lg">
                                <p>프리미엄 협찬 신청 내역이 없습니다.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* CHANGED: 활성 캠페인 (미등록 우선 + 입실일 가까운 순) */}
                                {activeApps.map(app => (
                                    <div
                                        key={app.id}
                                        className="bg-page border border-line rounded-xl p-4 space-y-4"
                                    >
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-ink font-bold text-lg">{app.accommodationName}</h3>
                                            {/* CHANGED: 통합 — 쿠폰 협찬 캠페인 식별 뱃지 (코드 있거나 couponEvent 둘 중 하나만 있어도) */}
                                            {(app.couponEvent || app.followerCouponCode) && (
                                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-brand-bg text-brand-strong border border-brand/30 rounded-full">
                                                    <BrandIcon name="coupon" size={13} /> 팔로워 쿠폰 협찬
                                                </span>
                                            )}
                                        </div>

                                        {/* CHANGED: 통합 — followerCouponCode 있으면 코드 박스 노출 (추출: CheckinCouponBox) */}
                                        {app.followerCouponCode && <CheckinCouponBox app={app} />}

                                        {isRegistered(app) ? (
                                            <div className="space-y-3">
                                                <div className="flex gap-4">
                                                    <div className="flex-1">
                                                        <span className="text-xs text-ink3">입실일</span>
                                                        <p className="text-ink font-medium">{app.checkInDate}</p>
                                                    </div>
                                                    <div className="flex-1">
                                                        <span className="text-xs text-ink3">입실 사이트</span>
                                                        <p className="text-ink font-medium">{app.checkInSite}</p>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-brand-strong font-medium flex items-center gap-1"><BrandIcon name="sparkle" size={15} />예약 정보가 저장되었습니다.</p>

                                                {/* CHANGED: 협찬 조건 복사 버튼 */}
                                                <button
                                                    onClick={() => handleCopyConditions(app)}
                                                    className="w-full h-9 bg-subtle border border-strong text-ink rounded-lg text-xs hover:bg-subtle-hover transition-colors flex items-center justify-center gap-1.5"
                                                >
                                                    {copiedAppId === app.id ? (
                                                        <><svg className="w-3.5 h-3.5 text-brand-strong" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>복사 완료!</>
                                                    ) : (
                                                        <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>협찬 조건 복사</>
                                                    )}
                                                </button>

                                                <div className="grid grid-cols-2 gap-2 pt-1">
                                                    <button
                                                        onClick={() => handleActionStart(app, 'change')}
                                                        className="h-10 border border-strong text-ink3 rounded-lg text-sm hover:bg-subtle transition-colors"
                                                    >
                                                        예약 변경
                                                    </button>
                                                    <button
                                                        onClick={() => handleActionStart(app, 'cancel')}
                                                        className="h-10 border border-red-500/30 text-red-500 rounded-lg text-sm hover:bg-red-500/10 transition-colors"
                                                    >
                                                        신청 취소
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <div className="flex gap-3">
                                                    <div className="flex-1">
                                                        <label className="text-xs text-ink3 mb-1 block">입실일</label>
                                                        <input
                                                            type="date"
                                                            className="w-full h-10 bg-card border border-line rounded-lg px-3 text-ink text-sm focus:border-brand outline-none"
                                                            value={formData[app.id]?.date || ''}
                                                            onChange={(e) => handleInputChange(app.id, 'date', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="text-xs text-ink3 mb-1 block">입실 사이트</label>
                                                        <input
                                                            type="text"
                                                            placeholder="예: A-1"
                                                            className="w-full h-10 bg-card border border-line rounded-lg px-3 text-ink text-sm focus:border-brand outline-none"
                                                            value={formData[app.id]?.site || ''}
                                                            onChange={(e) => handleInputChange(app.id, 'site', e.target.value)}
                                                        />
                                                    </div>
                                                </div>

                                                {/* CHANGED: 협찬 조건 복사 버튼 (미등록 상태에서도 표시) */}
                                                <button
                                                    onClick={() => handleCopyConditions(app)}
                                                    className="w-full h-9 bg-subtle border border-strong text-ink rounded-lg text-xs hover:bg-subtle-hover transition-colors flex items-center justify-center gap-1.5"
                                                >
                                                    {copiedAppId === app.id ? (
                                                        <><svg className="w-3.5 h-3.5 text-brand-strong" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>복사 완료!</>
                                                    ) : (
                                                        <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>협찬 조건 복사</>
                                                    )}
                                                </button>

                                                <button
                                                    onClick={() => handleSave(app.id)}
                                                    disabled={savingId === app.id || !formData[app.id]?.date || !formData[app.id]?.site}
                                                    className="w-full h-11 bg-brand text-black font-bold rounded-lg hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {savingId === app.id ? '저장 중...' : '등록하기'}
                                                </button>

                                                {savedIds.has(app.id) && (
                                                    <p className="text-sm text-brand-strong text-center font-medium">✅ 저장 완료!</p>
                                                )}

                                                {/* CHANGED: 입실 미등록 상태에서도 예약 취소 가능 (변경 후 재예약 안 하고 취소하는 경우 포함) */}
                                                <button
                                                    onClick={() => handleActionStart(app, 'cancel')}
                                                    className="w-full h-9 border border-red-500/30 text-red-500 rounded-lg text-xs hover:bg-red-500/10 transition-colors"
                                                >
                                                    신청 취소
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* CHANGED: 완료된 캠페인 (입실일 지난 것) — 추출: CompletedAppsList */}
                                <CompletedAppsList apps={completedApps} />
                            </div>
                        )
                    ) : step === 2 ? (
                        /* Step 2: 확인 화면 */
                        <div className="space-y-6">
                            <div className="bg-subtle p-4 rounded-lg space-y-3 text-sm text-ink2">
                                {actionType === 'change' ? (
                                    <>
                                        <h3 className="text-ink font-bold text-lg mb-2 flex items-center gap-1.5"><BrandIcon name="calendar" size={20} />예약 변경 안내</h3>
                                        <p>
                                            <span className="text-brand-strong">제작 기한 준수</span>: 캠지기님이 설정한 제작 기한 안에 방문 후 콘텐츠 제작이 가능해야 합니다.
                                        </p>
                                        <p>변경 절차 완료 시 기존 예약 정보가 초기화되며, <strong className="text-ink">내 예약 쿠폰 코드</strong>를 통해 새로운 일정으로 재예약하셔야 합니다.</p>
                                    </>
                                ) : (
                                    <>
                                        <h3 className="text-ink font-bold text-lg mb-2">⚠️ 신청 취소 주의사항</h3>
                                        <p className="text-red-500">
                                            프리미엄 협찬의 경우 취소가 반복될 경우 <strong>향후 참여가 제한</strong>될 수 있습니다.
                                        </p>
                                        <p>취소 시 해당 일정 예약 불가로 인해 캠핑장 사업주에게 실질적인 금전적 손해가 발생합니다.</p>
                                    </>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-ink mb-2">
                                    위 내용을 이해하셨다면 <span className="text-brand-strong">'이해'</span>를 입력해주세요.
                                </label>
                                <input
                                    type="text"
                                    value={confirmInput}
                                    onChange={(e) => setConfirmInput(e.target.value)}
                                    placeholder="이해"
                                    className="w-full h-12 px-4 bg-page border border-line rounded-lg text-ink focus:border-brand focus:outline-none transition-colors"
                                />
                            </div>
                        </div>
                    ) : (
                        /* Step 3: 완료 화면 */
                        <div className="space-y-6 text-center py-4">
                            {/* CHANGED: 체크 SVG → 캠냥이 마스코트 (변경 완료=인사 smile / 취소=미안 sorry) */}
                            <div className="flex justify-center">
                                <Mascot expression={actionType === 'change' ? 'smile' : 'sorry'} size={104} priority />
                            </div>

                            {actionType === 'change' && couponInfo ? (
                                <>
                                    <h3 className="text-xl font-bold text-ink">예약 변경이 완료되었습니다!</h3>
                                    {/* CHANGED: 추출 — 내 예약 쿠폰 박스 + 자동복사/새 탭 CTA (CheckinSections) */}
                                    <ReservationCouponDone code={couponInfo.code} />
                                </>
                            ) : (
                                <>
                                    <h3 className="text-xl font-bold text-ink">예약이 취소되었습니다.</h3>
                                    <p className="text-ink2">취소 관련 문의는 카카오톡 채널로 연락주세요.</p>
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

                {/* CHANGED: 인라인 에러 메시지 표시 (alert 대체) */}
                {errorMessage && (
                    <div className="px-5 pb-2">
                        <p className="text-red-500 text-sm text-center font-medium animate-pulse">
                            {errorMessage}
                        </p>
                    </div>
                )}

                {/* 푸터 버튼 */}
                {step === 2 && (
                    <div className="p-5 border-t border-line flex gap-3 flex-shrink-0">
                        <button
                            onClick={handleBackToList}
                            className="flex-1 h-12 bg-subtle text-ink font-medium rounded-lg hover:bg-subtle-hover transition-colors"
                        >
                            취소
                        </button>
                        <button
                            onClick={handleConfirmAction}
                            disabled={confirmInput !== '이해' || isProcessing}
                            className={`flex-[2] h-12 font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${actionType === 'cancel'
                                ? 'bg-red-500 text-white hover:bg-red-600'
                                : 'bg-brand text-black hover:bg-brand-hover'
                                }`}
                        >
                            {isProcessing ? '처리 중...' : '확인'}
                        </button>
                    </div>
                )}

                {step === 3 && (
                    <div className="p-5 border-t border-line flex-shrink-0">
                        <button
                            onClick={handleBackToList}
                            className="w-full h-12 bg-subtle text-ink font-medium rounded-lg hover:bg-subtle-hover transition-colors"
                        >
                            목록으로 돌아가기
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
