// ContentEntryBanner.tsx - 콘텐츠 전달 진입 배너 (헤더 영역 상시 노출)
// CHANGED: 콘텐츠 진입점을 헤더 아이콘 → 메인 영역 배너로 승격 (IA v3)
'use client';

interface ContentEntryBannerProps {
    onClick: () => void;
}

export default function ContentEntryBanner({ onClick }: ContentEntryBannerProps) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center justify-between gap-3 bg-[#1E1E1E] border border-[#333333] hover:border-[#01DF82] rounded-[14px] px-4 py-3.5 transition-colors text-left group"
            aria-label="내 콘텐츠 전달하기"
        >
            <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#01DF82]">
                    📤 내 콘텐츠
                </span>
                <span className="text-sm font-bold text-white">
                    콘텐츠 전달하기
                </span>
            </div>
            <span className="text-[#888888] group-hover:text-[#01DF82] text-base transition-colors flex-shrink-0">
                →
            </span>
        </button>
    );
}
