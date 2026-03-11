// HighlightsModal.tsx - 숙소의 특장점 상세 보기 바텀시트 모달
'use client';

import { useEffect } from 'react';

interface HighlightsModalProps {
    isOpen: boolean;
    onClose: () => void;
    accommodationName: string;
    highlights: string;
}

/**
 * 숙소의 특장점을 표시하는 바텀시트 스타일 모달
 * - 모바일 퍼스트 UX (90% 모바일 사용자)
 * - 다크 테마 디자인 시스템 준수
 */
export default function HighlightsModal({
    isOpen,
    onClose,
    accommodationName,
    highlights
}: HighlightsModalProps) {
    // 모달 오픈 시 배경 스크롤 잠금
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    // 줄바꿈 기준으로 특장점을 문단 단위로 분리
    const paragraphs = highlights
        .split(/\n+/)
        .map((paragraph) => paragraph.trim())
        .filter((paragraph) => paragraph.length > 0);

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center"
            onClick={onClose}
        >
            {/* 배경 오버레이 */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* 바텀시트 컨테이너 */}
            <div
                className="relative w-full max-w-md bg-[#1E1E1E] rounded-t-2xl border-t border-x border-[#333333] max-h-[75vh] flex flex-col animate-slideUp"
                onClick={(event) => event.stopPropagation()}
            >
                {/* 드래그 핸들 */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 bg-[#555555] rounded-full" />
                </div>

                {/* 헤더 */}
                <div className="flex items-center justify-between px-5 pb-3 border-b border-[#333333]">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-white truncate">
                            {accommodationName}
                        </h3>
                        <p className="text-xs text-[#9CA3AF] mt-0.5">숙소 특장점</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="ml-3 w-8 h-8 flex items-center justify-center text-[#9CA3AF] hover:text-white transition-colors rounded-full hover:bg-[#333333]"
                        aria-label="닫기"
                    >
                        ✕
                    </button>
                </div>

                {/* 본문 — 스크롤 가능 */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    <div className="space-y-3">
                        {paragraphs.map((paragraph, index) => (
                            <p
                                key={index}
                                className="text-sm text-[#E0E0E0] leading-relaxed"
                            >
                                {paragraph}
                            </p>
                        ))}
                    </div>
                </div>

                {/* 하단 안전 영역 (모바일 홈 인디케이터 대응) */}
                <div className="h-6 flex-shrink-0" />
            </div>

            {/* 바텀시트 슬라이드업 애니메이션 */}
            <style jsx>{`
                @keyframes slideUp {
                    from {
                        transform: translateY(100%);
                    }
                    to {
                        transform: translateY(0);
                    }
                }
                .animate-slideUp {
                    animation: slideUp 0.25s ease-out;
                }
            `}</style>
        </div>
    );
}
