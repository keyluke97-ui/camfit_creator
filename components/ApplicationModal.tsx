'use client';

import { useState, useRef, useEffect } from 'react';
import type { Campaign, ChannelType } from '@/types';
// CHANGED: 등록 페이지 상수
import { COUPON_REGISTER_URL } from '@/lib/constants';
// CHANGED: 협찬 조건/팔로워 메시지 통합 빌더 (handleCopyConditions와 단일 소스 공유)
import { buildSponsorshipSummary, buildFollowerShareMessage, type SponsorshipTextInput } from '@/lib/couponText';
// CHANGED: 통합 — 쿠폰 이벤트 UI 블록 추출 (파일 크기 컨벤션 준수)
import { CouponEventSummary, FollowerCouponCallout } from './ApplicationCouponSections';
// CHANGED: 콘텐츠 제작 필수사항 블록 추출
import ContentRequirements from './ContentRequirements';
// CHANGED: 캠냥이 마스코트 + 오브젝트 아이콘
import Mascot from './Mascot';
import BrandIcon from './BrandIcon';

interface ApplicationModalProps {
    isOpen: boolean;
    onClose: () => void;
    campaign: Campaign;
    channelTypes?: ChannelType[]; // CHANGED: 콘텐츠 제작 필수사항 표시용
}

export default function ApplicationModal({ isOpen, onClose, campaign, channelTypes }: ApplicationModalProps) {
    const [step, setStep] = useState(1);
    const [inputValue, setInputValue] = useState('');
    const [inputValues2, setInputValues2] = useState({ understand: '', agree: '' });
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [couponCode, setCouponCode] = useState('');
    const [followerCouponCode, setFollowerCouponCode] = useState(''); // CHANGED: 통합 — 분배된 본인 팔로워 쿠폰 코드
    const [isCopied, setIsCopied] = useState(false);
    const [isHighlightsExpanded, setIsHighlightsExpanded] = useState(false); // CHANGED: Step 3 캠지기 포인트 접기/펼치기
    const [isFollowerExpanded, setIsFollowerExpanded] = useState(false); // CHANGED: 쿠폰 혼동 해소 — 팔로워 쿠폰 기본 접힘(등록 순간 분리)
    const [isMineCtaCopied, setIsMineCtaCopied] = useState(false); // CHANGED: 등록 CTA가 내 예약 쿠폰 자동복사했는지 피드백

    const modalRef = useRef<HTMLDivElement>(null);
    // CHANGED: 더블클릭 방지용 동기적 잠금 (React state는 비동기라 race condition 발생 가능)
    const isSubmittingRef = useRef(false);

    // 모달 외부 클릭 시 닫기 방지 (중요한 프로세스이므로)

    // 초기화
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setInputValue('');
            setInputValues2({ understand: '', agree: '' });
            setEmail('');
            setError('');
            setCouponCode('');
            setFollowerCouponCode(''); // CHANGED: 통합
            setIsFollowerExpanded(false); // CHANGED: 재오픈 시 팔로워 쿠폰 다시 접힘
            setIsMineCtaCopied(false); // CHANGED: 재오픈 시 CTA 복사 피드백 초기화
            isSubmittingRef.current = false; // CHANGED: 모달 재오픈 시 잠금 해제
        }
    }, [isOpen]);

    // 이메일 유효성 검사
    const isValidEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleNext = async () => {
        // CHANGED: Step 1/2는 입력 없이 버튼 클릭으로 바로 진행
        if (step === 1) {
            setStep(2);
            setError('');
        } else if (step === 2) {
            setStep(3);
            setError('');
        } else if (step === 3) {
            if (!isValidEmail(email)) {
                setError("올바른 이메일 형식을 입력해주세요.");
                return;
            }

            // CHANGED: 동기적 잠금으로 더블클릭 차단 (React state보다 빠름)
            if (isSubmittingRef.current) return;
            isSubmittingRef.current = true;

            // API 호출
            setIsLoading(true);
            setError('');

            try {
                const response = await fetch('/api/campaigns/apply', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        campaignId: campaign.id,
                        email,
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    // CHANGED: 모집 마감 시 에러 표시 후 목록 갱신을 위해 새로고침
                    if (response.status === 409 && data.error?.includes('마감')) {
                        setError(data.error);
                        setTimeout(() => {
                            onClose();
                            window.location.reload();
                        }, 2000);
                        return;
                    }
                    throw new Error(data.error || '신청에 실패했습니다.');
                }

                setCouponCode(data.couponCode);
                setFollowerCouponCode(data.followerCouponCode || ''); // CHANGED: 통합 — couponEvent 캠페인이면 분배된 본인 코드
                setStep(4);
            } catch (err) {
                // CHANGED: 명시적 타입 어노테이션 제거 — unknown 내로잉
                setError(err instanceof Error ? err.message : '신청에 실패했습니다.');
                isSubmittingRef.current = false; // CHANGED: 에러 시 잠금 해제하여 재시도 가능
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleCopyCoupon = async () => {
        try {
            await navigator.clipboard.writeText(couponCode);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    // CHANGED: 통합 빌더 입력 — 내 기록용 요약/미리보기/팔로워 메시지가 공유
    const summaryInput: SponsorshipTextInput = {
        accommodationName: campaign.accommodationName,
        myCouponCode: couponCode,
        deadline: campaign.deadline,
        highlights: campaign.highlights,
        channelTypes,
        hostInstagram: campaign.hostInstagram,
        detailUrl: campaign.detailUrl,
        couponEvent: campaign.couponEvent,
        followerCouponCode,
    };

    // CHANGED: 클립보드 복사 + 미지원 시 textarea fallback 공통화
    const copyToClipboard = async (text: string, onDone: () => void) => {
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
        onDone();
    };

    // CHANGED: 내 기록용 전체 복사 (통합 빌더)
    const [isAllCopied, setIsAllCopied] = useState(false);
    const [isContentExpanded, setIsContentExpanded] = useState(false);
    const [isFollowerMsgCopied, setIsFollowerMsgCopied] = useState(false); // CHANGED: 팔로워 메시지 복사 피드백
    const handleCopyAll = () => copyToClipboard(buildSponsorshipSummary(summaryInput), () => {
        setIsAllCopied(true);
        setTimeout(() => setIsAllCopied(false), 2000);
    });
    const handleCopyFollowerMsg = () => copyToClipboard(buildFollowerShareMessage(summaryInput), () => {
        setIsFollowerMsgCopied(true);
        setTimeout(() => setIsFollowerMsgCopied(false), 2000);
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div
                ref={modalRef}
                className="bg-card border border-line rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            >
                {/* 헤더 */}
                <div className="p-5 border-b border-line flex justify-between items-center">
                    <h2 className="text-xl font-bold text-ink">
                        {step === 4 ? '신청 완료' : '프리미엄 협찬 신청'}
                    </h2>
                    {step !== 4 && (
                        <button onClick={onClose} className="text-ink3 hover:text-ink">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* 콘텐츠 */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-[#c9cdd3] scrollbar-track-transparent">
                    {/* Step 1: 매칭 및 취소 정책 */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="space-y-4 text-ink2 text-sm leading-relaxed">
                                <h3 className="text-ink font-bold text-lg mb-2">1️⃣ 매칭 및 취소 정책</h3>
                                <div className="bg-subtle p-4 rounded-lg space-y-3">
                                    {/* CHANGED: '매칭 완료' 용어 모호성 제거 — 즉시 확정 의미 명확화 */}
                                    <p><span className="text-brand-strong">신청 즉시 확정</span>: 신청과 동시에 예약이 확정돼요 (캠지기 승인 대기 없음).</p>
                                    <p><span className="text-brand-strong">취소 제한 및 책임</span>: 매칭 완료 이후 개인 사정으로 인한 취소는 지양해주세요. (취소 시 해당 일정 예약 불가로 인해 캠핑장 사업주에게 실질적인 금전적 손해가 발생합니다.)</p>
                                    <p><span className="text-brand-strong">노쇼(No-show) 처리</span>: 노쇼 또는 당일 취소 시 협찬은 무효 처리되며, 재방문 또는 보상은 제공되지 않습니다.</p>
                                </div>
                            </div>

                            {/* CHANGED: 입력란 제거, 버튼으로 확인 */}
                        </div>
                    )}

                    {/* Step 2: 정산, 이용 혜택, 콘텐츠, 저작권 */}
                    {step === 2 && (
                        <div className="space-y-8">
                            {/* 섹션 2 */}
                            <div>
                                <h3 className="text-ink font-bold text-lg mb-3">2️⃣ 정산 및 세무 안내</h3>
                                <div className="bg-subtle p-4 rounded-lg text-sm text-ink2 space-y-2">
                                    <p>본인은 캠핏 인플루언서 프리미엄 서비스와 관련하여, 콘텐츠 제작 완료 후 정산 시점 및 방식에 대해 아래와 같이 안내받았으며 이에 동의합니다.</p>
                                    <ul className="list-disc pl-5 space-y-1 mt-2">
                                        <li><span className="text-brand-strong">콘텐츠 제작 완료 기준</span>: 콘텐츠 수정 및 <span className="text-brand-strong">저장 완료</span> 시점</li>
                                        <li><span className="text-brand-strong">정산 시점</span>: 콘텐츠 완료 기준 <span className="text-brand-strong">익월 10일</span>, 캠핏에서 일괄 지급</li>
                                        <li><strong><u>소득세(3.3%)가 원천징수</u></strong>되며, 실지급액이 등록하신 계좌로 입금됩니다.</li>
                                        <li>크리에이터 본인이 사업자의 경우 <strong>세금계산서 발행이 필요</strong>하며, 미발행 시 정산이 지연될 수 있습니다.</li>
                                    </ul>
                                </div>
                            </div>

                            {/* 섹션 3 */}
                            <div>
                                <h3 className="text-ink font-bold text-lg mb-3">3️⃣ 이용 혜택 및 비용 부담</h3>
                                <div className="bg-subtle p-4 rounded-lg text-sm text-ink2 space-y-2">
                                    {/* CHANGED: '캠지기' 최초 등장 시점에 풀이 1회 추가 */}
                                    <p><span className="text-brand-strong">제공 범위</span>: 혜택은 캠지기(캠핑장 사장님)가 기재한 숙박권과 원고료에 한합니다.</p>
                                    <p><span className="text-brand-strong">추가 비용</span>: 기준 인원 초과, 추가 옵션, 시설 이용료 등 추가 비용은 본인 부담입니다.</p>
                                </div>
                            </div>

                            {/* 섹션 4 */}
                            <div>
                                <h3 className="text-ink font-bold text-lg mb-3">4️⃣ 콘텐츠 제작 및 수정</h3>
                                <div className="bg-subtle p-4 rounded-lg text-sm text-ink2 space-y-2">
                                    <p><span className="text-brand-strong">기한 및 페널티</span>: 안내된 기한 내 콘텐츠 미제출 또는 반복 지연 시 향후 프리미엄 협찬 참여가 제한됩니다.</p>
                                    <p><span className="text-brand-strong">사실 오류 수정</span>: 콘텐츠 내 사실 정보 오류가 있을 경우 1회 수정 요청이 발생할 수 있습니다.</p>
                                </div>
                            </div>

                            {/* 섹션 5 */}
                            <div>
                                <h3 className="text-ink font-bold text-lg mb-3">5️⃣ 저작권 및 활용 동의</h3>
                                <div className="bg-subtle p-4 rounded-lg text-sm text-ink2 space-y-2">
                                    <p><strong>홍보 활용</strong>: 제작된 콘텐츠가 캠핏 및 해당 캠핑장의 홍보 목적으로 활용되는 것에 동의합니다.</p>
                                    <p><strong>활용 기간</strong>: 콘텐츠 활용 기간은 업로드일 기준 12개월이며, 이후 활용은 별도 협의합니다.</p>
                                    <p><strong>삭제 금지</strong>: 기간이 지난 과거 게시물에 대해 특별한 협의 없는 임의 삭제는 불가합니다.</p>
                                </div>
                            </div>

                            {/* CHANGED: '자동 취소 간주' → '14일 이내 예약 진행 요청' 톤으로 변경 */}
                            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg">
                                <p className="text-red-500 text-sm font-bold">
                                    🚨 프리미엄 협찬은 별도 쿠폰 코드를 통해 예약이 필요하며, 최종 신청일로부터 <span className="underline decoration-2 underline-offset-2">14일 이내 예약을 진행</span>해주세요. 잦은 미진행/취소는 추후 프리미엄 협찬 참여가 어려울 수 있습니다.
                                </p>
                            </div>

                            {/* CHANGED: 입력란 제거, 버튼으로 확인 */}
                        </div>
                    )}

                    {/* Step 3: 이메일 입력 및 최종 확인 */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="text-center space-y-2">
                                {/* CHANGED: 쿠폰 발급 전이라 '완료' 오해를 막도록 헤드 변경 */}
                                <h3 className="text-xl font-bold text-ink">마지막! 이메일만 남았어요</h3>
                                <p className="text-ink2 text-sm">
                                    프리미엄 협찬 관련 안내 메일을 받으실 이메일 주소를 입력해주세요.
                                </p>
                            </div>

                            {/* CHANGED: 통합 — 쿠폰 이벤트 캠페인이면 쿠폰 조건 + 날짜 2개 안내 (추출: CouponEventSummary) */}
                            {campaign.couponEvent && <CouponEventSummary couponEvent={campaign.couponEvent} />}

                            <div className="bg-subtle p-4 rounded-lg space-y-3">
                                <p className="text-sm font-bold text-brand-strong">🚨 예약 완료 소식 알리기 (필수)</p>
                                <p className="text-sm text-ink2">
                                    쿠폰을 사용해 예약을 완료하신 후, 다시 본 페이지로 들어와 <strong>로그인 후 &gt; <span className="text-brand-strong">입실일 등록하기</span></strong>를 통해 예약 완료 소식을 알려주세요.
                                </p>
                                <p className="text-sm text-ink2">
                                    입실일, 입실 사이트가 등록되지 않을 경우 <span className="text-ink font-bold underline">일반 협찬으로 간주되어 원고료 지급이 어려울 수 있습니다.</span> 번거로우시더라도 <strong>정산 불이익이 없도록 반드시 작성 부탁드립니다.</strong>
                                </p>
                            </div>

                            {/* CHANGED: 캠지기님이 자랑하고 싶은 포인트 — 3줄 접기/펼치기 */}
                            {campaign.highlights && (
                                <div className="bg-subtle p-4 rounded-lg space-y-2">
                                    <div className="flex items-center gap-2">
                                        {/* CHANGED: '캠지기' 풀이 추가 */}
                                        <p className="text-sm font-bold text-brand-strong flex items-center gap-1"><BrandIcon name="sparkle" size={16} />캠지기(캠핑장 사장님)가 자랑하는 포인트</p>
                                        <span className="text-xs text-ink3">(필수 X)</span>
                                    </div>
                                    <div className="relative">
                                        <p className={`text-sm text-ink whitespace-pre-line leading-relaxed ${!isHighlightsExpanded ? 'line-clamp-3' : ''}`}>
                                            {campaign.highlights}
                                        </p>
                                        {!isHighlightsExpanded && (
                                            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#eceef4] to-transparent" />
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setIsHighlightsExpanded(prev => !prev)}
                                        className="text-brand-strong text-xs font-medium hover:underline"
                                    >
                                        {isHighlightsExpanded ? '접기 ▲' : '전체 보기 ▼'}
                                    </button>
                                </div>
                            )}

                            {/* CHANGED: 콘텐츠 제작 필수사항 + 팔로워 안내 링크 (추출: ContentRequirements) */}
                            <ContentRequirements
                                channelTypes={channelTypes}
                                hostInstagram={campaign.hostInstagram}
                                detailUrl={campaign.detailUrl}
                                isCouponEvent={!!campaign.couponEvent}
                            />

                            <div>
                                <label className="block text-sm font-medium text-ink mb-2">
                                    이메일 주소
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="example@email.com"
                                    className="w-full h-12 px-4 bg-page border border-line rounded-lg text-ink focus:border-brand focus:outline-none transition-colors"
                                />
                            </div>

                            <div className="bg-page border border-line p-4 rounded-lg text-center">
                                <p className="text-ink text-lg font-bold mb-1">{campaign.accommodationName}</p>
                                <p className="text-ink2 text-sm">해당 캠핑장으로 최종 진행하시겠습니까?</p>
                            </div>
                        </div>
                    )}

                    {/* Step 4: 신청 완료 및 쿠폰 발급 */}
                    {step === 4 && (
                        <div className="space-y-8 text-center py-4">
                            <div className="flex flex-col items-center justify-center space-y-4">
                                {/* CHANGED: 체크 SVG → 축하하는 캠냥이 마스코트 */}
                                <Mascot expression="cheer" size={112} priority />
                                <h3 className="text-2xl font-bold text-ink">신청이 완료되었어요!</h3>
                                {/* CHANGED: 쿠폰 혼동 해소 — 등록 순간엔 '내 예약 쿠폰'에 집중하도록 안내 */}
                                <p className="text-brand-strong text-sm">이 쿠폰을 캠핏에 등록하고 예약하면 끝나요</p>
                            </div>

                            <div className="bg-subtle border border-brand p-6 rounded-xl space-y-4">
                                <div>
                                    <p className="text-ink2 text-sm mb-2">내 예약 쿠폰 코드</p>
                                    <p className="text-2xl font-mono font-bold text-brand-strong tracking-wider break-all">
                                        {couponCode || 'COUPON-CODE-ERROR'}
                                    </p>
                                </div>
                                <button
                                    onClick={handleCopyCoupon}
                                    className="px-6 py-2 bg-page border border-line rounded-full text-ink text-sm font-medium hover:bg-subtle transition-colors flex items-center justify-center mx-auto gap-2"
                                >
                                    {isCopied ? (
                                        <>
                                            <svg className="w-4 h-4 text-brand-strong" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            복사 완료!
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                            </svg>
                                            코드 복사하기
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="space-y-2">
                                {/* CHANGED: 예측 가능한 CTA + 내 예약 쿠폰 자동복사 + 새 탭(보안 규칙 충족). 팔로워 코드 오등록 방지 */}
                                <a
                                    href={COUPON_REGISTER_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => {
                                        navigator.clipboard?.writeText(couponCode)
                                            .then(() => {
                                                setIsMineCtaCopied(true);
                                                setTimeout(() => setIsMineCtaCopied(false), 2000);
                                            })
                                            .catch((err) => console.error('Failed to copy my coupon', err));
                                    }}
                                    className="block w-full h-14 flex items-center justify-center gap-2 bg-brand text-black font-bold text-lg rounded-xl hover:bg-brand-hover transition-colors"
                                >
                                    <BrandIcon name="clipboard" size={20} />내 예약 쿠폰 복사하고 캠핏으로 이동
                                </a>
                                <p className="text-xs">
                                    {isMineCtaCopied ? (
                                        <span className="text-brand-strong font-medium">✓ 내 예약 쿠폰을 복사했어요. 새 탭에서 등록해주세요.</span>
                                    ) : (
                                        <span className="text-ink3">* 버튼을 누르면 내 예약 쿠폰이 복사되고 캠핏 등록 페이지가 새 탭으로 열려요.</span>
                                    )}
                                </p>
                            </div>

                            {/* CHANGED: 쿠폰 혼동 해소 — 팔로워 쿠폰은 기본 접힘 토글 안으로(등록 순간 분리). 펼치면 weak 톤 callout */}
                            {campaign.couponEvent && followerCouponCode && (
                                <div className="text-left">
                                    <button
                                        onClick={() => setIsFollowerExpanded((prev) => !prev)}
                                        className="w-full flex items-center justify-between bg-subtle border border-strong rounded-xl px-4 py-3 text-sm text-ink hover:bg-subtle-hover transition-colors"
                                    >
                                        <span className="inline-flex items-center gap-1"><BrandIcon name="coupon" size={16} />팔로워에게 공유할 쿠폰 보기 <span className="text-ink3">· 내 예약용 아니에요</span></span>
                                        <span className="text-xs text-ink3 shrink-0 ml-2">{isFollowerExpanded ? '접기 ▲' : '펼치기 ▼'}</span>
                                    </button>
                                    {isFollowerExpanded && (
                                        <div className="mt-3">
                                            <FollowerCouponCallout couponEvent={campaign.couponEvent} followerCouponCode={followerCouponCode} accommodationName={campaign.accommodationName} />
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="bg-subtle p-4 rounded-lg">
                                <p className="text-sm font-bold text-ink mb-1 flex items-center gap-1"><BrandIcon name="speech" size={16} />잊지 마세요!</p>
                                <p className="text-sm text-ink2">
                                    예약 완료 후 꼭 다시 돌아와서 <br />
                                    <strong>&quot;입실일 등록&quot;</strong>을 해주셔야 정산이 가능합니다.
                                </p>
                            </div>

                            {/* CHANGED: 협찬 조건 저장 — 미리보기 == 복사 내용(통합 빌더). 내 기록용 / 팔로워 메시지 2버튼 분리 */}
                            <div className="bg-subtle border border-line p-4 rounded-lg text-left space-y-3">
                                <p className="text-sm font-bold text-ink flex items-center gap-1.5"><BrandIcon name="clipboard" size={16} />협찬 조건 저장하기</p>
                                <p className="text-xs text-ink3">
                                    조건이 많으니 카카오톡 나에게 보내기 또는 메모장에 저장해두세요!
                                </p>

                                <div className="bg-page p-3 rounded-lg relative">
                                    <pre className={`text-xs text-ink whitespace-pre-wrap break-words font-sans leading-relaxed ${!isContentExpanded ? 'max-h-24 overflow-hidden' : ''}`}>{buildSponsorshipSummary(summaryInput)}</pre>
                                    {!isContentExpanded && (
                                        <div className="absolute bottom-8 left-0 right-0 h-10 bg-gradient-to-t from-[#fafafa] to-transparent rounded-b-lg" />
                                    )}
                                    <button
                                        onClick={() => setIsContentExpanded(prev => !prev)}
                                        className="w-full pt-2 text-center text-brand-strong text-xs font-medium hover:underline"
                                    >
                                        {isContentExpanded ? '접기 ▲' : '전체 보기 ▼'}
                                    </button>
                                </div>

                                <button
                                    onClick={handleCopyAll}
                                    className="w-full py-3 bg-brand text-black font-bold text-sm rounded-lg hover:bg-brand-hover transition-colors inline-flex items-center justify-center gap-1.5"
                                >
                                    {isAllCopied ? '복사 완료!' : <><BrandIcon name="clipboard" size={15} />내 기록용 전체 복사</>}
                                </button>

                                {/* CHANGED: 팔로워에게 그대로 전달할 깨끗한 메시지(코드+등록링크+사용법) — 쿠폰이벤트만 */}
                                {campaign.couponEvent && followerCouponCode && (
                                    <button
                                        onClick={handleCopyFollowerMsg}
                                        className="w-full py-3 bg-subtle border border-brand/50 text-brand-strong font-bold text-sm rounded-lg hover:bg-brand-bg transition-colors inline-flex items-center justify-center gap-1.5"
                                    >
                                        {isFollowerMsgCopied ? '복사 완료! 팔로워에게 붙여넣으세요' : <><BrandIcon name="message" size={15} />팔로워에게 보낼 메시지 복사</>}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* 푸터 (오류 메시지 및 버튼) */}
                <div className="p-5 border-t border-line space-y-4">
                    {error && (
                        <p className="text-red-500 text-sm text-center font-medium animate-pulse">
                            {error}
                        </p>
                    )}

                    {step < 4 ? (
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                disabled={isLoading}
                                className="flex-1 h-12 bg-subtle text-ink font-medium rounded-lg hover:bg-subtle-hover transition-colors disabled:opacity-50"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleNext}
                                disabled={isLoading}
                                className="flex-[2] h-12 bg-brand text-black font-bold rounded-lg hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                        {/* CHANGED: 로딩 카피 양식 통일 ({동사}하는 중…) */}
                                        확인하는 중…
                                    </>
                                ) : (
                                    step === 3 ? '최종 신청하기' : '이해했습니다'
                                )}
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => {
                                onClose();
                                window.location.reload(); // 상태 반영을 위해 새로고침
                            }}
                            className="w-full h-12 bg-subtle text-ink font-medium rounded-lg hover:bg-subtle-hover transition-colors"
                        >
                            닫기 (완료)
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
