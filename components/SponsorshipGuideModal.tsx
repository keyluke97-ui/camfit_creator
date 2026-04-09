// SponsorshipGuideModal.tsx - 프리미엄/파트너 협찬 차이점 안내 모달
'use client';

interface SponsorshipGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// CHANGED: 수익구조/콘텐츠의무/예약방식/등록필요 삭제, 문구 개선
/** 비교 항목 데이터 */
const COMPARISON_ROWS = [
    {
        label: '협찬 방식',
        premium: '출장비 받고 가는 협찬',
        partner: '팔로워 대상 할인 쿠폰 제공'
    },
    {
        label: '대상',
        premium: '프리미엄 등록 크리에이터',
        partner: '인스타·유튜브 크리에이터'
    }
];

export default function SponsorshipGuideModal({ isOpen, onClose }: SponsorshipGuideModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />

            <div className="relative w-full max-w-md bg-[#1E1E1E] rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto">
                {/* 헤더 */}
                <div className="sticky top-0 bg-[#1E1E1E] border-b border-[#333333] px-5 py-4 flex items-center justify-between z-10">
                    <h2 className="text-base font-bold text-white">프리미엄 vs 파트너 협찬</h2>
                    <button onClick={onClose} className="text-[#666666] hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* 요약 설명 */}
                    <div className="space-y-3">
                        <div className="bg-[#252525] border border-[#3A3A3A] rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">💎</span>
                                <span className="text-sm font-bold text-white">프리미엄 협찬</span>
                            </div>
                            {/* CHANGED: 크리에이터 직접 지급 명시, 등급별 문구 삭제 */}
                            <p className="text-xs text-[#B0B0B0] leading-relaxed">
                                캠핑장 방문 후 콘텐츠를 제작하면 크리에이터에게 협찬 금액을 직접 지급합니다.
                            </p>
                        </div>

                        <div className="bg-[#252525] border border-[#3A3A3A] rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">🤝</span>
                                <span className="text-sm font-bold text-white">캠핏 파트너</span>
                            </div>
                            <p className="text-xs text-[#B0B0B0] leading-relaxed">
                                크리에이터 본인 할인 쿠폰과 팔로워 공유용 쿠폰을 받습니다.
                                별도 등록 없이 인스타·유튜브 채널이 있으면 바로 이용 가능합니다.
                            </p>
                        </div>
                    </div>

                    {/* 비교 테이블 */}
                    <div className="border border-[#333333] rounded-lg overflow-hidden">
                        {/* 테이블 헤더 */}
                        <div className="grid grid-cols-3 bg-[#252525]">
                            <div className="px-3 py-2.5">
                                <span className="text-xs text-[#666666]">항목</span>
                            </div>
                            <div className="px-3 py-2.5 border-l border-[#333333]">
                                <span className="text-xs font-bold text-[#01DF82]">프리미엄</span>
                            </div>
                            <div className="px-3 py-2.5 border-l border-[#333333]">
                                <span className="text-xs font-bold text-cyan-400">파트너</span>
                            </div>
                        </div>

                        {/* 테이블 행 */}
                        {COMPARISON_ROWS.map((row, index) => (
                            <div
                                key={row.label}
                                className={`grid grid-cols-3 ${index < COMPARISON_ROWS.length - 1 ? 'border-b border-[#333333]' : ''}`}
                            >
                                <div className="px-3 py-3 flex items-center">
                                    <span className="text-xs text-[#9CA3AF]">{row.label}</span>
                                </div>
                                <div className="px-3 py-3 border-l border-[#333333] flex items-center">
                                    <span className="text-xs text-[#D0D0D0]">{row.premium}</span>
                                </div>
                                <div className="px-3 py-3 border-l border-[#333333] flex items-center">
                                    <span className="text-xs text-[#D0D0D0]">{row.partner}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 닫기 버튼 */}
                <div className="sticky bottom-0 bg-[#1E1E1E] border-t border-[#333333] p-5">
                    <button
                        onClick={onClose}
                        className="w-full h-12 bg-[#01DF82] text-black font-bold rounded-lg hover:bg-[#00C972] transition-colors"
                    >
                        확인
                    </button>
                </div>
            </div>
        </div>
    );
}
