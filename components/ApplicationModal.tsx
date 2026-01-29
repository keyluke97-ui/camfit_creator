'use client';

import { useState, useRef, useEffect } from 'react';
import type { Campaign } from '@/types';

interface ApplicationModalProps {
    isOpen: boolean;
    onClose: () => void;
    campaign: Campaign;
}

export default function ApplicationModal({ isOpen, onClose, campaign }: ApplicationModalProps) {
    const [step, setStep] = useState(1);
    const [inputValue, setInputValue] = useState('');
    const [inputValues2, setInputValues2] = useState({ understand: '', agree: '' });
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [couponCode, setCouponCode] = useState('');
    const [isCopied, setIsCopied] = useState(false);

    const modalRef = useRef<HTMLDivElement>(null);

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
        }
    }, [isOpen]);

    // 이메일 유효성 검사
    const isValidEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleNext = async () => {
        if (step === 1) {
            if (inputValue !== '이해') {
                setError("'이해'라고 정확히 입력해주세요.");
                return;
            }
            setStep(2);
            setError('');
        } else if (step === 2) {
            if (inputValues2.understand !== '이해' || inputValues2.agree !== '동의') {
                setError("'이해'와 '동의'를 모두 정확히 입력해주세요.");
                return;
            }
            setStep(3);
            setError('');
        } else if (step === 3) {
            if (!isValidEmail(email)) {
                setError("올바른 이메일 형식을 입력해주세요.");
                return;
            }

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
                    throw new Error(data.error || '신청에 실패했습니다.');
                }

                setCouponCode(data.couponCode);
                setStep(4);
            } catch (err: any) {
                setError(err.message);
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
                                    <p><span className="text-[#01DF82]">신청 시 매칭 완료</span>: 협찬 공고에 신청한 시점을 기준으로 즉시 <strong>'매칭 완료'</strong>로 간주됩니다.</p>
                                    <p><strong>취소 제한 및 책임</strong>: 매칭 완료 이후 개인 사정으로 인한 취소는 지양해주세요. (취소 시 해당 일정 예약 불가로 인해 캠핑장 사업주에게 실질적인 금전적 손해가 발생합니다.)</p>
                                    <p><strong>노쇼(No-show) 처리</strong>: 노쇼 또는 당일 취소 시 협찬은 무효 처리되며, 재방문 또는 보상은 제공되지 않습니다.</p>
                                </div>
                            </div>

                            <div className="pt-4">
                                <label className="block text-sm font-medium text-white mb-2">
                                    이 정책을 이해하셨다면 <span className="text-[#01DF82]">'이해'</span>를 입력해주세요.
                                </label>
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="이해"
                                    className="w-full h-12 px-4 bg-[#111] border border-[#333] rounded-lg text-white focus:border-[#01DF82] focus:outline-none transition-colors"
                                />
                            </div>
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
                                        <li><strong>콘텐츠 제작 완료 기준</strong>: 콘텐츠 수정 및 저장 완료 시점</li>
                                        <li><strong>정산 시점</strong>: 콘텐츠 완료 기준 익월 10일, 캠핏에서 일괄 지급</li>
                                        <li>소득세(3.3%)가 원천징수되며, 실지급액이 등록하신 계좌로 입금됩니다.</li>
                                        <li>크리에이터 본인이 사업자의 경우 세금계산서 발행이 필요하며, 미발행 시 정산이 지연될 수 있습니다.</li>
                                    </ul>
                                </div>
                            </div>

                            {/* 섹션 3 */}
                            <div>
                                <h3 className="text-white font-bold text-lg mb-3">3️⃣ 이용 혜택 및 비용 부담</h3>
                                <div className="bg-[#2A2A2A] p-4 rounded-lg text-sm text-[#B0B0B0] space-y-2">
                                    <p><strong>제공 범위</strong>: 혜택은 캠지기가 기재한 숙박권과 원고료에 한합니다.</p>
                                    <p><strong>추가 비용</strong>: 기준 인원 초과, 추가 옵션, 시설 이용료 등 추가 비용은 본인 부담입니다.</p>
                                </div>
                            </div>

                            {/* 섹션 4 */}
                            <div>
                                <h3 className="text-white font-bold text-lg mb-3">4️⃣ 콘텐츠 제작 및 수정</h3>
                                <div className="bg-[#2A2A2A] p-4 rounded-lg text-sm text-[#B0B0B0] space-y-2">
                                    <p><strong>기한 및 페널티</strong>: 안내된 기한 내 콘텐츠 미제출 또는 반복 지연 시 향후 프리미엄 협찬 참여가 제한됩니다.</p>
                                    <p><strong>사실 오류 수정</strong>: 콘텐츠 내 사실 정보 오류가 있을 경우 1회 수정 요청이 발생할 수 있습니다.</p>
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

                            <div className="pt-4 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">
                                        위 내용을 <span className="text-[#01DF82]">'이해'</span> 하였으며,
                                    </label>
                                    <input
                                        type="text"
                                        value={inputValues2.understand}
                                        onChange={(e) => setInputValues2(prev => ({ ...prev, understand: e.target.value }))}
                                        placeholder="이해"
                                        className="w-full h-12 px-4 bg-[#111] border border-[#333] rounded-lg text-white focus:border-[#01DF82] focus:outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">
                                        이에 <span className="text-[#01DF82]">'동의'</span> 합니다.
                                    </label>
                                    <input
                                        type="text"
                                        value={inputValues2.agree}
                                        onChange={(e) => setInputValues2(prev => ({ ...prev, agree: e.target.value }))}
                                        placeholder="동의"
                                        className="w-full h-12 px-4 bg-[#111] border border-[#333] rounded-lg text-white focus:border-[#01DF82] focus:outline-none transition-colors"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: 이메일 입력 및 최종 확인 */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-bold text-white">거의 다 되었습니다! 🎉</h3>
                                <p className="text-[#B0B0B0] text-sm">
                                    프리미엄 협찬 관련 안내 메일을 받으실 이메일 주소를 입력해주세요.
                                </p>
                            </div>

                            <div className="bg-[#2A2A2A] p-4 rounded-lg space-y-3">
                                <p className="text-sm font-bold text-[#01DF82]">🚨 예약 완료 소식 알리기 (필수)</p>
                                <p className="text-sm text-[#B0B0B0]">
                                    쿠폰을 사용해 예약을 완료하신 후, 다시 본 페이지로 들어와 <strong>로그인 후 &gt; 입실일 등록하기</strong>를 통해 예약 완료 소식을 알려주세요.
                                </p>
                                <p className="text-sm text-[#B0B0B0]">
                                    예약 완료 소식이 등록되지 않을 경우 <span className="text-white font-bold underline">일반 협찬으로 간주되어 원고료 지급이 어려울 수 있습니다.</span> 번거로우시더라도 정산 불이익이 없도록 반드시 작성 부탁드립니다.
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
                                    <strong>"입실일 등록"</strong>을 해주셔야 정산이 가능합니다.
                                </p>
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
                                        체크 중...
                                    </>
                                ) : (
                                    step === 3 ? '최종 신청하기' : '다음'
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
