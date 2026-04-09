// RecruitmentProgressBar.tsx - 모집현황 프로그레스 바 (프리미엄/파트너 공통)
'use client';

interface RecruitmentProgressBarProps {
    totalCount: number;
    availableCount: number;
}

export default function RecruitmentProgressBar({ totalCount, availableCount }: RecruitmentProgressBarProps) {
    const filledCount = totalCount - availableCount;
    const percentage = totalCount > 0 ? Math.min((filledCount / totalCount) * 100, 100) : 0;

    return (
        <div>
            <div className="w-full h-1 bg-[#333333] rounded-full overflow-hidden">
                <div
                    style={{ width: `${percentage}%` }}
                    className="h-full bg-[#01DF82] rounded-full transition-all"
                />
            </div>
            <p className="text-xs text-[#9CA3AF] mt-1.5">
                {totalCount}명 모집 · 잔여 <span className="text-white font-semibold">{availableCount}명</span>
            </p>
        </div>
    );
}
