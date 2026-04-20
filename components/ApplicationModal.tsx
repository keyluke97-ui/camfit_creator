'use client';

import { useState, useRef, useEffect } from 'react';
import type { Campaign, ChannelType } from '@/types';

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
    const [isCopied, setIsCopied] = useState(false);
    const [isHighlightsExpanded, setIsHighlightsExpanded] = useState(false); // CHANGED: Step 3 캠지기 포인트 접기/펼치기

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
                setStep(4);
            } catch (err: any) {
                setError(err.message);
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

    // CHANGED: 쿠폰 코드 + 캠지기 포인트 + 콘텐츠 필수사항 한번에 복사
    const [isAllCopied, setIsAllCopied] = useState(false);
    const [isContentExpanded, setIsContentExpanded] = useState(false);
    const handleCopyAll = async () => {
        const lines: string[] = [];
        lines.push(`📌 쿠폰 코드: ${couponCode}`);
        lines.push(`📌 숙소: ${campaign.accommodationName}`);
        if (campaign.highlights) {
            lines.push('');
            lines.push(`✨ 캠지기님이 자랑하고 싶은 포인트`);
            lines.push(campaign.highlights);
        }
        lines.push('');
        lines.push('📌 콘텐츠 제작 시 필수 사항');
        if (channelTypes?.includes('인스타')) {
            lines.push('• 인스타그램: @camfit_official 태그');
            // CHANGED: 캠지기 인스타 태그 안내 추가
            if (campaign.hostInstagram) {
                lines.push(`• 캠핑장 인스타그램: @${campaign.hostInstagram} 태그`);
            }
        }
        lines.push(`• 캡션/더보기란에 숙소 링크 포함: ${campaign.detailUrl}`);
        const text = lines.join('\n');
        try {
            await navigator.clipboard.writeText(text);
            setIsAllCopied(true);
            setTimeout(() => setIsAllCopied(false), 2000);
        } catch {
            // CHANGED: Clipboard API 미지원/권한 없을 때 fallback
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setIsAllCopied(true);
            setTimeout(() => setIsAllCopied(false), 2000);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div
                ref={modalRef}
                className="bg-[#1E1E1E] border border-[#333333] rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            >
                {/* 헤더 */}
                <div className="p-5 border-b border-[#333333] flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">
                        {step === 4 ? '신청 완료' : '프리미엄 협찬 신청'}
                    </h2>
                    {step !== 4 && (
                        <button onClick={onClose} className="text-[#666666] hover:text-white">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* 콘텐츠 */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-[#333333] scrollbar-track-transparent">
                    {/* Step 1: 매칭 및 취소 정책 */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="space-y-4 text-[#B0B0B0] text-sm leading-relaxed">
                                <h3 className="text-white font-bold text-lg mb-2">1️⃣ 매칭 및 취소 정책</h3>
                                <div className="bg-[#2A2A2A] p-4 rounded-lg space-y-3">
                                    {/* CHANGED: '매칭 완료' 용어 모호성 제거 — 즉시 확정 의미 명확화 */}
                                    <p><span className="text-[#01DF82]">신청 즉시 확정</span>: 신청과 동시에 예약이 확정돼요 (캠지기 승인 대기 없음).</p>
                                    <p><span className="text-[#01DF82]">취소 제한 및 책임</span>: 매칭 완료 이후 개인 사정으로 인한 취소는 지양해주세요. (취소 시 해당 일정 예약 불가로 인해 캠핑장 사업주에게 실질적인 금전적 손해가 발생합니다.)</p>
                                    <p><span className="text-[#01DF82]">노쇼(No-show) 처리</span>: 노쇼 또는 당일 취소 시 협찬은 무효 처리되며, 재방문 또는 보상은 제공되지 않습니다.</p>
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
                                <h3 className="text-white font-bold text-lg mb-3">2️⃣ 정산 및 세무 안내</h3>
                                <div className="bg-[#2A2A2A] p-4 rounded-lg text-sm text-[#B0B0B0] space-y-2">
                                    <p>본인은 캠핏 인플루언서 프리미엄 서비스와 관련하여, 콘텐츠 제작 완료 후 정산 시점 및 방식에 대해 아래와 같이 안내받았으며 이에 동의합니다.</p>
                                    <ul className="list-disc pl-5 space-y-1 mt-2">
                                        <li><span className="text-[#01DF82]">콘텐츠 제작 완료 기준</span>: 콘텐츠 수정 및 <span className="text-[#01DF82]">저장 완료</span> 시점</li>
                                        <li><span className="text-[#01DF82]">정산 시점</span>: 콘텐츠 완료 기준 <span className="text-[#01DF82]">익월 10일</span>, 캠핏에서 일괄 지급</li>
                                        <li><strong><u>소득세(3.3%)가 원천징수</u></strong>되며, 실지급액이 등록하신 계좌로 입금됩니다.</li>
                                        <li>크리에이터 본인이 사업자의 경우 <strong>세금계산서 발행이 필요</strong>하며, 미발행 시 정산이 지연될 수 있습니다.</li>
                                    </ul>
                                </div>
                            </div>

                            {/* 섹션 3 */}
                            <div>
                                <h3 className="text-white font-bold text-lg mb-3">3️⃣ 이용 혜택 및 비용 부담</h3>
                                <div className="bg-[#2A2A2A] p-4 rounded-lg text-sm text-[#B0B0B0] space-y-2">
                                    {/* CHANGED: '캠지기' 최초 등장 시점에 풀이 1회 추가 */}
                                    <p><span className="text-[#01DF82]">제공 범위</span>: 혜택은 캠지기(캠핑장 사장님)가 기재한 숙박권과 원고료에 한합니다.</p>
                                    <p><span className="text-[#01DF82]">추가 비용</span>: 기준 인원 초과, 추가 옵션, 시설 이용료 등 추가 비용은 본인 부담입니다.</p>
                                </div>
                            </div>

                            {/* 섹션 4 */}
                            <div>
                                <h3 className="text-white font-bold text-lg mb-3">4️⃣ 콘텐츠 제작 및 수정</h3>
                                <div className="bg-[#2A2A2A] p-4 rounded-lg text-sm text-[#B0B0B0] space-y-2">
                                    <p><span className="text-[#01DF82]">기한 및 페널티</span>: 안내된 기한 내 콘텐츠 미제출 또는 반복 지연 시 향후 프리미엄 협찬 참여가 제한됩니다.</p>
                                    <p><span className="text-[#01DF82]">사실 오류 수정</span>: 콘텐츠 내 사실 정보 오류가 있을 경우 1회 수정 요청이 발생할 수 있습니다.</p>
                                </div>
                            </div>

                            {/* 섹션 5 */}
                            <div>
                                <h3 className="text-white font-bold text-lg mb-3">5️⃣ 저작권 및 활용 동의</h3>
                                <div className="bg-[#2A2A2A] p-4 rounded-lg text-sm text-[#B0B0B0] space-y-2">
                                    <p><strong>홍보 활용</strong>: 제작된 콘텐츠가 캠핏 및 해당 캠핑장의 홍보 목적으로 활용되는 것에 동의합니다.</p>
                                    <p><strong>활용 기간</strong>: 콘텐츠 활용 기간은 업로드일 기준 12개월이며, 이후 활용은 별도 협의합니다.</p>
                                    <p><strong>삭제 금지</strong>: 기간이 지난 과거 게시물에 대해 특별한 협의 없는 임의 삭제는 불가합니다.</p>
                                </div>
                            </div>

                            {/* 14일 자동 취소 강조 */}
                            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg">
                                <p className="text-red-400 text-sm font-bold">
                                    🚨 프리미엄 협찬은 별도 쿠폰 코드를 통해 예약이 필요하며, 최종 신청일로부터 <span className="underline decoration-2 underline-offset-2">14일</span> 동안 신청하지 않을 시 자동 취소로 간주되며, 잦은 취소는 추후 프리미엄 협찬 참여가 어려울 수 있습니다.
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
                                <h3 className="text-xl font-bold text-white">마지막! 이메일만 남았어요</h3>
                                <p className="text-[#B0B0B0] text-sm">
                                    프리미엄 협찬 관련 안내 메일을 받으실 이메일 주소를 입력해주세요.
                                </p>
                            </div>

                            <div className="bg-[#2A2A2A] p-4 rounded-lg space-y-3">
                                <p className="text-sm font-bold text-[#01DF82]">🚨 예약 완료 소식 알리기 (필수)</p>
                                <p className="text-sm text-[#B0B0B0]">
                                    쿠폰을 사용해 예약을 완료하신 후, 다시 본 페이지로 들어와 <strong>로그인 후 &gt; <span className="text-[#01DF82]">입실일 등록하기</span></strong>를 통해 예약 완료 소식을 알려주세요.
                                </p>
                                <p className="text-sm text-[#B0B0B0]">
                                    입실일, 입실 사이트가 등록되지 않을 경우 <span className="text-white font-bold underline">일반 협찬으로 간주되어 원고료 지급이 어려울 수 있습니다.</span> 번거로우시더라도 <strong>정산 불이익이 없도록 반드시 작성 부탁드립니다.</strong>
                                </p>
                            </div>

                            {/* CHANGED: 캠지기님이 자랑하고 싶은 포인트 — 3줄 접기/펼치기 */}
                            {campaign.highlights && (
                                <div className="bg-[#2A2A2A] p-4 rounded-lg space-y-2">
                                    <div className="flex items-center gap-2">
                                        {/* CHANGED: '캠지기' 풀이 추가 */}
                                        <p className="text-sm font-bold text-[#01DF82]">✨ 캠지기(캠핑장 사장님)가 자랑하는 포인트</p>
                                        <span className="text-xs text-[#888888]">(필수 X)</span>
                                    </div>
                                    <div className="relative">
                                        <p className={`text-sm text-[#D0D0D0] whitespace-pre-line leading-relaxed ${!isHighlightsExpanded ? 'line-clamp-3' : ''}`}>
                                            {campaign.highlights}
                                        </p>
                                        {!isHighlightsExpanded && (
                                            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#2A2A2A] to-transparent" />
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setIsHighlightsExpanded(prev => !prev)}
                                        className="text-[#01DF82] text-xs font-medium hover:underline"
                                    >
                                        {isHighlightsExpanded ? '접기 ▲' : '전체 보기 ▼'}
                                    </button>
                                </div>
                            )}

                            {/* CHANGED: 콘텐츠 제작 필수사항 안내 */}
                            <div className="bg-[#2A2A2A] p-4 rounded-lg space-y-3">
                                <p className="text-sm font-bold text-[#01DF82]">📌 콘텐츠 제작 시 필수 사항</p>
                                {channelTypes?.includes('인스타') && (
                                    <div className="flex items-start gap-2 text-sm text-[#D0D0D0]">
                                        <span className="text-[#01DF82] mt-0.5 shrink-0">•</span>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs bg-[#E4405F]/15 text-[#E4405F] border border-[#E4405F]/30 rounded-full px-2 py-0.5 font-medium">인스타그램 운영 시</span>
                                            <p>콘텐츠에 <strong className="text-white">@camfit_official</strong> 태그 필수</p>
                                        </div>
                                    </div>
                                )}
                                {/* CHANGED: 캠지기 인스타그램 태그 안내 — 인스타 운영 + hostInstagram 존재 시 */}
                                {channelTypes?.includes('인스타') && campaign.hostInstagram && (
                                    <div className="flex items-start gap-2 text-sm text-[#D0D0D0]">
                                        <span className="text-[#01DF82] mt-0.5 shrink-0">•</span>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs bg-[#E4405F]/15 text-[#E4405F] border border-[#E4405F]/30 rounded-full px-2 py-0.5 font-medium">캠핑장 태그</span>
                                            <p>캠핑장 인스타 <strong className="text-white">@{campaign.hostInstagram}</strong> 태그</p>
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-start gap-2 text-sm text-[#D0D0D0]">
                                    <span className="text-[#01DF82] mt-0.5 shrink-0">•</span>
                                    <div>
                                        <p>콘텐츠 캡션/더보기란에 아래 숙소 링크를 반드시 포함해주세요</p>
                                        <a
                                            href={campaign.detailUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[#01DF82] underline break-all text-xs mt-1 block"
                                        >
                                            {campaign.detailUrl}
                                        </a>
                                    </div>
                                </div>
                                <p className="text-xs text-[#888888]">
                                    ※ 영상 콘텐츠의 경우 영상 내부가 아닌 캡션/더보기란에 링크를 넣어주세요.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    이메일 주소
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="example@email.com"
                                    className="w-full h-12 px-4 bg-[#111] border border-[#333] rounded-lg text-white focus:border-[#01DF82] focus:outline-none transition-colors"
                                />
                            </div>

                            <div className="bg-[#111] border border-[#333] p-4 rounded-lg text-center">
                                <p className="text-white text-lg font-bold mb-1">{campaign.accommodationName}</p>
                                <p className="text-[#B0B0B0] text-sm">해당 캠핑장으로 최종 진행하시겠습니까?</p>
                            </div>
                        </div>
                    )}

                    {/* Step 4: 신청 완료 및 쿠폰 발급 */}
                    {step === 4 && (
                        <div className="space-y-8 text-center py-4">
                            <div className="flex flex-col items-center justify-center space-y-4">
                                <div className="w-16 h-16 bg-[#01DF82]/20 rounded-full flex items-center justify-center">
                                    <svg className="w-8 h-8 text-[#01DF82]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-bold text-white">신청이 완료되었습니다!</h3>
                            </div>

                            <div className="bg-[#2A2A2A] border border-[#01DF82] p-6 rounded-xl space-y-4">
                                <div>
                                    <p className="text-[#B0B0B0] text-sm mb-2">발급된 캠핏 예약 쿠폰 코드</p>
                                    <p className="text-2xl font-mono font-bold text-[#01DF82] tracking-wider break-all">
                                        {couponCode || 'COUPON-CODE-ERROR'}
                                    </p>
                                </div>
                                <button
                                    onClick={handleCopyCoupon}
                                    className="px-6 py-2 bg-[#111] border border-[#333] rounded-full text-white text-sm font-medium hover:bg-[#333] transition-colors flex items-center justify-center mx-auto gap-2"
                                >
                                    {isCopied ? (
                                        <>
                                            <svg className="w-4 h-4 text-[#01DF82]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                            <div className="space-y-3">
                                <a
                                    href="https://camfit.co.kr/mypage/coupon/register"
                                    rel="noreferrer"
                                    className="block w-full h-14 flex items-center justify-center bg-[#01DF82] text-black font-bold text-lg rounded-xl hover:bg-[#00C972] transition-colors"
                                >
                                    캠핏 쿠폰 등록하러 가기
                                </a>
                                <p className="text-[#666666] text-xs">
                                    * 외부 사이트로 이동합니다. 복사한 코드를 등록하고 예약을 진행해주세요.
                                </p>
                            </div>

                            <div className="bg-[#2A2A2A] p-4 rounded-lg">
                                <p className="text-sm font-bold text-white mb-1">📢 잊지 마세요!</p>
                                <p className="text-sm text-[#B0B0B0]">
                                    예약 완료 후 꼭 다시 돌아와서 <br />
                                    <strong>&quot;입실일 등록&quot;</strong>을 해주셔야 정산이 가능합니다.
                                </p>
                            </div>

                            {/* CHANGED: 모든 조건 한번에 저장하기 — 통합 복사 */}
                            <div className="bg-[#2A2A2A] border border-[#333] p-4 rounded-lg text-left space-y-3">
                                <p className="text-sm font-bold text-white">📋 모든 조건 한번에 저장하기</p>
                                <p className="text-xs text-[#888888]">
                                    카카오톡 나에게 보내기 또는 메모장에 적어놓으세요!
                                </p>

                                <div className="bg-[#111] p-3 rounded-lg text-xs text-[#D0D0D0] relative">
                                    <div className={`space-y-2 ${!isContentExpanded ? 'max-h-20 overflow-hidden' : ''}`}>
                                        <p><span className="text-[#01DF82]">📌 쿠폰 코드:</span> <span className="font-mono text-white">{couponCode}</span></p>
                                        <p><span className="text-[#01DF82]">📌 숙소:</span> {campaign.accommodationName}</p>

                                        {campaign.highlights && (
                                            <>
                                                <div className="border-t border-[#333] my-1" />
                                                <p className="text-[#01DF82]">✨ 캠지기님이 자랑하고 싶은 포인트</p>
                                                <p className="whitespace-pre-line">{campaign.highlights}</p>
                                            </>
                                        )}

                                        <div className="border-t border-[#333] my-1" />
                                        <p className="text-[#01DF82]">📌 콘텐츠 제작 시 필수 사항</p>
                                        {channelTypes?.includes('인스타') && (
                                            <>
                                                <p>• 인스타그램: <strong className="text-white">@camfit_official</strong> 태그</p>
                                                {/* CHANGED: 캠지기 인스타 태그 미리보기 */}
                                                {campaign.hostInstagram && (
                                                    <p>• 캠핑장 인스타: <strong className="text-white">@{campaign.hostInstagram}</strong> 태그</p>
                                                )}
                                            </>
                                        )}
                                        <p>• 캡션/더보기란에 숙소 링크 포함:</p>
                                        <p className="text-[#01DF82] break-all">{campaign.detailUrl}</p>
                                    </div>
                                    {!isContentExpanded && (
                                        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#111] to-transparent rounded-b-lg" />
                                    )}
                                    <button
                                        onClick={() => setIsContentExpanded(prev => !prev)}
                                        className="w-full pt-2 text-center text-[#01DF82] text-xs font-medium hover:underline"
                                    >
                                        {isContentExpanded ? '접기 ▲' : '전체 보기 ▼'}
                                    </button>
                                </div>

                                <button
                                    onClick={handleCopyAll}
                                    className="w-full py-3 bg-[#01DF82] text-black font-bold text-sm rounded-lg hover:bg-[#00C972] transition-colors flex items-center justify-center gap-2"
                                >
                                    {isAllCopied ? (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            복사 완료!
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                            </svg>
                                            전체 내용 복사하기
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 푸터 (오류 메시지 및 버튼) */}
                <div className="p-5 border-t border-[#333333] space-y-4">
                    {error && (
                        <p className="text-red-400 text-sm text-center font-medium animate-pulse">
                            {error}
                        </p>
                    )}

                    {step < 4 ? (
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                disabled={isLoading}
                                className="flex-1 h-12 bg-[#2A2A2A] text-white font-medium rounded-lg hover:bg-[#333] transition-colors disabled:opacity-50"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleNext}
                                disabled={isLoading}
                                className="flex-[2] h-12 bg-[#01DF82] text-black font-bold rounded-lg hover:bg-[#00C972] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                            className="w-full h-12 bg-[#2A2A2A] text-white font-medium rounded-lg hover:bg-[#333] transition-colors"
                        >
                            닫기 (완료)
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
